/** @jest-environment node */
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  getPriorityBlock,
  getPriorityQueue,
  inventoryPriorityWhere,
  orderPriorityWhere,
  productPriorityWhere,
} from "./operational_service";
const productCount = jest.fn(),
  productFind = jest.fn(),
  categoryFind = jest.fn(),
  variantCount = jest.fn(),
  variantFind = jest.fn(),
  orderCount = jest.fn(),
  orderFind = jest.fn(),
  anchor = jest.fn();
jest.mock("@/lib/prisma", () => {
  const client = {
    category: { findMany: (args: object) => categoryFind(args) },
    product: {
      count: (args: object) => productCount(args),
      findMany: (args: object) => productFind(args),
      findFirst: (args: object) => anchor(args),
    },
    productVariant: {
      count: (args: object) => variantCount(args),
      findMany: (args: object) => variantFind(args),
      findFirst: (args: object) => anchor(args),
      fields: { inventoryMinimum: "field-reference" },
    },
    manualOrder: {
      count: (args: object) => orderCount(args),
      findMany: (args: object) => orderFind(args),
      findFirst: (args: object) => anchor(args),
    },
  };
  return {
    prisma: {
      ...client,
      $transaction: jest.fn((fn: (tx: object) => Promise<object>) =>
        fn(client),
      ),
    },
  };
});
beforeEach(() => {
  jest.clearAllMocks();
  categoryFind.mockResolvedValue([
    { id: "cat", parentId: null, deletedAt: null, isActive: true },
  ]);
  productCount.mockResolvedValue(1);
  variantCount.mockResolvedValue(1);
  orderCount.mockResolvedValue(1);
  productFind.mockResolvedValue([{ id: "p", name: "Producto" }]);
  variantFind.mockResolvedValue([
    {
      id: "v",
      productId: "p",
      sku: "SKU",
      stock: 2,
      inventoryMinimum: 2,
      product: { name: "Producto" },
    },
  ]);
  orderFind.mockResolvedValue([{ id: "o", number: 12 }]);
});
it("counts and lists using the same stock predicate including the configured threshold", async () => {
  const result = await getPriorityQueue("low");
  const where = inventoryPriorityWhere(prisma, "low");
  expect(where).toMatchObject({
    deletedAt: null,
    product: { deletedAt: null, archivedAt: null, status: { not: "archived" } },
    inventoryMinimum: { not: null },
    stock: { gt: 0, lte: "field-reference" },
  });
  expect(variantCount).toHaveBeenCalledWith({ where });
  expect(variantFind).toHaveBeenCalledWith(
    expect.objectContaining({ where: { AND: [where] }, take: 21 }),
  );
  expect(result.rows[0]).toMatchObject({ sku: "SKU", stock: 2, minimum: 2 });
  expect(result.rows[0].href).toContain("section=inventory");
  expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
    isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    timeout: 15000,
  });
});
it("separates confirmed workflow tasks from unpaid and excludes drafts/cancellations", async () => {
  expect(orderPriorityWhere("prepare")).toEqual({
    status: "confirmed",
    fulfillment: { in: ["pending", "preparing"] },
  });
  expect(orderPriorityWhere("deliver")).toEqual({
    status: "confirmed",
    fulfillment: { in: ["ready", "shipped"] },
  });
  expect(orderPriorityWhere("unpaid")).toEqual({
    status: "confirmed",
    payment: "pending",
  });
  const result = await getPriorityQueue("unpaid");
  expect(orderCount).toHaveBeenCalledWith({
    where: orderPriorityWhere("unpaid"),
  });
  expect(orderFind.mock.calls[0][0].select).toEqual({ id: true, number: true });
  expect(result.rows[0].orderNumber).toBe(12);
  expect(JSON.stringify(result)).not.toMatch(
    /customerPhone|customerName|Cents|costs/,
  );
});
it("keeps no-stock products distinct from publication blockers and shares catalog eligibility", async () => {
  const publicWhere: Prisma.ProductWhereInput = { status: "active" };
  expect(productPriorityWhere("publication", publicWhere)).toMatchObject({
    AND: [expect.any(Object), { NOT: publicWhere }],
  });
  expect(productPriorityWhere("unavailable", publicWhere)).toMatchObject({
    AND: [
      expect.any(Object),
      publicWhere,
      {
        variants: {
          none: { isActive: true, deletedAt: null, stock: { gt: 0 } },
        },
      },
    ],
  });
  const queues = await getPriorityBlock("catalog");
  expect(queues.map((q) => q.group)).toEqual([
    "drafts",
    "publication",
    "unavailable",
  ]);
  expect(categoryFind).toHaveBeenCalledTimes(1);
  expect(productFind.mock.calls.every(([args]) => args.take === 3)).toBe(true);
});
it("paginates without repeats, rejects stale cursors and propagates failures instead of inventing zero", async () => {
  anchor.mockResolvedValue({ id: "old", createdAt: new Date("2026-10-20Z") });
  orderCount.mockResolvedValue(24);
  orderFind.mockResolvedValue(
    Array.from({ length: 21 }, (_, i) => ({ id: `o${i}`, number: i })),
  );
  const result = await getPriorityQueue("prepare", "old");
  expect(result.count).toBe(24);
  expect(result.rows).toHaveLength(20);
  expect(result.nextCursor).toBe("o19");
  anchor.mockResolvedValue(null);
  await expect(getPriorityQueue("prepare", "removed")).rejects.toThrow(
    "stale_priority_cursor",
  );
  variantCount.mockRejectedValue(Error("offline"));
  await expect(getPriorityQueue("out")).rejects.toThrow("offline");
});
