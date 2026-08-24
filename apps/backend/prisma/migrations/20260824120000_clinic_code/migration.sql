-- AlterTable: add tenant code for multi-clinic internal-medicine project
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "code" TEXT;

-- Backfill existing rows (pilot clinic UUID) before NOT NULL + unique
UPDATE "clinics"
SET "code" = 'kushima_internal'
WHERE "id" = '00000000-0000-0000-0000-000000000001' AND ("code" IS NULL OR "code" = '');

UPDATE "clinics"
SET "code" = 'clinic_' || REPLACE("id"::text, '-', '')
WHERE "code" IS NULL OR "code" = '';

ALTER TABLE "clinics" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "clinics_code_key" ON "clinics"("code");
