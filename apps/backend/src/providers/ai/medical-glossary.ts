import {
  DEFAULT_MEDICAL_GLOSSARY,
  MedicalGlossary,
} from './medical-glossary.types';
import { PhysicianRules } from '../../modules/settings/physician-rules.types';
import { knowledgePackGlossaryDefaults } from '../../modules/medical-knowledge/data/load-knowledge-pack';

const BASE_PROMPT =
  '内科診察の会話。主訴、現病歴、既往歴、聴診、再診、処方、経過観察。';
const FINDINGS = 'wheeze、ラ音、咽頭発赤、発赤、浮腫、動悸、息切れ';

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
    customReplacements: [
      ...DEFAULT_MEDICAL_GLOSSARY.customReplacements,
      ...(fromRules?.customReplacements ?? []),
    ],
  };
}

/** Whisper prompt parameter (keep under ~224 tokens). Compact pack hints only. */
export function buildWhisperPrompt(glossary: MedicalGlossary): string {
  const pack = knowledgePackGlossaryDefaults();
  const diagnoses = uniqueTerms([...glossary.diagnoses, ...pack.diagnoses]).slice(0, 12);
  const drugs = uniqueTerms([...glossary.drugNames, ...pack.drugNames]).slice(0, 14);
  const spoken = pack.spokenHints.slice(0, 10);
  return [
    BASE_PROMPT,
    `診断:${diagnoses.join('、')}`,
    `薬剤:${drugs.join('、')}`,
    spoken.length ? `読み:${spoken.join('、')}` : '',
    `所見:${FINDINGS}`,
  ]
    .filter(Boolean)
    .join(' ');
}

export type SessionKnowledgeHint = {
  rawValue: string;
  normalizedValue: string | null;
  entityType: string;
  needsReview: boolean;
};

/**
 * LLM hints: small fixed clinic glossary + this consultation's knowledge hits only.
 * Never dump the full 1000+ term pack.
 */
export function glossaryToLlmHint(
  glossary: MedicalGlossary,
  sessionHits?: SessionKnowledgeHint[],
): string {
  const pack = knowledgePackGlossaryDefaults();
  const lines = [
    `常用診断: ${uniqueTerms([...glossary.diagnoses, ...pack.diagnoses]).slice(0, 20).join('、')}`,
    `常用薬剤: ${uniqueTerms([...glossary.drugNames, ...pack.drugNames]).slice(0, 20).join('、')}`,
    `音声別名ヒント: ${pack.spokenHints.slice(0, 16).join('、')}`,
  ];
  if (glossary.customReplacements.length) {
    lines.push(
      'クリニック置換例: ' +
        glossary.customReplacements
          .slice(0, 12)
          .map((r) => `${r.wrong}→${r.correct}`)
          .join('、'),
    );
  }
  if (sessionHits?.length) {
    lines.push(
      '今回ヒット候補（要確認含む・全件辞典ではない）: ' +
        sessionHits
          .slice(0, 24)
          .map((h) =>
            h.normalizedValue
              ? `${h.rawValue}→${h.normalizedValue}${h.needsReview ? '(要確認)' : ''}`
              : h.rawValue,
          )
          .join('、'),
    );
  }
  return lines.join('\n');
}
