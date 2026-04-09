-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CITIZEN', 'MP', 'ADMIN');

-- CreateEnum
CREATE TYPE "VotePosition" AS ENUM ('SUPPORT', 'OPPOSE', 'ABSTAIN');

-- CreateEnum
CREATE TYPE "BillStageType" AS ENUM ('INTRODUCED', 'FIRST_READING', 'SECOND_READING', 'COMMITTEE', 'THIRD_READING', 'PASSED', 'ROYAL_ASSENT');

-- CreateEnum
CREATE TYPE "BillChamber" AS ENUM ('HOUSE', 'SENATE', 'JOINT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "role" "UserRole" NOT NULL DEFAULT 'CITIZEN',
    "verifiedAt" TIMESTAMP(3),
    "electorateId" TEXT,
    "addressHash" TEXT,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Electorate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "mpName" TEXT,
    "mpParty" TEXT,
    "mpEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Electorate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "chamber" "BillChamber" NOT NULL,
    "status" TEXT NOT NULL,
    "sponsorName" TEXT,
    "portfolio" TEXT,
    "aphUrl" TEXT NOT NULL,
    "introducedAt" TIMESTAMP(3),
    "lastUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "electorateId" TEXT,
    "position" "VotePosition" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillStage" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "stage" "BillStageType" NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_addressHash_key" ON "User"("addressHash");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_electorateId_idx" ON "User"("electorateId");

-- CreateIndex
CREATE INDEX "User_verifiedAt_idx" ON "User"("verifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Electorate_name_key" ON "Electorate"("name");

-- CreateIndex
CREATE INDEX "Electorate_state_idx" ON "Electorate"("state");

-- CreateIndex
CREATE UNIQUE INDEX "Bill_aphUrl_key" ON "Bill"("aphUrl");

-- CreateIndex
CREATE INDEX "Bill_status_idx" ON "Bill"("status");

-- CreateIndex
CREATE INDEX "Bill_chamber_idx" ON "Bill"("chamber");

-- CreateIndex
CREATE INDEX "Bill_portfolio_idx" ON "Bill"("portfolio");

-- CreateIndex
CREATE INDEX "Bill_lastUpdatedAt_idx" ON "Bill"("lastUpdatedAt");

-- CreateIndex
CREATE INDEX "Vote_billId_position_idx" ON "Vote"("billId", "position");

-- CreateIndex
CREATE INDEX "Vote_electorateId_billId_idx" ON "Vote"("electorateId", "billId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_userId_billId_key" ON "Vote"("userId", "billId");

-- CreateIndex
CREATE INDEX "BillStage_billId_recordedAt_idx" ON "BillStage"("billId", "recordedAt");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_electorateId_fkey" FOREIGN KEY ("electorateId") REFERENCES "Electorate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_electorateId_fkey" FOREIGN KEY ("electorateId") REFERENCES "Electorate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillStage" ADD CONSTRAINT "BillStage_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
