BEGIN;

-- DropIndex
DROP INDEX "CatalogImage_bucket_path_key";

-- CreateTable
CREATE TABLE "CatalogDuplication" (
    "operationId" TEXT NOT NULL,
    "sourceProductId" TEXT NOT NULL,
    "targetProductId" TEXT NOT NULL,
    "sourceRevision" TIMESTAMP(3) NOT NULL,
    "copyCosts" BOOLEAN NOT NULL,
    "skippedCategories" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogDuplication_pkey" PRIMARY KEY ("operationId")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogDuplication_targetProductId_key" ON "CatalogDuplication"("targetProductId");

-- CreateIndex
CREATE INDEX "CatalogDuplication_sourceProductId_createdAt_idx" ON "CatalogDuplication"("sourceProductId", "createdAt");

-- CreateIndex
CREATE INDEX "CatalogImage_bucket_path_idx" ON "CatalogImage"("bucket", "path");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogImage_productId_bucket_path_key" ON "CatalogImage"("productId", "bucket", "path");

-- AddForeignKey
ALTER TABLE "CatalogDuplication" ADD CONSTRAINT "CatalogDuplication_sourceProductId_fkey" FOREIGN KEY ("sourceProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogDuplication" ADD CONSTRAINT "CatalogDuplication_targetProductId_fkey" FOREIGN KEY ("targetProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CatalogDuplication" ADD CONSTRAINT "CatalogDuplication_distinct_products_check" CHECK ("sourceProductId" <> "targetProductId");
ALTER TABLE "CatalogDuplication" ADD CONSTRAINT "CatalogDuplication_skippedCategories_check" CHECK ("skippedCategories" >= 0);
ALTER TABLE "CatalogDuplication" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "CatalogDuplication" FROM PUBLIC, anon, authenticated;

COMMIT;
