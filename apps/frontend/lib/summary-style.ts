/**
 * カルテ原稿の書き方（形式・文体・粒度）の見本。
 *
 * 先生ごとに、箇条書きが好き・文章で経過を残したい・できるだけ漏らさず残したい、が違う。
 * 見本を選ぶか、自分の言葉で指示を書く。どの指示も「書き方だけ」を変えるもので、
 * 事実の追加・削除はしない（サーバー側で、そう伝えたうえでモデルへ渡している）。
 */

export type SummaryPreset = {
  id: string;
  label: string;
  hint: string;
  /** モデルへ渡す指示。標準は「何も足さない」ので空 */
  instruction: string;
};

export const SUMMARY_PRESETS: SummaryPreset[] = [
  {
    id: 'standard',
    label: '標準',
    hint: '1行1事実の簡潔な書き方',
    instruction: '',
  },
  {
    id: 'concise',
    label: '箇条書き',
    hint: '短く、要点だけ',
    instruction:
      '各欄を、「・」で始まる短い箇条書きにする。1項目は1行・体言止めで、助詞や敬語は省く。数値・単位・薬剤名はそのまま残す。',
  },
  {
    id: 'prose',
    label: '文章',
    hint: '経過が読み取れる文章',
    instruction:
      'SとAは、箇条書きにせず、経過が読み取れる自然な文章（常体：「〜である」「〜した」）で書く。OとPは簡潔な短文でよい。',
  },
  {
    id: 'detailed',
    label: '詳細',
    hint: '会話の事実をできるだけ残す',
    instruction:
      '会話に出た事実をできるだけ漏らさず、時系列で書く。本人の言葉に近い表現を使い、症状の出方（いつ・どんなとき）も残す。',
  },
];

export const CUSTOM_PRESET_ID = 'custom';

export function findPreset(id: string | undefined): SummaryPreset | undefined {
  return SUMMARY_PRESETS.find((p) => p.id === id);
}

/** 保存された指示から、画面で選ばれている見本を決める（見本と同じ文なら見本、違えば「自分の指示」） */
export function presetIdFor(instruction: string, presetId?: string): string {
  const text = instruction.trim();
  if (!text) return 'standard';
  const byId = findPreset(presetId);
  if (byId && byId.instruction === text) return byId.id;
  const byText = SUMMARY_PRESETS.find((p) => p.instruction && p.instruction === text);
  return byText ? byText.id : CUSTOM_PRESET_ID;
}
