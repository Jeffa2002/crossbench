CREATE TABLE "MpNewsletterSubscription" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "electorateId" TEXT,
    "source" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "unsubscribeToken" TEXT NOT NULL,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MpNewsletterSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MpNewsletterSubscription_email_key" ON "MpNewsletterSubscription"("email");
CREATE UNIQUE INDEX "MpNewsletterSubscription_unsubscribeToken_key" ON "MpNewsletterSubscription"("unsubscribeToken");
CREATE INDEX "MpNewsletterSubscription_active_idx" ON "MpNewsletterSubscription"("active");
CREATE INDEX "MpNewsletterSubscription_electorateId_idx" ON "MpNewsletterSubscription"("electorateId");
