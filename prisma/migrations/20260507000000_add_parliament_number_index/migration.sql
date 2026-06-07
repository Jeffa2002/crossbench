ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "parliamentNumber" INTEGER;
CREATE INDEX IF NOT EXISTS "Bill_parliamentNumber_idx" ON "Bill"("parliamentNumber");
