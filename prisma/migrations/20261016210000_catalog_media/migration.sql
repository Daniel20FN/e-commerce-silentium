CREATE TYPE "CatalogImageStatus" AS ENUM ('pending', 'ready', 'failed');
CREATE UNIQUE INDEX "ProductVariant_id_productId_key" ON "ProductVariant"("id", "productId");
CREATE TABLE "CatalogImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "bucket" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "altText" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" "CatalogImageStatus" NOT NULL DEFAULT 'pending',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CatalogImage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CatalogImage_size_check" CHECK ("size" > 0 AND "size" <= 5242880),
    CONSTRAINT "CatalogImage_position_check" CHECK ("position" >= 0),
    CONSTRAINT "CatalogImage_contentType_check" CHECK ("contentType" IN ('image/jpeg', 'image/png', 'image/webp', 'image/avif')),
    CONSTRAINT "CatalogImage_altText_check" CHECK (char_length("altText") <= 500)
);
CREATE UNIQUE INDEX "CatalogImage_bucket_path_key" ON "CatalogImage"("bucket", "path");
CREATE INDEX "CatalogImage_productId_variantId_status_deletedAt_position_idx" ON "CatalogImage"("productId", "variantId", "status", "deletedAt", "position");
ALTER TABLE "CatalogImage" ADD CONSTRAINT "CatalogImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatalogImage" ADD CONSTRAINT "CatalogImage_variantId_productId_fkey" FOREIGN KEY ("variantId", "productId") REFERENCES "ProductVariant"("id", "productId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatalogImage" ENABLE ROW LEVEL SECURITY;
