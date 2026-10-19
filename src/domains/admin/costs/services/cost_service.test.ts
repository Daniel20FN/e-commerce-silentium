/** @jest-environment node */
import { prisma } from "@/lib/prisma";
import {
  changeCatalogCostState,
  createCatalogCost,
  getCatalogCosts,
  updateCatalogCost,
} from "./cost_service";

const now = new Date("2026-10-19T00:00:00.000Z");
const record = {
  id: "c",
  variantId: null,
  name: "Tela",
  description: null,
  amountCents: 500,
  deletedAt: null,
  updatedAt: now,
};
const mockDb = {
  product: {
    findUnique: jest.fn(async () => ({
      id: "p",
      deletedAt: null,
      archivedAt: null,
    })),
  },
  productVariant: {
    findMany: jest.fn(async () => [
      {
        id: "v",
        sku: "SKU",
        priceCents: 1000,
        isActive: true,
        deletedAt: null,
        optionValues: [],
      },
    ]),
  },
  catalogCost: {
    findMany: jest.fn(async () => [record]),
    findFirst: jest.fn(async () => record),
    create: jest.fn(async () => record),
    update: jest.fn(async () => record),
  },
  $queryRaw: jest.fn(async () => [{ id: "p" }]),
};
jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn((callback: (db: typeof mockDb) => Promise<object>) =>
      callback(mockDb),
    ),
  },
}));

describe("private catalog costs service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.$queryRaw.mockResolvedValue([{ id: "p" }]);
    mockDb.catalogCost.findFirst.mockResolvedValue(record);
    mockDb.catalogCost.findMany.mockResolvedValue([record]);
  });
  it("returns explicit DTO and consistent read snapshot", async () => {
    const data = await getCatalogCosts("p");
    expect(data.summaries.v).toMatchObject({
      generalCents: 500,
      totalCents: 500,
      marginCents: 500,
      marginPercent: 50,
    });
    expect(data.items[0]).toEqual({
      ...record,
      updatedAt: undefined,
      revision: now.toISOString(),
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "RepeatableRead",
    });
    expect(mockDb.catalogCost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { productId: "p" } }),
    );
  });
  it("locks parent and rejects foreign/trashed variants before create", async () => {
    mockDb.$queryRaw
      .mockResolvedValueOnce([{ id: "p" }])
      .mockResolvedValueOnce([]);
    await expect(
      createCatalogCost("p", {
        variantId: "foreign",
        name: "Tela",
        description: null,
        amountCents: 200,
      }),
    ).rejects.toMatchObject({ message: "cost_variant_unavailable" });
    expect(mockDb.catalogCost.create).not.toHaveBeenCalled();
  });
  it("creates trimmed general cost on requested product", async () => {
    await createCatalogCost("p", {
      variantId: null,
      name: " Tela ",
      description: null,
      amountCents: 0,
    });
    expect(mockDb.catalogCost.create).toHaveBeenCalledWith({
      data: {
        productId: "p",
        variantId: null,
        name: "Tela",
        description: null,
        amountCents: 0,
      },
    });
  });
  it("rejects unavailable parent and invalid cents", async () => {
    mockDb.$queryRaw.mockResolvedValueOnce([]);
    await expect(
      createCatalogCost("p", {
        variantId: null,
        name: "Tela",
        description: null,
        amountCents: 200,
      }),
    ).rejects.toMatchObject({ message: "cost_parent_unavailable" });
    await expect(
      createCatalogCost("p", {
        variantId: null,
        name: "Tela",
        description: null,
        amountCents: -1,
      }),
    ).rejects.toMatchObject({ type: "validation_error" });
  });
  it("rejects stale edits instead of overwriting", async () => {
    await expect(
      updateCatalogCost("p", {
        id: "c",
        variantId: null,
        name: "Tela",
        description: null,
        amountCents: 500,
        revision: "2026-01-01T00:00:00.000Z",
      }),
    ).rejects.toMatchObject({ type: "conflict" });
    expect(mockDb.catalogCost.update).not.toHaveBeenCalled();
    expect(mockDb.catalogCost.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "c", productId: "p" } }),
    );
  });
  it("updates only current cost and advances revision", async () => {
    await updateCatalogCost("p", {
      id: "c",
      variantId: null,
      name: "Tela nueva",
      description: "Actual",
      amountCents: 700,
      revision: now.toISOString(),
    });
    expect(mockDb.catalogCost.update).toHaveBeenCalledWith({
      where: { id: "c" },
      data: expect.objectContaining({
        name: "Tela nueva",
        amountCents: 700,
        updatedAt: expect.any(Date),
      }),
    });
  });
  it("soft deletes and refuses restore of active cost", async () => {
    await changeCatalogCostState("p", {
      id: "c",
      revision: now.toISOString(),
      action: "trash",
    });
    expect(mockDb.catalogCost.update).toHaveBeenCalledWith({
      where: { id: "c" },
      data: { deletedAt: expect.any(Date), updatedAt: expect.any(Date) },
    });
    await expect(
      changeCatalogCostState("p", {
        id: "c",
        revision: now.toISOString(),
        action: "restore",
      }),
    ).rejects.toMatchObject({ type: "invalid_state" });
  });
});
