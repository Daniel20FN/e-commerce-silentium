BEGIN;
LOCK TABLE public."ProductVariant" IN ACCESS EXCLUSIVE MODE;
-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('initial', 'entry', 'exit', 'count', 'reversal', 'maintenance');

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "inventoryMinimum" INTEGER,
ADD COLUMN     "stockRevision" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "InventoryOperation" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "delta" INTEGER NOT NULL,
    "before" INTEGER NOT NULL,
    "after" INTEGER NOT NULL,
    "actorId" TEXT,
    "actorLabel" TEXT,
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "operationId" TEXT,
    "reversesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovement_reversesId_key" ON "InventoryMovement"("reversesId");

-- CreateIndex
CREATE INDEX "InventoryMovement_variantId_createdAt_id_idx" ON "InventoryMovement"("variantId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "InventoryMovement_operationId_idx" ON "InventoryMovement"("operationId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovement_variantId_revision_key" ON "InventoryMovement"("variantId", "revision");

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "InventoryOperation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_reversesId_fkey" FOREIGN KEY ("reversesId") REFERENCES "InventoryMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE public."ProductVariant" ADD CONSTRAINT "ProductVariant_inventoryMinimum_check" CHECK ("inventoryMinimum" IS NULL OR "inventoryMinimum" BETWEEN 0 AND 999999999);
ALTER TABLE public."InventoryMovement" ADD CONSTRAINT "InventoryMovement_balances_check" CHECK ("before" >= 0 AND "after" >= 0 AND "after" - "before" = "delta");
ALTER TABLE public."InventoryMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."InventoryOperation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."InventoryMovement", public."InventoryOperation" FROM PUBLIC, anon, authenticated;

-- A cutover balance, not reconstructed historical sales. Includes zero and retired variants.
INSERT INTO public."InventoryMovement" ("id", "variantId", "revision", "type", "delta", "before", "after", "reason", "reference")
SELECT gen_random_uuid()::text, "id", 0, 'initial', "stock", 0, "stock", 'inventory_cutover', 'migration:20261020213000'
FROM public."ProductVariant"
ON CONFLICT ("variantId", "revision") DO NOTHING;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM public."ProductVariant" v
    LEFT JOIN public."InventoryMovement" m ON m."variantId" = v."id"
    GROUP BY v."id", v."stock"
    HAVING count(m."id") <> 1 OR coalesce(sum(m."delta"), -1) <> v."stock"
  ) THEN RAISE EXCEPTION 'inventory_cutover_mismatch'; END IF;
END $$;

CREATE FUNCTION public.inventory_prepare_variant() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE ctx jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW."stockRevision" := 0;
    RETURN NEW;
  END IF;
  ctx := nullif(current_setting('app.inventory_context', true), '')::jsonb;
  IF NEW."stock" IS DISTINCT FROM OLD."stock" OR
     (ctx->>'type' IN ('count','reversal') AND ctx->>'variantId' = NEW."id") THEN
    IF ctx IS NULL OR ctx->>'type' NOT IN ('entry','exit','count','reversal','maintenance')
      OR coalesce(length(ctx->>'reason'),0) < 3
      OR coalesce(length(ctx->>'actorId'),0) = 0
      OR coalesce(length(ctx->>'operationId'),0) = 0
      OR ctx->>'variantId' IS DISTINCT FROM NEW."id" THEN
      RAISE EXCEPTION 'inventory_context_required';
    END IF;
    IF NEW."stock" < 0 OR NEW."stock" > 999999999 THEN RAISE EXCEPTION 'inventory_balance_invalid'; END IF;
    NEW."stockRevision" := OLD."stockRevision" + 1;
  ELSIF NEW."inventoryMinimum" IS DISTINCT FROM OLD."inventoryMinimum" THEN
    NEW."stockRevision" := OLD."stockRevision" + 1;
  ELSE
    NEW."stockRevision" := OLD."stockRevision";
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION public.inventory_audit_variant() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE ctx jsonb; previous integer; kind public."InventoryMovementType";
BEGIN
  ctx := nullif(current_setting('app.inventory_context', true), '')::jsonb;
  IF TG_OP = 'INSERT' THEN previous := 0; kind := 'initial';
  ELSE
    IF NEW."stock" IS NOT DISTINCT FROM OLD."stock" AND
       NOT (coalesce(ctx->>'type','') IN ('count','reversal') AND ctx->>'variantId' = NEW."id") THEN RETURN NEW; END IF;
    previous := OLD."stock";
    kind := (ctx->>'type')::public."InventoryMovementType";
  END IF;
  INSERT INTO public."InventoryMovement" ("id", "variantId", "revision", "type", "delta", "before", "after", "actorId", "actorLabel", "reason", "reference", "operationId", "reversesId")
  VALUES (gen_random_uuid()::text, NEW."id", NEW."stockRevision", kind, NEW."stock"-previous, previous, NEW."stock",
    ctx->>'actorId', ctx->>'actorLabel', coalesce(ctx->>'reason','inventory_created'), ctx->>'reference', ctx->>'operationId', ctx->>'reversesId');
  RETURN NEW;
END $$;

CREATE FUNCTION public.inventory_deny_mutation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN RAISE EXCEPTION 'inventory_history_immutable'; END $$;

CREATE TRIGGER inventory_prepare BEFORE INSERT OR UPDATE ON public."ProductVariant"
FOR EACH ROW EXECUTE FUNCTION public.inventory_prepare_variant();
CREATE TRIGGER inventory_audit AFTER INSERT OR UPDATE ON public."ProductVariant"
FOR EACH ROW EXECUTE FUNCTION public.inventory_audit_variant();
CREATE TRIGGER inventory_immutable BEFORE UPDATE OR DELETE ON public."InventoryMovement"
FOR EACH ROW EXECUTE FUNCTION public.inventory_deny_mutation();
CREATE TRIGGER inventory_operation_immutable BEFORE UPDATE OR DELETE ON public."InventoryOperation"
FOR EACH ROW EXECUTE FUNCTION public.inventory_deny_mutation();
REVOKE ALL ON FUNCTION public.inventory_prepare_variant(), public.inventory_audit_variant(), public.inventory_deny_mutation() FROM PUBLIC, anon, authenticated;
COMMIT;
