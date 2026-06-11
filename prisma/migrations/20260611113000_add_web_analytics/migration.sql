CREATE TABLE "WebVisitSession" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT,
    "countryCode" TEXT,
    "region" TEXT,
    "city" TEXT,
    "userAgent" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "firstPath" TEXT,
    "lastPath" TEXT,
    "referrer" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebVisitSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebPageView" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "title" TEXT,
    "referrer" TEXT,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "WebPageView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebVisitSession_countryCode_idx" ON "WebVisitSession"("countryCode");
CREATE INDEX "WebVisitSession_startedAt_idx" ON "WebVisitSession"("startedAt");
CREATE INDEX "WebVisitSession_lastSeenAt_idx" ON "WebVisitSession"("lastSeenAt");
CREATE INDEX "WebVisitSession_ipHash_idx" ON "WebVisitSession"("ipHash");
CREATE INDEX "WebPageView_sessionId_idx" ON "WebPageView"("sessionId");
CREATE INDEX "WebPageView_path_idx" ON "WebPageView"("path");
CREATE INDEX "WebPageView_startedAt_idx" ON "WebPageView"("startedAt");
CREATE INDEX "WebPageView_durationSeconds_idx" ON "WebPageView"("durationSeconds");

ALTER TABLE "WebPageView" ADD CONSTRAINT "WebPageView_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WebVisitSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
