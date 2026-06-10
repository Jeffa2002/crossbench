DO $$ BEGIN
  CREATE TYPE "OutreachEmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "OutreachEmailLog" (
  "id" TEXT NOT NULL,
  "campaign" TEXT NOT NULL,
  "electorateId" TEXT,
  "chamber" TEXT,
  "recipientName" TEXT,
  "recipientEmail" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" "OutreachEmailStatus" NOT NULL DEFAULT 'PENDING',
  "resendId" TEXT,
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutreachEmailLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OutreachEmailLog_campaign_recipientEmail_key"
  ON "OutreachEmailLog"("campaign", "recipientEmail");
CREATE INDEX IF NOT EXISTS "OutreachEmailLog_campaign_idx" ON "OutreachEmailLog"("campaign");
CREATE INDEX IF NOT EXISTS "OutreachEmailLog_status_idx" ON "OutreachEmailLog"("status");
CREATE INDEX IF NOT EXISTS "OutreachEmailLog_electorateId_idx" ON "OutreachEmailLog"("electorateId");
