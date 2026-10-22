BEGIN;
-- CreateEnum
CREATE TYPE "ManualOrderStatus" AS ENUM ('draft', 'confirmed', 'cancelled');

-- CreateEnum
CREATE TYPE "ManualOrderPayment" AS ENUM ('pending', 'paid');

-- CreateEnum
CREATE TYPE "ManualOrderDelivery" AS ENUM ('shipping', 'pickup');

-- CreateEnum
CREATE TYPE "ManualOrderFulfillment" AS ENUM ('pending', 'preparing', 'shipped', 'ready', 'delivered');

-- CreateEnum
CREATE TYPE "OrderEventKind" AS ENUM ('created', 'edited', 'confirmed', 'cancelled', 'payment', 'fulfillment', 'returned');

-- CreateEnum
CREATE TYPE "OrderStockPurpose" AS ENUM ('confirmation', 'cancellation', 'return');

-- CreateTable
CREATE TABLE "ManualOrder" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "status" "ManualOrderStatus" NOT NULL DEFAULT 'draft',
    "payment" "ManualOrderPayment" NOT NULL DEFAULT 'pending',
    "delivery" "ManualOrderDelivery" NOT NULL,
    "fulfillment" "ManualOrderFulfillment" NOT NULL DEFAULT 'pending',
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "subtotalCents" INTEGER NOT NULL,
    "shippingCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdByLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualOrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "attributes" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "catalogPriceCents" INTEGER NOT NULL,
    "priceReason" TEXT,

    CONSTRAINT "ManualOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderOperation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "kind" "OrderEventKind" NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorLabel" TEXT NOT NULL,
    "reason" TEXT,
    "from" TEXT,
    "to" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderReturn" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "received" INTEGER NOT NULL,
    "resellable" INTEGER NOT NULL,

    CONSTRAINT "OrderReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStockLink" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "movementId" TEXT NOT NULL,
    "purpose" "OrderStockPurpose" NOT NULL,

    CONSTRAINT "OrderStockLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManualOrder_number_key" ON "ManualOrder"("number");

-- CreateIndex
CREATE INDEX "ManualOrder_createdAt_id_idx" ON "ManualOrder"("createdAt", "id");

-- CreateIndex
CREATE INDEX "ManualOrder_status_fulfillment_payment_idx" ON "ManualOrder"("status", "fulfillment", "payment");

