import { MedicalGlossary } from '../../providers/ai/medical-glossary.types';

/**
 * 医師の口述をモデルへ渡す前に、「この語が出ます」と先に教えるための一文。
 *
 * 分離モデルは語彙を受け付けないため、これまでこのヒントは一度も届いていなかった。
 * 実測（2026-09-21・同じ音声）では、渡すだけで
 *   「アムロビピンドミリオ一日会」→「アムロジピン5mg 1日1回朝食後」
 * まで変わる。長すぎると効きが落ちるので、クリニックの語彙を先に置き、
 * 全体を切り詰める。
 */
const BASE_HINT =
  '内科クリニックの医師がAIアシスタントへ出す短い指示です。薬剤名・病名・病院名・用法を正確に書き取ってください。';

/** 診療科を問わず口述に出る語。クリニック語彙が空でもここだけは効かせる */
const COMMON_TERMS = [
  '紹介状',
  '診療情報提供書',
  '診断書',
  '主治医意見書',
  '傷病名',
  '既往歴',
  '家族歴',
  '現在の処方',
  '紹介目的',
  '総合判定',
  '1日1回',
  '1日2回',
  '朝食後',
  '朝夕食後',
  'mg',
];

/** OpenAIのpromptは長いほど効きが鈍る。語数で頭打ちにする */
const MAX_TERMS = 60;

export function glossaryToVocabularyPrompt(glossary?: MedicalGlossary | null): string {
  const fromGlossary = [
    ...(glossary?.drugNames ?? []),
    ...(glossary?.diagnoses ?? []),
    ...(glossary?.customReplacements ?? []).map((r) => r.correct),
  ]
    .map((t) => (typeof t === 'string' ? t.trim() : ''))
    .filter(Boolean);

  const terms: string[] = [];
  for (const term of [...fromGlossary, ...COMMON_TERMS]) {
    if (terms.length >= MAX_TERMS) break;
    if (!terms.includes(term)) terms.push(term);
  }

  return `${BASE_HINT}次の語が出ます: ${terms.join('、')}。`;
}
