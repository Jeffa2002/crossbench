CREATE SEQUENCE IF NOT EXISTS "SupportTicket_id_seq"
  START WITH 1000
  INCREMENT BY 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION next_support_ticket_id()
RETURNS TEXT AS $$
  SELECT 'CS' || lpad(nextval('"SupportTicket_id_seq"')::TEXT, 5, '0');
$$ LANGUAGE SQL;

ALTER TABLE "SupportReply"
  DROP CONSTRAINT IF EXISTS "SupportReply_ticketId_fkey";

ALTER TABLE "SupportReply"
  ADD CONSTRAINT "SupportReply_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

WITH ordered AS (
  SELECT
    "id" AS old_id,
    'CS' || lpad((999 + row_number() OVER (ORDER BY "createdAt", "id"))::TEXT, 5, '0') AS new_id
  FROM "SupportTicket"
  WHERE "id" !~ '^CS[0-9]{5}$'
)
UPDATE "SupportTicket" ticket
SET "id" = ordered.new_id
FROM ordered
WHERE ticket."id" = ordered.old_id;

SELECT setval(
  '"SupportTicket_id_seq"',
  GREATEST(
    999,
    COALESCE((
      SELECT MAX(substring("id" FROM 3)::INTEGER)
      FROM "SupportTicket"
      WHERE "id" ~ '^CS[0-9]{5}$'
    ), 999)
  ),
  true
);

ALTER TABLE "SupportTicket"
  ALTER COLUMN "id" SET DEFAULT next_support_ticket_id();
