ALTER TABLE "WebVisitSession" ADD COLUMN "userId" TEXT;
ALTER TABLE "WebVisitSession" ADD COLUMN "visitorType" TEXT NOT NULL DEFAULT 'GUEST';

CREATE INDEX "WebVisitSession_visitorType_idx" ON "WebVisitSession"("visitorType");
CREATE INDEX "WebVisitSession_userId_idx" ON "WebVisitSession"("userId");
