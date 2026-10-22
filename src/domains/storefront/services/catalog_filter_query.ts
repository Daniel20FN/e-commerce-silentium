import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import "server-only";
import type { StorefrontListingParams } from "../types/api_params";
import { STOREFRONT_PAGE_SIZE } from "./catalog_rules";

export async function filteredCatalogPage(
  params: StorefrontListingParams,
  categoryIds: string[],
): Promise<{ ids: string[]; total: number; page: number; pageCount: number }> {
  if (!categoryIds.length) return { ids: [], total: 0, page: 1, pageCount: 1 };
  const name = (params.q ?? "")
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const projection = Prisma.sql`
    WITH projected AS (
      SELECT p.id, p.name, p.featured, v.price, v.available, v.offer
      FROM "Product" p
      CROSS JOIN LATERAL (
        SELECT COALESCE(MIN("priceCents") FILTER (WHERE stock > 0), MIN("priceCents")) AS price,
          BOOL_OR(stock > 0) AS available,
          BOOL_OR("compareAtPriceCents" > "priceCents") AS offer
        FROM "ProductVariant" WHERE "productId" = p.id AND "isActive" = true AND "deletedAt" IS NULL
        HAVING COUNT(*) > 0
      ) v
      WHERE p.status = 'active' AND p."deletedAt" IS NULL AND p."archivedAt" IS NULL
        AND EXISTS (SELECT 1 FROM "ProductCategory" pc WHERE pc."productId" = p.id AND pc."categoryId" IN (${Prisma.join(categoryIds)}))
        ${params.featured ? Prisma.sql`AND p.featured = true` : Prisma.empty}
        ${name ? Prisma.sql`AND POSITION(${name} IN TRANSLATE(LOWER(p.name), 'áéíóúüñ', 'aeiouun')) > 0` : Prisma.empty}
    ), matched AS (
      SELECT * FROM projected WHERE true
        ${params.minPriceCents !== undefined ? Prisma.sql`AND price >= ${params.minPriceCents}` : Prisma.empty}
        ${params.maxPriceCents !== undefined ? Prisma.sql`AND price <= ${params.maxPriceCents}` : Prisma.empty}
        ${params.available ? Prisma.sql`AND available = true` : Prisma.empty}
        ${params.offers ? Prisma.sql`AND offer = true` : Prisma.empty}
    )`;
  const counts = await prisma.$queryRaw<{ total: number }[]>(
    Prisma.sql`${projection} SELECT COUNT(*)::int AS total FROM matched`,
  );
  const total = counts[0]?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / STOREFRONT_PAGE_SIZE));
  const page = Math.max(
    1,
    Math.min(
      Number.isSafeInteger(params.page) ? (params.page ?? 1) : 1,
      pageCount,
    ),
  );
  const order =
    params.sort === "price_asc"
      ? Prisma.sql`price ASC, name ASC, id ASC`
      : params.sort === "price_desc"
        ? Prisma.sql`price DESC, name ASC, id ASC`
        : params.sort === "name_desc"
          ? Prisma.sql`name DESC, id ASC`
          : params.sort === "name_asc"
            ? Prisma.sql`name ASC, id ASC`
            : Prisma.sql`featured DESC, name ASC, id ASC`;
  const rows = total
    ? await prisma.$queryRaw<{ id: string }[]>(
        Prisma.sql`${projection} SELECT id FROM matched ORDER BY ${order} LIMIT ${STOREFRONT_PAGE_SIZE} OFFSET ${(page - 1) * STOREFRONT_PAGE_SIZE}`,
      )
    : [];
  return { ids: rows.map((row) => row.id), total, page, pageCount };
}
