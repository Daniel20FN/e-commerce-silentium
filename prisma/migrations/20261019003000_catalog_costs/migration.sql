CREATE TABLE "CatalogCost" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amountCents" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CatalogCost_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CatalogCost_amountCents_check" CHECK ("amountCents" >= 0),
    CONSTRAINT "CatalogCost_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 120),
    CONSTRAINT "CatalogCost_description_check" CHECK ("description" IS NULL OR char_length("description") <= 1000)
);
CREATE INDEX "CatalogCost_productId_variantId_deletedAt_idx" ON "CatalogCost"("productId", "variantId", "deletedAt");
ALTER TABLE "CatalogCost" ADD CONSTRAINT "CatalogCost_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatalogCost" ADD CONSTRAINT "CatalogCost_variantId_productId_fkey" FOREIGN KEY ("variantId", "productId") REFERENCES "ProductVariant"("id", "productId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatalogCost" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "CatalogCost" FROM PUBLIC;
