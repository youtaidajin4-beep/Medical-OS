import {
  DEFAULT_MEDICAL_GLOSSARY,
  MedicalGlossary,
} from './medical-glossary.types';
import { PhysicianRules } from '../../modules/settings/physician-rules.types';

const BASE_PROMPT =
  '内科診察の会話。主訴、現病歴、既往歴、聴診、再診、処方、経過観察。';
const FINDINGS = 'wheeze、ラ音、咽頭発赤、発赤';

function uniqueTerms(terms: string[]): string[] {
  return [...new Set(terms.map((t) => t.trim()).filter(Boolean))];
}

export function resolveMedicalGlossary(rules?: PhysicianRules): MedicalGlossary {
  const fromRules = rules?.medicalGlossary;
  return {
    drugNames: uniqueTerms([
      ...DEFAULT_MEDICAL_GLOSSARY.drugNames,
      ...(fromRules?.drugNames ?? []),
    ]),
    diagnoses: uniqueTerms([
      ...DEFAULT_MEDICAL_GLOSSARY.diagnoses,
      ...(fromRules?.diagnoses ?? []),
    ]),
    customReplacements: fromRules?.customReplacements ?? [],
  };
}

/** Whisper prompt parameter (keep under ~224 tokens). */
export function buildWhisperPrompt(glossary: MedicalGlossary): string {
  const diagnoses = glossary.diagnoses.slice(0, 14);
  const drugs = glossary.drugNames.slice(0, 16);
  return [
    BASE_PROMPT,
    `診断:${diagnoses.join('、')}`,
    `薬剤:${drugs.join('、')}`,
    `所見:${FINDINGS}`,
  ].join(' ');
}

export function glossaryToLlmHint(glossary: MedicalGlossary): string {
  const lines = [
    `常用診断: ${glossary.diagnoses.join('、')}`,
    `常用薬剤: ${glossary.drugNames.join('、')}`,
  ];
  if (glossary.customReplacements.length) {
    lines.push(
      'クリニック置換例: ' +
        glossary.customReplacements
          .map((r) => `${r.wrong}→${r.correct}`)
          .join('、'),
    );
  }
  return lines.join('\n');
}
