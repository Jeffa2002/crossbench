CREATE TABLE "MpNewsletterCampaign" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "textBody" TEXT NOT NULL,
    "htmlBody" TEXT,
    "sentBy" TEXT NOT NULL,
    "recipientMode" TEXT NOT NULL,
    "attachmentNames" TEXT,
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "MpNewsletterCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MpNewsletterDelivery" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "resendId" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MpNewsletterDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MpNewsletterCampaign_createdAt_idx" ON "MpNewsletterCampaign"("createdAt");
CREATE INDEX "MpNewsletterDelivery_campaignId_idx" ON "MpNewsletterDelivery"("campaignId");
CREATE INDEX "MpNewsletterDelivery_subscriptionId_idx" ON "MpNewsletterDelivery"("subscriptionId");
CREATE INDEX "MpNewsletterDelivery_email_idx" ON "MpNewsletterDelivery"("email");
CREATE INDEX "MpNewsletterDelivery_status_idx" ON "MpNewsletterDelivery"("status");

ALTER TABLE "MpNewsletterDelivery" ADD CONSTRAINT "MpNewsletterDelivery_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MpNewsletterCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MpNewsletterDelivery" ADD CONSTRAINT "MpNewsletterDelivery_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "MpNewsletterSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
