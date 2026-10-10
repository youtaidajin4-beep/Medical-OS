-- 音声認識とSOAPの品質を診察ごとに積む（管理画面 /admin/quality の元データ）
-- CreateTable
CREATE TABLE "quality_measurements" (
    "id" TEXT NOT NULL,
    "consultation_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "physician_id" TEXT NOT NULL,
    "visited_at" TIMESTAMP(3) NOT NULL,
    "ref_chars" INTEGER,
    "live_chars" INTEGER,
    "utterance_recall" DOUBLE PRECISION,
    "utterance_precision" DOUBLE PRECISION,
    "term_ref_count" INTEGER,
    "term_hit_count" INTEGER,
    "term_raw_hit_count" INTEGER,
    "missed_terms" JSONB,
    "stt_measured_at" TIMESTAMP(3),
    "stt_error" TEXT,
    "fact_count" INTEGER,
    "fact_hit_count" INTEGER,
    "unsupported_count" INTEGER,
    "missed_facts" JSONB,
    "unsupported_claims" JSONB,
    "judge_cost_jpy" DOUBLE PRECISION,
    "soap_measured_at" TIMESTAMP(3),
    "soap_error" TEXT,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quality_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quality_measurements_consultation_id_key" ON "quality_measurements"("consultation_id");

-- CreateIndex
CREATE INDEX "quality_measurements_clinic_id_visited_at_idx" ON "quality_measurements"("clinic_id", "visited_at");

-- AddForeignKey
ALTER TABLE "quality_measurements" ADD CONSTRAINT "quality_measurements_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

