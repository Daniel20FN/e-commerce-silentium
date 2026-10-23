BEGIN;
CREATE TABLE public."AdminUserInvitation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "role" public."UserRole" NOT NULL DEFAULT 'admin',
  "authUserId" TEXT UNIQUE,
  "invitedById" TEXT NOT NULL REFERENCES public."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseId" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "failureCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "invitation_email_normalized" CHECK ("email" = lower(btrim("email"))),
  CONSTRAINT "invitation_lease_pair" CHECK (("leaseId" IS NULL) = ("leaseExpiresAt" IS NULL)),
  CONSTRAINT "invitation_sent_binding" CHECK ("sentAt" IS NULL OR ("authUserId" IS NOT NULL AND "expiresAt" > "sentAt")),
  CONSTRAINT "invitation_acceptance_sent" CHECK ("acceptedAt" IS NULL OR ("sentAt" IS NOT NULL AND "acceptedAt" >= "sentAt"))
);
ALTER TABLE public."AdminUserInvitation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."AdminUserInvitation" FROM PUBLIC, anon, authenticated;
COMMIT;
