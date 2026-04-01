-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive', 'blocked', 'pending_profile');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('cc', 'ce', 'nit', 'pp', 'ti');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('female', 'male', 'non_binary', 'prefer_not_to_say');

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('super_admin', 'admin', 'support', 'customer');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "public"."User"
ALTER COLUMN "role" TYPE "UserRole_new"
USING (
  CASE "role"::text
    WHEN 'admin' THEN 'admin'
    WHEN 'manager' THEN 'support'
    WHEN 'user' THEN 'customer'
    ELSE 'customer'
  END
)::"UserRole_new";
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "public"."User" ALTER COLUMN "role" SET DEFAULT 'customer';
COMMIT;

-- CreateTable
CREATE TABLE "UserProfile" (
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "documentType" "DocumentType",
    "documentNumber" TEXT,
    "birthDate" TIMESTAMP(3),
    "gender" "Gender",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT,
    "recipientName" TEXT NOT NULL,
    "phone" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "neighborhood" TEXT,
    "city" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'CO',
    "postalCode" TEXT,
    "deliveryInstructions" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "userId" TEXT NOT NULL,
    "acceptsMarketingEmails" BOOLEAN NOT NULL DEFAULT false,
    "acceptsWhatsAppMarketing" BOOLEAN NOT NULL DEFAULT false,
    "acceptedTermsAt" TIMESTAMP(3),
    "acceptedPrivacyPolicyAt" TIMESTAMP(3),
    "preferredLanguage" "Language" NOT NULL DEFAULT 'es',
    "preferredCurrency" TEXT NOT NULL DEFAULT 'COP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("userId")
);

-- Migrate existing profile and preference data before dropping legacy columns
INSERT INTO "UserProfile" ("userId", "firstName", "lastName", "phone", "createdAt", "updatedAt")
SELECT "id", "firstNames", "lastNames", "phoneNumber", "createdAt", "updatedAt"
FROM "public"."User";

INSERT INTO "UserPreference" ("userId", "acceptsMarketingEmails", "acceptsWhatsAppMarketing", "createdAt", "updatedAt")
SELECT "id", "allowCommercialMessages", false, "createdAt", "updatedAt"
FROM "public"."User";

-- DropIndex
DROP INDEX "public"."User_fullName_idx";

-- DropIndex
DROP INDEX "public"."User_phoneNumber_idx";

-- AlterTable
ALTER TABLE "public"."User"
ADD COLUMN     "supabaseAuthUserId" TEXT,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'pending_profile';

UPDATE "public"."User"
SET "status" = 'active';

ALTER TABLE "public"."User"
DROP COLUMN "allowCommercialMessages",
DROP COLUMN "firstNames",
DROP COLUMN "fullName",
DROP COLUMN "lastNames",
DROP COLUMN "password",
DROP COLUMN "phoneNumber";

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseAuthUserId_key" ON "User"("supabaseAuthUserId");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "UserProfile_firstName_lastName_idx" ON "UserProfile"("firstName", "lastName");

-- CreateIndex
CREATE INDEX "UserProfile_phone_idx" ON "UserProfile"("phone");

-- CreateIndex
CREATE INDEX "UserProfile_documentType_documentNumber_idx" ON "UserProfile"("documentType", "documentNumber");

-- CreateIndex
CREATE INDEX "UserAddress_userId_idx" ON "UserAddress"("userId");

-- CreateIndex
CREATE INDEX "UserAddress_city_idx" ON "UserAddress"("city");

-- CreateIndex
CREATE INDEX "UserAddress_department_idx" ON "UserAddress"("department");

-- CreateIndex
CREATE INDEX "UserAddress_isDefault_idx" ON "UserAddress"("isDefault");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAddress" ADD CONSTRAINT "UserAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
