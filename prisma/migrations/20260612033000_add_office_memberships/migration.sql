CREATE TYPE "OfficeMembershipRole" AS ENUM ('PRINCIPAL', 'OFFICE_ADMIN', 'STAFFER');
CREATE TYPE "OfficeMembershipStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'REMOVED');
CREATE TYPE "OfficeInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE "OfficeMembership" (
  "id" TEXT NOT NULL,
  "electorateId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "OfficeMembershipRole" NOT NULL DEFAULT 'STAFFER',
  "status" "OfficeMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "invitedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "removedAt" TIMESTAMP(3),
  "blockedAt" TIMESTAMP(3),
  CONSTRAINT "OfficeMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OfficeInvite" (
  "id" TEXT NOT NULL,
  "electorateId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "role" "OfficeMembershipRole" NOT NULL DEFAULT 'STAFFER',
  "status" "OfficeInviteStatus" NOT NULL DEFAULT 'PENDING',
  "tokenHash" TEXT NOT NULL,
  "invitedByUserId" TEXT NOT NULL,
  "acceptedByUserId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OfficeInvite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OfficeAuditEvent" (
  "id" TEXT NOT NULL,
  "electorateId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "targetUserId" TEXT,
  "targetEmail" TEXT,
  "action" TEXT NOT NULL,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfficeAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OfficeMembership_electorateId_userId_key" ON "OfficeMembership"("electorateId", "userId");
CREATE INDEX "OfficeMembership_userId_idx" ON "OfficeMembership"("userId");
CREATE INDEX "OfficeMembership_electorateId_idx" ON "OfficeMembership"("electorateId");
CREATE INDEX "OfficeMembership_status_idx" ON "OfficeMembership"("status");

CREATE UNIQUE INDEX "OfficeInvite_tokenHash_key" ON "OfficeInvite"("tokenHash");
CREATE INDEX "OfficeInvite_electorateId_idx" ON "OfficeInvite"("electorateId");
CREATE INDEX "OfficeInvite_email_idx" ON "OfficeInvite"("email");
CREATE INDEX "OfficeInvite_status_idx" ON "OfficeInvite"("status");
CREATE INDEX "OfficeInvite_expiresAt_idx" ON "OfficeInvite"("expiresAt");

CREATE INDEX "OfficeAuditEvent_electorateId_idx" ON "OfficeAuditEvent"("electorateId");
CREATE INDEX "OfficeAuditEvent_actorUserId_idx" ON "OfficeAuditEvent"("actorUserId");
CREATE INDEX "OfficeAuditEvent_targetUserId_idx" ON "OfficeAuditEvent"("targetUserId");
CREATE INDEX "OfficeAuditEvent_action_idx" ON "OfficeAuditEvent"("action");
CREATE INDEX "OfficeAuditEvent_createdAt_idx" ON "OfficeAuditEvent"("createdAt");

ALTER TABLE "OfficeMembership" ADD CONSTRAINT "OfficeMembership_electorateId_fkey" FOREIGN KEY ("electorateId") REFERENCES "Electorate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfficeMembership" ADD CONSTRAINT "OfficeMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfficeMembership" ADD CONSTRAINT "OfficeMembership_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OfficeInvite" ADD CONSTRAINT "OfficeInvite_electorateId_fkey" FOREIGN KEY ("electorateId") REFERENCES "Electorate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfficeInvite" ADD CONSTRAINT "OfficeInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfficeInvite" ADD CONSTRAINT "OfficeInvite_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OfficeAuditEvent" ADD CONSTRAINT "OfficeAuditEvent_electorateId_fkey" FOREIGN KEY ("electorateId") REFERENCES "Electorate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfficeAuditEvent" ADD CONSTRAINT "OfficeAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "OfficeMembership" (
  "id", "electorateId", "userId", "role", "status", "createdAt", "updatedAt"
)
SELECT
  'om_' || replace(gen_random_uuid()::text, '-', ''),
  e.id,
  u.id,
  'PRINCIPAL'::"OfficeMembershipRole",
  'ACTIVE'::"OfficeMembershipStatus",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
JOIN "Electorate" e ON lower(e."mpEmail") = lower(u.email)
WHERE u.role = 'MP'
ON CONFLICT ("electorateId", "userId") DO UPDATE SET
  "role" = 'PRINCIPAL',
  "status" = 'ACTIVE',
  "updatedAt" = CURRENT_TIMESTAMP,
  "removedAt" = NULL,
  "blockedAt" = NULL;