-- CreateIndex
CREATE INDEX "ManualOrderLine_variantId_idx" ON "ManualOrderLine"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "ManualOrderLine_orderId_variantId_key" ON "ManualOrderLine"("orderId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "ManualOrderLine_id_orderId_key" ON "ManualOrderLine"("id", "orderId");

-- CreateIndex
CREATE INDEX "OrderOperation_orderId_createdAt_idx" ON "OrderOperation"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderOperation_id_orderId_key" ON "OrderOperation"("id", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderEvent_operationId_key" ON "OrderEvent"("operationId");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_createdAt_id_idx" ON "OrderEvent"("orderId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "OrderEvent_id_orderId_key" ON "OrderEvent"("id", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderEvent_operationId_orderId_key" ON "OrderEvent"("operationId", "orderId");

-- CreateIndex
CREATE INDEX "OrderReturn_lineId_idx" ON "OrderReturn"("lineId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderReturn_eventId_lineId_key" ON "OrderReturn"("eventId", "lineId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderStockLink_movementId_key" ON "OrderStockLink"("movementId");

-- CreateIndex
CREATE INDEX "OrderStockLink_orderId_idx" ON "OrderStockLink"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderStockLink_eventId_lineId_key" ON "OrderStockLink"("eventId", "lineId");

-- AddForeignKey
ALTER TABLE "ManualOrderLine" ADD CONSTRAINT "ManualOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ManualOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualOrderLine" ADD CONSTRAINT "ManualOrderLine_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderOperation" ADD CONSTRAINT "OrderOperation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ManualOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ManualOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_operationId_orderId_fkey" FOREIGN KEY ("operationId", "orderId") REFERENCES "OrderOperation"("id", "orderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderReturn" ADD CONSTRAINT "OrderReturn_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ManualOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderReturn" ADD CONSTRAINT "OrderReturn_eventId_orderId_fkey" FOREIGN KEY ("eventId", "orderId") REFERENCES "OrderEvent"("id", "orderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderReturn" ADD CONSTRAINT "OrderReturn_lineId_orderId_fkey" FOREIGN KEY ("lineId", "orderId") REFERENCES "ManualOrderLine"("id", "orderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStockLink" ADD CONSTRAINT "OrderStockLink_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ManualOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStockLink" ADD CONSTRAINT "OrderStockLink_eventId_orderId_fkey" FOREIGN KEY ("eventId", "orderId") REFERENCES "OrderEvent"("id", "orderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStockLink" ADD CONSTRAINT "OrderStockLink_lineId_orderId_fkey" FOREIGN KEY ("lineId", "orderId") REFERENCES "ManualOrderLine"("id", "orderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStockLink" ADD CONSTRAINT "OrderStockLink_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "InventoryMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Private administrative records: never exposed through the Supabase Data API.
ALTER TABLE public."ManualOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ManualOrderLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrderOperation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrderEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrderReturn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrderStockLink" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."ManualOrder", public."ManualOrderLine", public."OrderOperation", public."OrderEvent", public."OrderReturn", public."OrderStockLink" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public."ManualOrder_number_seq" FROM PUBLIC, anon, authenticated;

ALTER TABLE public."ManualOrder" ADD CONSTRAINT "ManualOrder_amounts_check" CHECK (
  "subtotalCents" >= 0 AND "shippingCents" BETWEEN 0 AND 999999999 AND
  "totalCents"::bigint = "subtotalCents"::bigint + "shippingCents"::bigint);
ALTER TABLE public."ManualOrder" ADD CONSTRAINT "ManualOrder_customer_check" CHECK (
  length(trim("customerName")) BETWEEN 2 AND 120 AND length("customerPhone") BETWEEN 7 AND 26 AND
  ("delivery" <> 'shipping' OR length(trim(coalesce("address",''))) BETWEEN 5 AND 500) AND
  ("delivery" <> 'pickup' OR "address" IS NULL));
ALTER TABLE public."ManualOrder" ADD CONSTRAINT "ManualOrder_fulfillment_check" CHECK (
  ("delivery" <> 'pickup' OR "fulfillment" <> 'shipped') AND
  ("delivery" <> 'shipping' OR "fulfillment" <> 'ready') AND
  ("status" <> 'draft' OR "fulfillment" = 'pending') AND "revision" >= 0);
ALTER TABLE public."ManualOrderLine" ADD CONSTRAINT "ManualOrderLine_amounts_check" CHECK (
  "quantity" BETWEEN 1 AND 999999999 AND "unitPriceCents" BETWEEN 0 AND 999999999 AND
  "catalogPriceCents" BETWEEN 0 AND 999999999 AND
  ("unitPriceCents" = "catalogPriceCents" OR length(trim(coalesce("priceReason",''))) >= 3));
ALTER TABLE public."OrderReturn" ADD CONSTRAINT "OrderReturn_quantities_check" CHECK (
  "received" BETWEEN 1 AND 999999999 AND "resellable" BETWEEN 0 AND "received");

CREATE FUNCTION public.order_deny_history_mutation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN RAISE EXCEPTION 'order_history_immutable'; END $$;
CREATE TRIGGER order_event_immutable BEFORE UPDATE OR DELETE ON public."OrderEvent"
FOR EACH ROW EXECUTE FUNCTION public.order_deny_history_mutation();
CREATE TRIGGER order_operation_immutable BEFORE UPDATE OR DELETE ON public."OrderOperation"
FOR EACH ROW EXECUTE FUNCTION public.order_deny_history_mutation();
CREATE TRIGGER order_return_immutable BEFORE UPDATE OR DELETE ON public."OrderReturn"
FOR EACH ROW EXECUTE FUNCTION public.order_deny_history_mutation();
CREATE TRIGGER order_stock_link_immutable BEFORE UPDATE OR DELETE ON public."OrderStockLink"
FOR EACH ROW EXECUTE FUNCTION public.order_deny_history_mutation();
CREATE TRIGGER order_no_delete BEFORE DELETE ON public."ManualOrder"
FOR EACH ROW EXECUTE FUNCTION public.order_deny_history_mutation();

CREATE FUNCTION public.order_guard_line() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE target text; parent_status public."ManualOrderStatus"; actual_product text;
BEGIN
  IF TG_OP = 'DELETE' THEN target := OLD."orderId"; ELSE target := NEW."orderId"; END IF;
  SELECT "status" INTO parent_status FROM public."ManualOrder" WHERE "id" = target FOR UPDATE;
  IF parent_status IS DISTINCT FROM 'draft'::public."ManualOrderStatus" THEN RAISE EXCEPTION 'order_lines_immutable'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  IF TG_OP = 'UPDATE' AND (NEW."id" <> OLD."id" OR NEW."orderId" <> OLD."orderId") THEN RAISE EXCEPTION 'order_line_identity_immutable'; END IF;
  SELECT "productId" INTO actual_product FROM public."ProductVariant" WHERE "id" = NEW."variantId";
  IF actual_product IS DISTINCT FROM NEW."productId" THEN RAISE EXCEPTION 'order_line_variant_mismatch'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER order_line_guard BEFORE INSERT OR UPDATE OR DELETE ON public."ManualOrderLine"
FOR EACH ROW EXECUTE FUNCTION public.order_guard_line();

CREATE FUNCTION public.order_guard_header() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW."id" <> OLD."id" OR NEW."number" <> OLD."number" OR NEW."createdAt" <> OLD."createdAt"
    OR NEW."createdById" <> OLD."createdById" OR NEW."createdByLabel" <> OLD."createdByLabel" THEN
    RAISE EXCEPTION 'order_identity_immutable';
  END IF;
  IF OLD."status" <> 'draft' AND ROW(NEW."customerName",NEW."customerPhone",NEW."delivery",NEW."address",NEW."notes",NEW."subtotalCents",NEW."shippingCents",NEW."totalCents")
    IS DISTINCT FROM ROW(OLD."customerName",OLD."customerPhone",OLD."delivery",OLD."address",OLD."notes",OLD."subtotalCents",OLD."shippingCents",OLD."totalCents") THEN
    RAISE EXCEPTION 'order_amounts_immutable';
  END IF;
  IF NEW."status" IS DISTINCT FROM OLD."status" AND NOT (
    (OLD."status" = 'draft' AND NEW."status" IN ('confirmed','cancelled')) OR
    (OLD."status" = 'confirmed' AND NEW."status" = 'cancelled' AND OLD."fulfillment" IN ('pending','preparing','ready'))
  ) THEN RAISE EXCEPTION 'order_invalid_transition'; END IF;
  IF NEW."fulfillment" IS DISTINCT FROM OLD."fulfillment" AND NOT (
    OLD."status" = 'confirmed' AND NEW."status" = 'confirmed' AND (
      (OLD."fulfillment" = 'pending' AND NEW."fulfillment" = 'preparing') OR
      (OLD."fulfillment" = 'preparing' AND ((OLD."delivery" = 'shipping' AND NEW."fulfillment" = 'shipped') OR (OLD."delivery" = 'pickup' AND NEW."fulfillment" = 'ready'))) OR
      (OLD."fulfillment" IN ('shipped','ready') AND NEW."fulfillment" = 'delivered')
    )
  ) THEN RAISE EXCEPTION 'order_invalid_transition'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER order_header_guard BEFORE UPDATE ON public."ManualOrder"
FOR EACH ROW EXECUTE FUNCTION public.order_guard_header();

CREATE FUNCTION public.order_guard_return() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE sold integer; already_received bigint; status public."ManualOrderStatus"; delivery public."ManualOrderDelivery"; fulfillment public."ManualOrderFulfillment";
BEGIN
  SELECT o."status",o."delivery",o."fulfillment" INTO status,delivery,fulfillment FROM public."ManualOrder" o WHERE o."id" = NEW."orderId" FOR UPDATE;
  IF status <> 'confirmed' OR NOT (fulfillment = 'delivered' OR (delivery = 'shipping' AND fulfillment = 'shipped')) THEN RAISE EXCEPTION 'order_return_invalid'; END IF;
  SELECT "quantity" INTO sold FROM public."ManualOrderLine" WHERE "id" = NEW."lineId" AND "orderId" = NEW."orderId" FOR UPDATE;
  SELECT coalesce(sum("received"),0) INTO already_received FROM public."OrderReturn" WHERE "lineId" = NEW."lineId";
  IF sold IS NULL OR already_received + NEW."received" > sold THEN RAISE EXCEPTION 'order_return_invalid'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public."OrderEvent" WHERE "id" = NEW."eventId" AND "orderId" = NEW."orderId" AND "kind" = 'returned') THEN RAISE EXCEPTION 'order_return_event_mismatch'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER order_return_guard BEFORE INSERT ON public."OrderReturn"
FOR EACH ROW EXECUTE FUNCTION public.order_guard_return();

CREATE FUNCTION public.order_guard_stock_link() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE variant text; quantity integer; movement_variant text; delta integer; kind public."OrderEventKind"; restock integer;
BEGIN
  SELECT l."variantId",l."quantity" INTO variant,quantity FROM public."ManualOrderLine" l WHERE l."id"=NEW."lineId" AND l."orderId"=NEW."orderId";
  SELECT m."variantId",m."delta" INTO movement_variant,delta FROM public."InventoryMovement" m WHERE m."id"=NEW."movementId";
  SELECT e."kind" INTO kind FROM public."OrderEvent" e WHERE e."id"=NEW."eventId" AND e."orderId"=NEW."orderId";
  IF variant IS NULL OR movement_variant IS DISTINCT FROM variant THEN RAISE EXCEPTION 'order_stock_link_variant_mismatch'; END IF;
  IF NEW."purpose" = 'confirmation' THEN
    IF kind IS DISTINCT FROM 'confirmed'::public."OrderEventKind" OR delta <> -quantity THEN RAISE EXCEPTION 'order_stock_link_mismatch'; END IF;
  ELSIF NEW."purpose" = 'cancellation' THEN
    IF kind IS DISTINCT FROM 'cancelled'::public."OrderEventKind" OR delta <> quantity THEN RAISE EXCEPTION 'order_stock_link_mismatch'; END IF;
  ELSE
    SELECT "resellable" INTO restock FROM public."OrderReturn" WHERE "eventId"=NEW."eventId" AND "lineId"=NEW."lineId";
    IF kind IS DISTINCT FROM 'returned'::public."OrderEventKind" OR restock IS NULL OR restock <= 0 OR delta <> restock THEN RAISE EXCEPTION 'order_stock_link_mismatch'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER order_stock_link_guard BEFORE INSERT ON public."OrderStockLink"
FOR EACH ROW EXECUTE FUNCTION public.order_guard_stock_link();

-- An order controls its complete stock transition. Never compensate just one line via Inventory.
CREATE FUNCTION public.inventory_guard_order_reversal() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW."reversesId" IS NOT NULL AND EXISTS (SELECT 1 FROM public."OrderStockLink" WHERE "movementId" = NEW."reversesId") THEN
    RAISE EXCEPTION 'inventory_order_reversal_forbidden';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER inventory_order_reversal_guard BEFORE INSERT ON public."InventoryMovement"
FOR EACH ROW EXECUTE FUNCTION public.inventory_guard_order_reversal();

REVOKE ALL ON FUNCTION public.order_deny_history_mutation(), public.order_guard_line(), public.order_guard_header(), public.order_guard_return(), public.order_guard_stock_link(), public.inventory_guard_order_reversal() FROM PUBLIC, anon, authenticated;

COMMIT;
