CREATE TABLE "LegalRelease" (
  "version" TEXT NOT NULL PRIMARY KEY,
  "hash" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "LegalConsentEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "version" TEXT NOT NULL REFERENCES "LegalRelease"("version") ON DELETE RESTRICT ON UPDATE CASCADE,
  "purpose" TEXT NOT NULL CHECK ("purpose" IN ('terms','privacy','adult','email','whatsapp')),
  "action" TEXT NOT NULL CHECK ("action" IN ('accepted','declined','withdrawn')),
  "source" TEXT NOT NULL CHECK ("source" IN ('registration','invitation','account')),
  "requestId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "LegalConsentEvent_userId_requestId_purpose_key" ON "LegalConsentEvent"("userId","requestId","purpose");
CREATE INDEX "LegalConsentEvent_userId_occurredAt_idx" ON "LegalConsentEvent"("userId","occurredAt");
ALTER TABLE "LegalRelease" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LegalConsentEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "LegalRelease", "LegalConsentEvent" FROM anon, authenticated;

CREATE FUNCTION public.protect_legal_evidence() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'legal evidence is append-only';
END;
$$;
CREATE TRIGGER "LegalRelease_immutable" BEFORE UPDATE OR DELETE ON "LegalRelease"
FOR EACH ROW EXECUTE FUNCTION public.protect_legal_evidence();
CREATE TRIGGER "LegalConsentEvent_immutable" BEFORE UPDATE OR DELETE ON "LegalConsentEvent"
FOR EACH ROW EXECUTE FUNCTION public.protect_legal_evidence();
REVOKE ALL ON FUNCTION public.protect_legal_evidence() FROM PUBLIC;
