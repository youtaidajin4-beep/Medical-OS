import { WarningSeverity } from '@prisma/client';
import { StructuredClinicalDataPayload } from './llm.provider';
import { SttTranscriptSegment } from './stt.provider';

export type MockScenarioWarning = {
  category: string;
  message: string;
  severity: WarningSeverity;
};

export type MockScenario = {
  id: string;
  label: string;
  previewLines: string[];
  transcript: SttTranscriptSegment[];
  structured: StructuredClinicalDataPayload;
  warnings: MockScenarioWarning[];
};

const BRONCHITIS: MockScenario = {
  id: 'P-001',
  label: '気管支炎',
  previewLines: ['（音声を認識中…）', '咳が出て…', '息苦しさ…', '熱は…', '聴診では…'],
  transcript: [
    { text: '3日前から咳が出て、少し息苦しいです。', speaker: 'patient', confidence: 0.9 },
    { text: '熱はありましたか？', speaker: 'physician', confidence: 0.95 },
    { text: '37度半くらいでした。', speaker: 'patient', confidence: 0.88 },
    { text: '聴診では wheeze を認めます。気管支炎の印象です。', speaker: 'physician', confidence: 0.92 },
    { text: 'ムコダインを処方し、3日後に再診しましょう。', speaker: 'physician', confidence: 0.9 },
  ],
  structured: {
    chiefComplaint: '咳、息苦しさ（3日前から）',
    presentIllness: '3日前から咳が出現。37.5度の発熱あり。',
    medications: ['ムコダイン（要確認：用量未特定）'],
    allergies: [],
    vitals: '体温 37.5℃',
    physicalExam: '聴診で wheeze を認める',
    assessment: '気管支炎の印象',
    plan: 'ムコダイン処方、3日後再診',
  },
  warnings: [
    {
      category: 'medication',
      message: '要確認：薬剤名または用量を特定できません',
      severity: WarningSeverity.WARNING,
    },
    {
      category: 'vitals',
      message: '要確認：体温の測定方法・時刻が不明確です',
      severity: WarningSeverity.INFO,
    },
  ],
};

const HYPERTENSION: MockScenario = {
  id: 'P-002',
  label: '高血圧フォロー',
  previewLines: ['（音声を認識中…）', '血圧が…', '薬は続けて…', '頭が重い…', '塩分は…'],
  transcript: [
    { text: '最近、血圧が高い気がして不安です。', speaker: 'patient', confidence: 0.91 },
    { text: '家での血圧はいくつでしたか？', speaker: 'physician', confidence: 0.94 },
    { text: '朝は150前後、夕方は140くらいです。', speaker: 'patient', confidence: 0.89 },
    { text: 'アムロジピンは毎日飲んでいますか？', speaker: 'physician', confidence: 0.93 },
    { text: 'はい、朝1錠続けています。', speaker: 'patient', confidence: 0.9 },
    { text: '今日の血圧は147/92です。降圧薬継続と塩分制限をお願いします。', speaker: 'physician', confidence: 0.92 },
  ],
  structured: {
    chiefComplaint: '血圧が高い気がする',
    presentIllness: '家庭血圧 朝150前後、夕方140前後。アムロジピン継続中。',
    pastHistory: '高血圧',
    medications: ['アムロジピン 5mg 1日1回'],
    allergies: [],
    vitals: 'BP 147/92 mmHg',
    physicalExam: '心音整、明らかなラ音なし',
    assessment: '高血圧症フォロー、ややコントロール不良',
    plan: '降圧薬継続、塩分制限・体重管理指導、2週間後再診',
  },
  warnings: [
    {
      category: 'vitals',
      message: '要確認：家庭血圧の測定条件（安静・座位）を確認してください',
      severity: WarningSeverity.WARNING,
    },
    {
      category: 'negation',
      message: '要確認：副作用の有無（ふらつき・浮腫）の確認が必要です',
      severity: WarningSeverity.INFO,
    },
  ],
};

const HEADACHE: MockScenario = {
  id: 'P-003',
  label: '頭痛',
  previewLines: ['（音声を認識中…）', '頭が痛くて…', '昨日から…', '吐き気は…', '血圧は…'],
  transcript: [
    { text: '3日前から頭が締め付けられるように痛いです。', speaker: 'patient', confidence: 0.9 },
    { text: '吐き気や視界の異常はありますか？', speaker: 'physician', confidence: 0.95 },
    { text: '吐き気はなく、視界も普通です。', speaker: 'patient', confidence: 0.88 },
    { text: '仕事のストレスはありますか？', speaker: 'physician', confidence: 0.92 },
    { text: '残業が続いていて睡眠も少ないです。', speaker: 'patient', confidence: 0.87 },
    { text: '緊張型頭痛の印象です。対症療法と休息をお勧めします。', speaker: 'physician', confidence: 0.91 },
  ],
  structured: {
    chiefComplaint: '頭痛（3日前から）',
    presentIllness: '締め付け様頭痛。吐き気・視界異常なし。睡眠不足・ストレスあり。',
    pastHistory: '片頭痛の既往なし',
    medications: ['ロキソニン（頓服、要確認：最終服用日）'],
    allergies: [],
    vitals: 'BP 128/78 mmHg',
    physicalExam: '神経学的所見に異常なし',
    assessment: '緊張型頭痛の印象',
    plan: '鎮痛薬頓服、休息・ストレス管理、悪化時再診',
  },
  warnings: [
    {
      category: 'medication',
      message: '要確認：ロキソニンの最終服用日時を確認してください',
      severity: WarningSeverity.WARNING,
    },
    {
      category: 'red_flag',
      message: '要確認：突然の激しい頭痛・意識障害がないか再確認',
      severity: WarningSeverity.CRITICAL,
    },
  ],
};

const ANON_HEADACHE: MockScenario = {
  ...HEADACHE,
  id: 'ANON-001',
  label: '匿名症例 — 頭痛',
};

export const MOCK_SCENARIOS: Record<string, MockScenario> = {
  'P-001': BRONCHITIS,
  'P-002': HYPERTENSION,
  'P-003': HEADACHE,
  'ANON-001': ANON_HEADACHE,
};

export function resolveMockScenario(patientCode?: string | null, caseCode?: string | null): MockScenario {
  const key = patientCode ?? caseCode ?? 'P-001';
  return MOCK_SCENARIOS[key] ?? BRONCHITIS;
}
