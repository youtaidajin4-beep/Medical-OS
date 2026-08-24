-- CreateEnum
CREATE TYPE "VisitType" AS ENUM ('ROUTINE', 'CHECKUP');

-- AlterTable
ALTER TABLE "consultations" ADD COLUMN "visit_type" "VisitType" NOT NULL DEFAULT 'ROUTINE';
