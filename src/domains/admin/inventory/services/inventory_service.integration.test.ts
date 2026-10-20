/** @jest-environment node */
import { confirmAdminVariantGeneration } from "@/domains/admin/products/services/admin_variant_generation_service";
import { createAdminVariant } from "@/domains/admin/products/services/admin_variant_service";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";
import type { InventoryMutationParams } from "../types/api_params";
import {
  getInventory,
  mutateInventory,
  setInventoryMinimum,
} from "./inventory_service";

jest.mock("@/lib/prisma", () => {
  if (process.env.INVENTORY_INTEGRATION === "1") {
    const parsed = jest
      .requireActual<typeof import("dotenv")>("dotenv")
      .config({ path: ".env.development", override: true, quiet: true }).parsed;
    if (!parsed?.DATABASE_URL)
      throw new Error("Explicit development DATABASE_URL required");
  }
  const { PrismaClient } =
    jest.requireActual<typeof import("@prisma/client")>("@prisma/client");
  return { prisma: new PrismaClient({ log: [] }) };
});
const integration =
  process.env.INVENTORY_INTEGRATION === "1" ? describe : describe.skip;
integration("inventory PostgreSQL contract (isolated QA)", () => {
  jest.setTimeout(90000);
  const actor = { id: "qa-inventory-actor", label: "QA Inventory" };
  const products: string[] = [];
  let productId = "",
    variantId = "",
    secondId = "";
  const request = (
    kind: InventoryMutationParams["kind"],
    quantity: number,
    revision = 0,
  ): InventoryMutationParams => ({
    operationId: randomUUID(),
    kind,
    rows: [
      {
        variantId,
        expectedRevision: revision,
        quantity,
        reason: "QA inventory isolated",
        reference: "QA reference",
      },
    ],
  });
  const variant = () =>
    prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
  beforeEach(async () => {
    const id = randomUUID();
    productId = id;
    products.push(id);
    const p = await prisma.product.create({
      data: {
        id,
        name: `QA inventory ${id}`,
        slug: `qa-inventory-${id}`,
        variants: {
          create: [
            {
              sku: `QA-INV-${id}-1`,
              priceCents: 10000,
              stock: 10,
              optionCombinationKey: "1",
            },
            {
              sku: `QA-INV-${id}-2`,
              priceCents: 20000,
              stock: 0,
              optionCombinationKey: "2",
            },
          ],
        },
      },
      include: { variants: { orderBy: { sku: "asc" } } },
    });
    variantId = p.variants[0].id;
    secondId = p.variants[1].id;
  });
  afterAll(async () => {
    await prisma.productVariant.updateMany({
      where: { productId: { in: products } },
      data: { deletedAt: new Date(), isActive: false },
    });
    await prisma.product.updateMany({
      where: { id: { in: products } },
      data: { deletedAt: new Date(), status: "archived" },
    });
    await prisma.$disconnect();
  });
  it("keeps exactly one honest initial balance, including zero, and sums match every current variant", async () => {
    const rows = await prisma.inventoryMovement.findMany({
      where: { variant: { productId } },
      orderBy: { after: "desc" },
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      type: "initial",
      before: 0,
      after: 10,
      delta: 10,
      actorId: null,
    });
    const mismatch = await prisma.$queryRaw<
      Array<{ id: string }>
    >`SELECT v."id" FROM "ProductVariant" v LEFT JOIN "InventoryMovement" m ON m."variantId"=v."id" GROUP BY v."id",v."stock" HAVING coalesce(sum(m."delta"),-1)<>v."stock" OR count(*) FILTER(WHERE m."type"='initial')<>1`;
    expect(mismatch).toEqual([]);
  });
  it("records entry/exit/count with actor, zero-delta counts and exact revisions", async () => {
    await mutateInventory(productId, request("entry", 3), actor);
    await mutateInventory(productId, request("exit", 2, 1), actor);
    await mutateInventory(productId, request("count", 11, 2), actor);
    const v = await variant();
    expect(v).toMatchObject({ stock: 11, stockRevision: 3 });
    const history = await getInventory(productId, { variantId });
    expect(history.movements[0]).toMatchObject({
      type: "count",
      delta: 0,
      before: 11,
      after: 11,
      actorLabel: actor.label,
    });
  });
  it("commercial variant creation records its verified actor and initial quantity atomically", async () => {
    const created = await createAdminVariant(
      productId,
      {
        sku: `QA-CREATE-${randomUUID()}`,
        priceCents: 100,
        compareAtPriceCents: null,
        stock: 5,
        active: true,
        isDefault: false,
        displayOrder: 9,
        optionValueIds: [],
      },
      undefined,
      actor,
    );
    const rows = await prisma.inventoryMovement.findMany({
      where: { variantId: created.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: "initial",
      before: 0,
      after: 5,
      actorId: actor.id,
      actorLabel: actor.label,
      reason: "inventory_created",
    });
  });
  it("generated variants retain initial balances and verified actor in the same transaction", async () => {
    const option = await prisma.productOption.create({
      data: {
        productId,
        name: "QA size",
        values: { create: [{ value: "A" }, { value: "B" }] },
      },
      include: { values: true },
    });
    const result = await confirmAdminVariantGeneration(
      productId,
      {
        variants: option.values.map((v, i) => ({
          sku: `QA-GEN-${randomUUID()}`,
          priceCents: 100,
          stock: i + 3,
          active: true,
          isDefault: false,
          displayOrder: i,
          optionValueIds: [v.id],
        })),
      },
      actor,
    );
    expect(result.created).toHaveLength(2);
    const movements = await prisma.inventoryMovement.findMany({
      where: { variantId: { in: result.created.map((v) => v.id) } },
    });
    expect(movements).toHaveLength(2);
    expect(
      movements.every(
        (m) =>
          m.type === "initial" &&
          m.actorId === actor.id &&
          m.reason === "inventory_generated",
      ),
    ).toBe(true);
    expect(movements.map((m) => m.after).sort()).toEqual([3, 4]);
  });
  it("serializes incompatible exits without negative stock or lost ledger rows", async () => {
    const result = await Promise.allSettled([
      mutateInventory(productId, request("exit", 7), actor),
      mutateInventory(productId, request("exit", 7), actor),
    ]);
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await variant()).stock).toBe(3);
    expect(
      await prisma.inventoryMovement.count({
        where: { variantId, type: "exit" },
      }),
    ).toBe(1);
  });
  it("replays concurrent identical requests, rejects changed intent or actor, even after archive", async () => {
    const input = request("entry", 2);
    expect(
      await Promise.all([
        mutateInventory(productId, input, actor),
        mutateInventory(productId, input, actor),
      ]),
    ).toEqual([
      { operationId: input.operationId },
      { operationId: input.operationId },
    ]);
    expect((await variant()).stock).toBe(12);
    await expect(
      mutateInventory(
        productId,
        { ...input, rows: [{ ...input.rows[0], quantity: 3 }] },
        actor,
      ),
    ).rejects.toMatchObject({ message: "inventory_operation_reused" });
    await expect(
      mutateInventory(productId, input, { id: "other", label: "Other" }),
    ).rejects.toMatchObject({ message: "inventory_operation_reused" });
    await prisma.product.update({
      where: { id: productId },
      data: { archivedAt: new Date() },
    });
    await expect(mutateInventory(productId, input, actor)).resolves.toEqual({
      operationId: input.operationId,
    });
    await expect(
      mutateInventory(productId, request("entry", 1, 1), actor),
    ).rejects.toMatchObject({ message: "product_read_only" });
  });
  it("rolls back whole batch, operation key and prior writes when a later row fails", async () => {
    const input = request("exit", 1);
    input.rows.push({
      variantId: secondId,
      expectedRevision: 0,
      quantity: 1,
      reason: "QA invalid later exit",
    });
    await expect(
      mutateInventory(productId, input, actor),
    ).rejects.toMatchObject({ message: "inventory_balance_invalid" });
    expect((await variant()).stock).toBe(10);
    expect(
      await prisma.inventoryOperation.findUnique({
        where: { id: input.operationId },
      }),
    ).toBeNull();
    expect(
      await prisma.inventoryMovement.count({
        where: { operationId: input.operationId },
      }),
    ).toBe(0);
  });
  it("detects stale counts and foreign or retired variants without mutation", async () => {
    await mutateInventory(productId, request("entry", 1), actor);
    await expect(
      mutateInventory(productId, request("count", 8), actor),
    ).rejects.toMatchObject({ message: "inventory_conflict" });
    await expect(
      mutateInventory(
        productId,
        {
          ...request("entry", 1),
          rows: [{ ...request("entry", 1).rows[0], variantId: randomUUID() }],
        },
        actor,
      ),
    ).rejects.toMatchObject({ message: "record_not_found" });
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { deletedAt: new Date() },
    });
    await expect(
      mutateInventory(productId, request("entry", 1, 1), actor),
    ).rejects.toMatchObject({ message: "variant_in_trash" });
    expect((await variant()).stock).toBe(11);
  });
  it("reverses once against current stock, never edits the original, and rejects overdraw", async () => {
    const entry = request("entry", 3);
    await mutateInventory(productId, entry, actor);
    const original = await prisma.inventoryMovement.findFirstOrThrow({
      where: { operationId: entry.operationId },
    });
    const reversal = request("reversal", 0, 1);
    reversal.rows[0].reversesId = original.id;
    await mutateInventory(productId, reversal, actor);
    expect((await variant()).stock).toBe(10);
    await expect(
      mutateInventory(
        productId,
        {
          ...reversal,
          operationId: randomUUID(),
          rows: [{ ...reversal.rows[0], expectedRevision: 2 }],
        },
        actor,
      ),
    ).rejects.toMatchObject({ message: "inventory_reversal_invalid" });
    expect(
      await prisma.inventoryMovement.findUnique({ where: { id: original.id } }),
    ).toMatchObject({ delta: 3, after: 13 });
    const extra = request("entry", 10, 2);
    await mutateInventory(productId, extra, actor);
    const extraMove = await prisma.inventoryMovement.findFirstOrThrow({
      where: { operationId: extra.operationId },
    });
    await mutateInventory(productId, request("exit", 19, 3), actor);
    await expect(
      mutateInventory(
        productId,
        {
          ...request("reversal", 0, 4),
          rows: [
            { ...request("reversal", 0, 4).rows[0], reversesId: extraMove.id },
          ],
        },
        actor,
      ),
    ).rejects.toMatchObject({ message: "inventory_balance_invalid" });
  });
  it("minimum is optional, exact and revision guarded, never changes stock", async () => {
    await setInventoryMinimum(
      productId,
      {
        operationId: randomUUID(),
        variantId,
        expectedRevision: 0,
        minimum: 10,
      },
      actor,
    );
    expect(await variant()).toMatchObject({
      stock: 10,
      inventoryMinimum: 10,
      stockRevision: 1,
    });
    await expect(
      setInventoryMinimum(
        productId,
        {
          operationId: randomUUID(),
          variantId,
          expectedRevision: 0,
          minimum: 2,
        },
        actor,
      ),
    ).rejects.toMatchObject({ message: "inventory_conflict" });
    await setInventoryMinimum(
      productId,
      {
        operationId: randomUUID(),
        variantId,
        expectedRevision: 1,
        minimum: null,
      },
      actor,
    );
    expect(await variant()).toMatchObject({
      stock: 10,
      inventoryMinimum: null,
    });
    expect(await prisma.inventoryMovement.count({ where: { variantId } })).toBe(
      1,
    );
  });
  it("rejects unaudited stock updates and immutable history changes, public roles cannot read it", async () => {
    await expect(
      prisma.productVariant.update({
        where: { id: variantId },
        data: { stock: 9 },
      }),
    ).rejects.toThrow();
    const movement = await prisma.inventoryMovement.findFirstOrThrow({
      where: { variantId },
    });
    await expect(
      prisma.inventoryMovement.update({
        where: { id: movement.id },
        data: { reason: "tampered" },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.inventoryMovement.delete({ where: { id: movement.id } }),
    ).rejects.toThrow();
    expect((await variant()).stock).toBe(10);
    for (const role of ["anon", "authenticated"]) {
      await expect(
        prisma.$transaction(async (tx) => {
          if (role === "anon") await tx.$executeRaw`SET LOCAL ROLE anon`;
          else await tx.$executeRaw`SET LOCAL ROLE authenticated`;
          await tx.$queryRaw`SELECT * FROM "InventoryMovement" LIMIT 1`;
        }),
      ).rejects.toThrow();
    }
  });
  it("history is private but readable after trash; filters and deterministic cursor stay scoped", async () => {
    await mutateInventory(productId, request("entry", 1), actor);
    await prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date() },
    });
    const data = await getInventory(productId, {
      type: "entry",
      reference: "QA reference",
    });
    expect(data.readOnly).toBe(true);
    expect(data.movements).toHaveLength(1);
    const older = await getInventory(productId, {
      cursor: data.movements[0].id,
    });
    expect(older.movements.some((m) => m.type === "initial")).toBe(true);
  });
});
