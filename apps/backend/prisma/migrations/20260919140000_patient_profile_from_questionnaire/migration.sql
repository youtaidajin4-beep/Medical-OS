-- 紹介状の患者欄（氏名カナ・郵便番号・住所・職業）を問診票から取り込んで持てるようにする
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "name_kana" TEXT;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "postal_code" TEXT;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "occupation" TEXT;

-- 問診票から読み取った患者属性を、転記元の記録として添付ファイルにも残す
ALTER TABLE "consultation_attachments" ADD COLUMN IF NOT EXISTS "structured_data" JSONB;
