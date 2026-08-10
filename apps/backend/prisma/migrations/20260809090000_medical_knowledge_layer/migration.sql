-- Medical Knowledge Layer v1
ALTER TABLE "transcript_segments" ADD COLUMN IF NOT EXISTS "raw_text" TEXT;

CREATE TYPE "MedicalTermCategory" AS ENUM ('diagnosis', 'symptom', 'finding', 'medication', 'dosage', 'strength', 'unit', 'route', 'frequency', 'duration', 'laboratory_test', 'laboratory_value', 'vital_sign', 'imaging', 'procedure', 'allergy', 'body_part', 'body_side', 'negation', 'treatment_action', 'hospital_name', 'doctor_name', 'date', 'time', 'abbreviation', 'other');
CREATE TYPE "MedicalTermAliasType" AS ENUM ('spoken', 'abbreviation', 'brand_name', 'generic_name', 'common_misspelling', 'stt_error', 'legacy', 'english');
CREATE TYPE "MedicalKnowledgeSource" AS ENUM ('national_master_import', 'internal_medicine_seed', 'clinic', 'physician', 'learning_candidate');
CREATE TYPE "MedicalRiskLevel" AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE "KnowledgeSpecialty" AS ENUM ('internal_medicine', 'dentistry', 'orthopedics', 'dermatology', 'psychiatry', 'care', 'general');
CREATE TABLE "medical_terms" (
    "id" TEXT NOT NULL,
    "canonical_name" TEXT NOT NULL,
    "reading" TEXT,
    "category" "MedicalTermCategory" NOT NULL,
    "subcategory" TEXT,
    "english_name" TEXT,
    "abbreviation" TEXT,
    "specialty" "KnowledgeSpecialty" NOT NULL DEFAULT 'internal_medicine',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "risk_level" "MedicalRiskLevel" NOT NULL DEFAULT 'medium',
    "source" "MedicalKnowledgeSource" NOT NULL DEFAULT 'internal_medicine_seed',
    "source_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_terms_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "medical_term_aliases" (
    "id" TEXT NOT NULL,
    "medical_term_id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "alias_reading" TEXT,
    "alias_type" "MedicalTermAliasType" NOT NULL,

    CONSTRAINT "medical_term_aliases_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "clinic_dictionary_terms" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "canonical_name" TEXT NOT NULL,
    "reading" TEXT,
    "category" "MedicalTermCategory" NOT NULL DEFAULT 'other',
    "aliases" JSONB NOT NULL DEFAULT '[]',
    "frequency" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_dictionary_terms_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "doctor_dictionary_terms" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "physician_id" TEXT NOT NULL,
    "canonical_name" TEXT NOT NULL,
    "spoken_form" TEXT NOT NULL,
    "preferred_written_form" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_dictionary_terms_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "transcript_corrections" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "physician_id" TEXT,
    "consultation_id" TEXT NOT NULL,
    "raw_text" TEXT NOT NULL,
    "corrected_text" TEXT NOT NULL,
    "original_term" TEXT,
    "corrected_term" TEXT,
    "category" "MedicalTermCategory",
    "confidence" DOUBLE PRECISION,
    "correction_source" TEXT NOT NULL,
    "approved_by_doctor" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcript_corrections_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "clinical_entities" (
    "id" TEXT NOT NULL,
    "consultation_id" TEXT NOT NULL,
    "entity_type" "MedicalTermCategory" NOT NULL,
    "raw_value" TEXT NOT NULL,
    "normalized_value" TEXT,
    "confidence" DOUBLE PRECISION,
    "start_position" INTEGER,
    "end_position" INTEGER,
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "risk_level" "MedicalRiskLevel" NOT NULL DEFAULT 'medium',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_entities_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "entity_candidates" (
    "id" TEXT NOT NULL,
    "clinical_entity_id" TEXT NOT NULL,
    "candidate_value" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "candidate_source" TEXT NOT NULL,

    CONSTRAINT "entity_candidates_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "knowledge_quality_metrics" (
    "id" TEXT NOT NULL,
    "consultation_id" TEXT NOT NULL,
    "general_transcription_accuracy" DOUBLE PRECISION,
    "medical_term_accuracy" DOUBLE PRECISION,
    "medication_accuracy" DOUBLE PRECISION,
    "dosage_accuracy" DOUBLE PRECISION,
    "laboratory_accuracy" DOUBLE PRECISION,
    "numeric_accuracy" DOUBLE PRECISION,
    "negation_accuracy" DOUBLE PRECISION,
    "doctor_correction_count" INTEGER NOT NULL DEFAULT 0,
    "automatic_correction_count" INTEGER NOT NULL DEFAULT 0,
    "review_required_count" INTEGER NOT NULL DEFAULT 0,
    "critical_medical_error_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_quality_metrics_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "dictionary_learning_candidates" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "original_term" TEXT NOT NULL,
    "corrected_term" TEXT NOT NULL,
    "category" "MedicalTermCategory",
    "occurrence_count" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dictionary_learning_candidates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "medical_terms_canonical_name_idx" ON "medical_terms"("canonical_name");
CREATE INDEX "medical_terms_category_specialty_is_active_idx" ON "medical_terms"("category", "specialty", "is_active");
CREATE INDEX "medical_terms_reading_idx" ON "medical_terms"("reading");
CREATE INDEX "medical_term_aliases_alias_idx" ON "medical_term_aliases"("alias");
CREATE INDEX "medical_term_aliases_medical_term_id_idx" ON "medical_term_aliases"("medical_term_id");
CREATE INDEX "clinic_dictionary_terms_clinic_id_is_active_idx" ON "clinic_dictionary_terms"("clinic_id", "is_active");
CREATE INDEX "clinic_dictionary_terms_clinic_id_canonical_name_idx" ON "clinic_dictionary_terms"("clinic_id", "canonical_name");
CREATE INDEX "doctor_dictionary_terms_physician_id_idx" ON "doctor_dictionary_terms"("physician_id");
CREATE INDEX "doctor_dictionary_terms_clinic_id_physician_id_idx" ON "doctor_dictionary_terms"("clinic_id", "physician_id");
CREATE INDEX "transcript_corrections_consultation_id_idx" ON "transcript_corrections"("consultation_id");
CREATE INDEX "transcript_corrections_clinic_id_original_term_corrected_te_idx" ON "transcript_corrections"("clinic_id", "original_term", "corrected_term");
CREATE INDEX "clinical_entities_consultation_id_idx" ON "clinical_entities"("consultation_id");
CREATE INDEX "clinical_entities_consultation_id_needs_review_idx" ON "clinical_entities"("consultation_id", "needs_review");
CREATE INDEX "entity_candidates_clinical_entity_id_idx" ON "entity_candidates"("clinical_entity_id");
CREATE UNIQUE INDEX "knowledge_quality_metrics_consultation_id_key" ON "knowledge_quality_metrics"("consultation_id");
CREATE INDEX "dictionary_learning_candidates_clinic_id_status_idx" ON "dictionary_learning_candidates"("clinic_id", "status");
CREATE UNIQUE INDEX "dictionary_learning_candidates_clinic_id_original_term_corr_key" ON "dictionary_learning_candidates"("clinic_id", "original_term", "corrected_term");
ALTER TABLE "medical_term_aliases" ADD CONSTRAINT "medical_term_aliases_medical_term_id_fkey" FOREIGN KEY ("medical_term_id") REFERENCES "medical_terms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinic_dictionary_terms" ADD CONSTRAINT "clinic_dictionary_terms_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "doctor_dictionary_terms" ADD CONSTRAINT "doctor_dictionary_terms_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "doctor_dictionary_terms" ADD CONSTRAINT "doctor_dictionary_terms_physician_id_fkey" FOREIGN KEY ("physician_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transcript_corrections" ADD CONSTRAINT "transcript_corrections_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transcript_corrections" ADD CONSTRAINT "transcript_corrections_physician_id_fkey" FOREIGN KEY ("physician_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transcript_corrections" ADD CONSTRAINT "transcript_corrections_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinical_entities" ADD CONSTRAINT "clinical_entities_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entity_candidates" ADD CONSTRAINT "entity_candidates_clinical_entity_id_fkey" FOREIGN KEY ("clinical_entity_id") REFERENCES "clinical_entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
