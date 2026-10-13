import { WarningSeverity } from '@prisma/client';
import { StructuredClinicalDataPayload } from './llm.provider';
import { MedicalGlossary } from './medical-glossary.types';
import { knowledgePackDrugSurfaces } from '../../modules/medical-knowledge/data/load-knowledge-pack';

/**
 * 辞書にある薬の表記（一般名・商品名、追加語彙を含む）。
 * これまでの照合は、先生の設定と固定の約40語だけを見ていたので、ふつうの薬でも
 * 「辞書未登録」と出ていた（実診察でジャディアンス・タケキャブ・エディロールが出た）。
 */
const KNOWN_DRUG_SURFACES = [
  ...new Set(knowledgePackDrugSurfaces().map((d) => d.surface).filter((x) => x.length >= 3)),
];

export type ClinicalValidationWarning = {
  category: string;
  message: string;
  severity: WarningSeverity;
};

function normalizeTerm(value: string): string {
  return value.replace(/（要確認）|\(要確認\)/g, '').replace(/\s+/g, '').trim();
}

function matchesGlossaryDrug(medication: string, drugNames: string[]): boolean {
  const normalized = normalizeTerm(medication);
  if (!normalized || normalized.includes('要確認')) return true;
  if (KNOWN_DRUG_SURFACES.some((drug) => normalized.includes(drug))) return true;
  return drugNames.some(
    (drug) => normalized.includes(drug) || drug.includes(normalized),
  );
}

function matchesGlossaryDiagnosis(assessment: string, diagnoses: string[]): boolean {
  const normalized = normalizeTerm(assessment);
  if (!normalized || normalized.includes('要確認')) return true;
  return diagnoses.some(
    (diagnosis) =>
      normalized.includes(diagnosis) ||
      diagnosis.includes(normalized) ||
      normalized.includes('印象') ||
      normalized.includes('疑い'),
  );
}

export function validateStructuredData(
  data: StructuredClinicalDataPayload,
  glossary?: MedicalGlossary,
): ClinicalValidationWarning[] {
  const warnings: ClinicalValidationWarning[] = [];
  const drugNames = glossary?.drugNames ?? [];
  const diagnoses = glossary?.diagnoses ?? [];

  const meds = data.medications ?? [];
  for (const med of meds) {
    if (med.includes('要確認')) {
      warnings.push({
        category: 'medication',
        message: '要確認：薬剤名または用量を特定できません',
        severity: WarningSeverity.WARNING,
      });
      continue;
    }
    if (drugNames.length && !matchesGlossaryDrug(med, drugNames)) {
      warnings.push({
        category: 'medication',
        message: `要確認：辞書未登録の薬剤「${med}」`,
        severity: WarningSeverity.WARNING,
      });
    }
  }

  if (data.assessment && diagnoses.length && !matchesGlossaryDiagnosis(data.assessment, diagnoses)) {
    warnings.push({
      category: 'assessment',
      message: `要確認：診断名を確認してください（${data.assessment}）`,
      severity: WarningSeverity.WARNING,
    });
  }

  return warnings;
}
