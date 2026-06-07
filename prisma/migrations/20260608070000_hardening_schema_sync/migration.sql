-- Sync schema drift so a fresh deploy can reproduce the current Prisma schema.
-- Geometry is intentionally raw SQL because Prisma does not model PostGIS geometry columns.

CREATE EXTENSION IF NOT EXISTS postgis;

DO $$ BEGIN
  CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO', 'TEAM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "VerificationStatus" AS ENUM ('NONE', 'EMAIL', 'ADDRESS', 'IDENTITY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SentimentValue" AS ENUM ('POSITIVE', 'NEGATIVE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "addressChangeCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastAddressChangeAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NONE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "electorateVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'FREE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionId" TEXT;

ALTER TABLE "Electorate" ADD COLUMN IF NOT EXISTS "mpPhotoUrl" TEXT;
ALTER TABLE "Electorate" ADD COLUMN IF NOT EXISTS "mpChamber" TEXT;
ALTER TABLE "Electorate" ADD COLUMN IF NOT EXISTS "mpId" TEXT;
ALTER TABLE "Electorate" ADD COLUMN IF NOT EXISTS "boundary" geometry(MultiPolygon, 4326);

ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "aphDescription" TEXT;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "aiSummary" TEXT;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "revisionsCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "hasAmendments" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "committees" TEXT;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "fullText" TEXT;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "fullTextFetchedAt" TIMESTAMP(3);
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "pdfUrl" TEXT;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "lastCheckedAt" TIMESTAMP(3);
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "nextReviewAt" TIMESTAMP(3);
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "outcome" TEXT;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "parliamentaryProgress" TEXT;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "divisionsData" TEXT;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "parliamentNumber" INTEGER;
ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "outcomeDate" TIMESTAMP(3);

ALTER TABLE "Vote" ADD COLUMN IF NOT EXISTS "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NONE';

DROP INDEX IF EXISTS "User_addressHash_key";
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE INDEX IF NOT EXISTS "Bill_parliamentNumber_idx" ON "Bill"("parliamentNumber");
CREATE INDEX IF NOT EXISTS "Electorate_boundary_idx" ON "Electorate" USING GIST ("boundary");

CREATE TABLE IF NOT EXISTS "MpSentiment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "mpId" TEXT NOT NULL,
  "sentiment" "SentimentValue" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MpSentiment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AddressChangeLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "fromElectorateId" TEXT,
  "toElectorateId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AddressChangeLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SupportTicket" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
  "aiSuggestedReply" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SupportReply" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "authorId" TEXT,
  "authorEmail" TEXT NOT NULL,
  "isAdmin" BOOLEAN NOT NULL DEFAULT false,
  "isAi" BOOLEAN NOT NULL DEFAULT false,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportReply_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BillAlert" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "keyword" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastNotifiedAt" TIMESTAMP(3),
  CONSTRAINT "BillAlert_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BillAlertNotification" (
  "id" TEXT NOT NULL,
  "alertId" TEXT NOT NULL,
  "billId" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillAlertNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MpSentiment_mpId_idx" ON "MpSentiment"("mpId");
CREATE INDEX IF NOT EXISTS "MpSentiment_userId_idx" ON "MpSentiment"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "MpSentiment_userId_mpId_key" ON "MpSentiment"("userId", "mpId");
CREATE INDEX IF NOT EXISTS "AddressChangeLog_userId_idx" ON "AddressChangeLog"("userId");
CREATE INDEX IF NOT EXISTS "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX IF NOT EXISTS "SupportTicket_userId_idx" ON "SupportTicket"("userId");
CREATE INDEX IF NOT EXISTS "SupportReply_ticketId_idx" ON "SupportReply"("ticketId");
CREATE INDEX IF NOT EXISTS "BillAlert_isActive_idx" ON "BillAlert"("isActive");
CREATE INDEX IF NOT EXISTS "BillAlert_keyword_idx" ON "BillAlert"("keyword");
CREATE UNIQUE INDEX IF NOT EXISTS "BillAlert_userId_keyword_key" ON "BillAlert"("userId", "keyword");
CREATE INDEX IF NOT EXISTS "BillAlertNotification_alertId_idx" ON "BillAlertNotification"("alertId");
CREATE UNIQUE INDEX IF NOT EXISTS "BillAlertNotification_alertId_billId_key" ON "BillAlertNotification"("alertId", "billId");

DO $$ BEGIN
  ALTER TABLE "MpSentiment" ADD CONSTRAINT "MpSentiment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "AddressChangeLog" ADD CONSTRAINT "AddressChangeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SupportReply" ADD CONSTRAINT "SupportReply_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BillAlert" ADD CONSTRAINT "BillAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BillAlertNotification" ADD CONSTRAINT "BillAlertNotification_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "BillAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
