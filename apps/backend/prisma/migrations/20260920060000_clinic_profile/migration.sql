-- 書類に印刷する医療機関の情報を、コードの定数からクリニックのレコードへ移す
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "legal_name" TEXT;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "postal_code" TEXT;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "tel" TEXT;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "fax" TEXT;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "municipality_code" TEXT;

-- 医師番号は医師ごとに違う
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "doctor_number" TEXT;

-- くしま内科のいまの値を入れておく（紙の様式どおりの表記）
UPDATE "clinics" SET
  "legal_name"        = COALESCE("legal_name", '医療法人 十慶会　くしま内科クリニック'),
  "postal_code"       = COALESCE("postal_code", '856-0832'),
  "address"           = COALESCE("address", '長崎県大村市本町 436-16'),
  "tel"               = COALESCE("tel", '0957-51-1256'),
  "fax"               = COALESCE("fax", '0957-51-4156'),
  "department"        = COALESCE("department", '内科'),
  "municipality_code" = COALESCE("municipality_code", '42205')
WHERE "code" = 'kushima_internal';

UPDATE "users" SET "doctor_number" = COALESCE("doctor_number", '0092618202')
WHERE "role" = 'PHYSICIAN'
  AND "clinic_id" IN (SELECT "id" FROM "clinics" WHERE "code" = 'kushima_internal');
