import {
  DEFAULT_MEDICAL_GLOSSARY,
  MedicalGlossary,
} from './medical-glossary.types';
import { PhysicianRules } from '../../modules/settings/physician-rules.types';
import {
  knowledgePackCorrectionTerms,
  knowledgePackGlossaryDefaults,
} from '../../modules/medical-knowledge/data/load-knowledge-pack';

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
 * 校正へ渡すクリニック語彙。
 *
 * 以前は各20語だけだった。五十音順の先頭20語なので循環器の病名ばかりで、
 * 消化器も呼吸器も内分泌も1語も入っていなかった。実際の誤変換で測ると
 * **回復率 33% → 42%**（各5回・ばらつき0）。eval/run-correction-eval.mjs で測り直せる。
 *
 * 読みは入れない。同じ語数で読みを足すと回復率が下がる（ヒントが2.4倍の長さになり、
 * モデルの注意が薄まる）。読みは索引の鍵として持つのが正しい置き場所。
 */
export function glossaryToLlmHint(
  glossary: MedicalGlossary,
  sessionHits?: SessionKnowledgeHint[],
): string {
  const pack = knowledgePackGlossaryDefaults();
  const terms = knowledgePackCorrectionTerms();
  const lines = [
    `常用診断: ${uniqueTerms([...glossary.diagnoses, ...terms.diagnoses]).join('、')}`,
    `常用薬剤: ${uniqueTerms([...glossary.drugNames, ...terms.drugNames]).join('、')}`,
    `症状・所見: ${uniqueTerms(terms.symptoms).join('、')}`,
    `検査・画像: ${uniqueTerms(terms.tests).join('、')}`,
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
