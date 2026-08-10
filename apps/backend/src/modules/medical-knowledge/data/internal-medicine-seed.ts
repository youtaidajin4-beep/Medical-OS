import { SeedTerm, AliasType, EntityType, RiskLevel } from '../knowledge-types';
import { AUTO_STT_ERROR_PATCHES } from './stt-error-auto-patches';

type AliasInput = string | { alias: string; aliasType: AliasType; aliasReading?: string };

function term(
  canonicalName: string,
  category: EntityType,
  opts: {
    reading?: string;
    subcategory?: string;
    englishName?: string;
    abbreviation?: string;
    priority?: number;
    riskLevel?: RiskLevel;
    aliases?: AliasInput[];
  } = {},
): SeedTerm {
  const aliases = (opts.aliases ?? []).map((a) =>
    typeof a === 'string' ? { alias: a, aliasType: 'spoken' as AliasType } : a,
  );
  return {
    canonicalName,
    category,
    subcategory: opts.subcategory,
    reading: opts.reading,
    englishName: opts.englishName,
    abbreviation: opts.abbreviation,
    priority: opts.priority ?? 100,
    riskLevel: opts.riskLevel ?? defaultRisk(category),
    aliases,
  };
}

function defaultRisk(category: EntityType): RiskLevel {
  if (['medication', 'dosage', 'strength', 'allergy', 'laboratory_value', 'negation'].includes(category)) {
    return 'critical';
  }
  if (['treatment_action', 'body_side', 'vital_sign', 'laboratory_test'].includes(category)) {
    return 'high';
  }
  return 'medium';
}

function many(names: string[], category: EntityType, subcategory?: string, riskLevel?: RiskLevel): SeedTerm[] {
  return names.map((n) => term(n, category, { subcategory, riskLevel }));
}

const DIAGNOSES_CARDIO = [
  '高血圧', '本態性高血圧症', '二次性高血圧', '白衣高血圧', '仮面高血圧', '低血圧', '起立性低血圧',
  '心不全', '急性心不全', '慢性心不全', 'うっ血性心不全', 'HFpEF', 'HFrEF',
  '狭心症', '安定狭心症', '不安定狭心症', '冠攣縮性狭心症',
  '心筋梗塞', '急性心筋梗塞', '陳旧性心筋梗塞', '虚血性心疾患', '冠動脈疾患',
  '心房細動', '発作性心房細動', '持続性心房細動', '心房粗動', '上室性頻拍',
  '期外収縮', '心室性期外収縮', '上室性期外収縮', '徐脈', '頻脈', '不整脈',
  '房室ブロック', '洞不全症候群', '心筋症', '肥大型心筋症', '拡張型心筋症',
  '心膜炎', '心筋炎', '弁膜症', '大動脈弁狭窄症', '大動脈弁閉鎖不全症', '僧帽弁閉鎖不全症',
  '動脈硬化', '閉塞性動脈硬化症', '末梢動脈疾患', '深部静脈血栓症', '肺血栓塞栓症',
];

const DIAGNOSES_DM = [
  '糖尿病', '1型糖尿病', '2型糖尿病', '耐糖能異常', '境界型糖尿病',
  '糖尿病性腎症', '糖尿病性神経障害', '糖尿病性網膜症', '糖尿病性ケトアシドーシス',
  '高血糖', '低血糖', '脂質異常症', '高LDLコレステロール血症', '高トリグリセリド血症',
  '低HDLコレステロール血症', '高尿酸血症', '痛風', '肥満', '肥満症', 'メタボリックシンドローム',
];

const DIAGNOSES_RENAL = [
  '慢性腎臓病', 'CKD', '急性腎障害', 'AKI', '慢性腎不全', '末期腎不全', '腎機能障害',
  '蛋白尿', '血尿', '微量アルブミン尿', '糸球体腎炎', 'ネフローゼ症候群',
  '尿路感染症', '膀胱炎', '腎盂腎炎', '尿路結石', '腎結石',
];

const DIAGNOSES_RESP = [
  '気管支喘息', '喘息', 'COPD', '慢性閉塞性肺疾患', '肺気腫', '慢性気管支炎', '急性気管支炎',
  '肺炎', '市中肺炎', '誤嚥性肺炎', '間質性肺炎', '肺線維症', '気胸', '胸水',
  '睡眠時無呼吸症候群', 'SAS', '閉塞性睡眠時無呼吸', 'OSAS',
];

const DIAGNOSES_INF = [
  '感冒', 'かぜ', '急性上気道炎', '咽頭炎', '扁桃炎', 'インフルエンザ',
  '新型コロナウイルス感染症', 'COVID-19', '感染性胃腸炎', '細菌感染症', 'ウイルス感染症',
  '帯状疱疹', '単純ヘルペス',
];

const DIAGNOSES_GI = [
  '胃炎', '急性胃炎', '慢性胃炎', '萎縮性胃炎', '逆流性食道炎', 'GERD', '胃食道逆流症',
  '胃潰瘍', '十二指腸潰瘍', '機能性ディスペプシア', 'FD', '胃腸炎',
  '過敏性腸症候群', 'IBS', '便秘症', '慢性便秘症', '下痢症', '大腸憩室症', '大腸ポリープ',
  '胆石症', '胆嚢炎', '胆管炎', '膵炎',
];

const DIAGNOSES_LIVER = [
  '肝機能障害', '脂肪肝', 'MASLD', 'B型肝炎', 'C型肝炎', '慢性肝炎', '肝硬変', 'アルコール性肝障害',
];

const DIAGNOSES_ENDO = [
  '甲状腺機能低下症', '甲状腺機能亢進症', '橋本病', '慢性甲状腺炎', 'バセドウ病', '甲状腺腫', '副腎不全',
];

const DIAGNOSES_BLOOD = [
  '貧血', '鉄欠乏性貧血', '巨赤芽球性貧血', 'ビタミンB12欠乏性貧血', '葉酸欠乏性貧血',
  '溶血性貧血', '白血球減少症', '血小板減少症', '多血症',
];

const DIAGNOSES_NEURO = [
  '脳梗塞', '脳出血', '一過性脳虚血発作', 'TIA', '認知症', 'アルツハイマー型認知症',
  '血管性認知症', 'パーキンソン病', '片頭痛', '緊張型頭痛', '末梢神経障害',
];

const DIAGNOSES_OTHER = [
  'アレルギー性鼻炎', '花粉症', '蕁麻疹', 'アナフィラキシー', '骨粗鬆症', '変形性関節症',
];

const SYMPTOMS = [
  '発熱', '微熱', '悪寒', '悪寒戦慄', '倦怠感', '全身倦怠感', '易疲労感', '食欲不振',
  '体重減少', '体重増加', '寝汗', '脱水',
  '頭痛', 'めまい', '回転性めまい', 'ふらつき', '失神', '意識障害', 'しびれ', '麻痺', '脱力', '振戦',
  '咳', '咳嗽', '乾性咳嗽', '湿性咳嗽', '痰', '喀痰', '血痰', '鼻汁', '鼻水', '鼻閉',
  '咽頭痛', '嗄声', '呼吸困難', '呼吸苦', '息切れ', '喘鳴',
  '胸痛', '胸部圧迫感', '動悸', '浮腫', '下腿浮腫',
  '腹痛', '心窩部痛', '右季肋部痛', '下腹部痛', '腹部膨満', '悪心', '嘔気', '嘔吐',
  '胸やけ', 'げっぷ', '食欲低下', '下痢', '便秘', '黒色便', '血便', '下血',
  '頻尿', '夜間頻尿', '排尿痛', '残尿感',
  '腰痛', '背部痛', '関節痛', '筋肉痛', '肩痛',
  '発疹', '皮疹', '紅斑', '掻痒感', 'かゆみ',
  '口渇', '多飲', '多尿',
  '睡眠障害', '不眠', 'いびき', '日中傾眠',
];

const VITALS: SeedTerm[] = [
  term('血圧', 'vital_sign', { aliases: ['BP', '上が', '下が', '上の血圧', '下の血圧'], riskLevel: 'critical' }),
  term('収縮期血圧', 'vital_sign', { riskLevel: 'critical' }),
  term('拡張期血圧', 'vital_sign', { riskLevel: 'critical' }),
  term('脈拍', 'vital_sign', { aliases: ['HR', '心拍数'], riskLevel: 'high' }),
  term('心拍数', 'vital_sign', { abbreviation: 'HR', riskLevel: 'high' }),
  term('体温', 'vital_sign', { aliases: ['BT'], riskLevel: 'high' }),
  term('呼吸数', 'vital_sign', { riskLevel: 'high' }),
  term('SpO2', 'vital_sign', {
    aliases: [
      { alias: '酸素飽和度', aliasType: 'generic_name' },
      { alias: 'サチュレーション', aliasType: 'spoken' },
      { alias: 'サット', aliasType: 'spoken' },
      { alias: '酸素', aliasType: 'spoken' },
    ],
    riskLevel: 'critical',
  }),
  term('体重', 'vital_sign'),
  term('身長', 'vital_sign'),
  term('BMI', 'vital_sign'),
];

const LABS: SeedTerm[] = [
  ...['WBC', '白血球', 'RBC', '赤血球', 'Hb', 'Hgb', 'ヘモグロビン', 'Ht', 'ヘマトクリット',
    'MCV', 'MCH', 'MCHC', 'Plt', '血小板', '好中球', 'リンパ球', '単球', '好酸球', '好塩基球',
  ].map((n) => term(n, 'laboratory_test', { subcategory: '血算' })),
  term('CRP', 'laboratory_test', { subcategory: '炎症', aliases: [{ alias: 'シーアールピー', aliasType: 'spoken' }] }),
  term('赤沈', 'laboratory_test', { aliases: ['ESR'] }),
  term('プロカルシトニン', 'laboratory_test', { aliases: ['PCT'] }),
  term('血糖', 'laboratory_test', { subcategory: '糖尿病', aliases: ['BS', '血糖値'], riskLevel: 'critical' }),
  term('空腹時血糖', 'laboratory_test', { aliases: ['FBS'], riskLevel: 'critical' }),
  term('随時血糖', 'laboratory_test', { riskLevel: 'critical' }),
  term('HbA1c', 'laboratory_test', {
    subcategory: '糖尿病',
    riskLevel: 'critical',
    aliases: [
      { alias: 'A1c', aliasType: 'abbreviation' },
      { alias: 'A1C', aliasType: 'abbreviation' },
      { alias: 'HBA1C', aliasType: 'abbreviation' },
      { alias: 'エーワンシー', aliasType: 'spoken' },
      { alias: 'ヘモグロビンエーワンシー', aliasType: 'spoken' },
    ],
  }),
  term('グリコアルブミン', 'laboratory_test', { aliases: ['GA'] }),
  term('BUN', 'laboratory_test', { aliases: ['尿素窒素'], riskLevel: 'high' }),
  term('クレアチニン', 'laboratory_test', {
    riskLevel: 'critical',
    aliases: [
      { alias: 'Cre', aliasType: 'abbreviation' },
      { alias: 'Cr', aliasType: 'abbreviation' },
      { alias: 'クレアチ', aliasType: 'spoken' },
      { alias: 'クレ', aliasType: 'spoken' },
    ],
  }),
  term('eGFR', 'laboratory_test', {
    riskLevel: 'critical',
    aliases: [
      { alias: 'イージーエフアール', aliasType: 'spoken' },
      { alias: 'ジーエフアール', aliasType: 'spoken' },
    ],
  }),
  term('尿酸', 'laboratory_test', { aliases: ['UA'] }),
  term('尿蛋白', 'laboratory_test'),
  term('尿糖', 'laboratory_test'),
  term('尿潜血', 'laboratory_test'),
  term('尿アルブミン', 'laboratory_test', { aliases: ['尿中アルブミン', '微量アルブミン尿'] }),
  term('AST', 'laboratory_test', { aliases: ['GOT'] }),
  term('ALT', 'laboratory_test', { aliases: ['GPT'] }),
  term('ALP', 'laboratory_test'),
  term('γ-GTP', 'laboratory_test', {
    aliases: [
      { alias: 'ガンマGTP', aliasType: 'spoken' },
      { alias: 'ガンマジーティーピー', aliasType: 'spoken' },
      { alias: 'GGTP', aliasType: 'abbreviation' },
    ],
  }),
  term('LDH', 'laboratory_test'),
  term('総ビリルビン', 'laboratory_test', { aliases: ['T-Bil'] }),
  term('直接ビリルビン', 'laboratory_test'),
  term('アルブミン', 'laboratory_test', { aliases: ['Alb'] }),
  term('総蛋白', 'laboratory_test', { aliases: ['TP'] }),
  term('総コレステロール', 'laboratory_test', { aliases: ['TC'] }),
  term('LDL', 'laboratory_test', {
    aliases: [
      { alias: 'LDL-C', aliasType: 'abbreviation' },
      { alias: 'エルディーエル', aliasType: 'spoken' },
    ],
  }),
  term('HDL', 'laboratory_test', {
    aliases: [
      { alias: 'HDL-C', aliasType: 'abbreviation' },
      { alias: 'エイチディーエル', aliasType: 'spoken' },
    ],
  }),
  term('中性脂肪', 'laboratory_test', { aliases: ['TG', 'トリグリセリド'] }),
  ...['Na', 'ナトリウム', 'K', 'カリウム', 'Cl', 'クロール', 'Ca', 'カルシウム', 'P', 'リン', 'Mg', 'マグネシウム'].map(
    (n) => term(n, 'laboratory_test', { subcategory: '電解質', riskLevel: n === 'K' || n === 'カリウム' || n === 'Na' || n === 'ナトリウム' ? 'critical' : 'high' }),
  ),
  term('BNP', 'laboratory_test', { aliases: [{ alias: 'ビーエヌピー', aliasType: 'spoken' }], riskLevel: 'high' }),
  term('NT-proBNP', 'laboratory_test', { aliases: [{ alias: 'エヌティープロビーエヌピー', aliasType: 'spoken' }], riskLevel: 'high' }),
  term('トロポニン', 'laboratory_test', { aliases: ['トロポニンT', 'トロポニンI'], riskLevel: 'critical' }),
  term('CK', 'laboratory_test'),
  term('CK-MB', 'laboratory_test'),
  term('PT', 'laboratory_test', { riskLevel: 'high' }),
  term('PT-INR', 'laboratory_test', { aliases: ['INR'], riskLevel: 'critical' }),
  term('APTT', 'laboratory_test'),
  term('Dダイマー', 'laboratory_test'),
  term('TSH', 'laboratory_test', { aliases: [{ alias: 'ティーエスエイチ', aliasType: 'spoken' }] }),
  term('FT3', 'laboratory_test', { aliases: ['Free T3'] }),
  term('FT4', 'laboratory_test', {
    aliases: [
      { alias: 'Free T4', aliasType: 'english' },
      { alias: 'フリーT4', aliasType: 'spoken' },
      { alias: 'エフティーフォー', aliasType: 'spoken' },
    ],
  }),
  term('サイログロブリン', 'laboratory_test'),
  term('抗TPO抗体', 'laboratory_test'),
  term('抗サイログロブリン抗体', 'laboratory_test'),
  term('Fe', 'laboratory_test', { aliases: ['血清鉄'] }),
  term('フェリチン', 'laboratory_test'),
  term('TIBC', 'laboratory_test'),
  term('UIBC', 'laboratory_test'),
  term('ビタミンB12', 'laboratory_test'),
  term('葉酸', 'laboratory_test'),
  term('ビタミンD', 'laboratory_test'),
  term('インフルエンザ抗原', 'laboratory_test'),
  term('COVID抗原', 'laboratory_test', { aliases: ['SARS-CoV-2'] }),
  term('PCR', 'laboratory_test', { aliases: [{ alias: 'ピーシーアール', aliasType: 'spoken' }] }),
  term('HBs抗原', 'laboratory_test'),
  term('HBs抗体', 'laboratory_test'),
  term('HCV抗体', 'laboratory_test'),
];

const IMAGING: SeedTerm[] = [
  term('心電図', 'imaging', { aliases: ['ECG', 'EKG', '12誘導心電図'] }),
  term('ホルター心電図', 'imaging', { aliases: ['24時間心電図'] }),
  term('胸部X線', 'imaging', { aliases: ['胸部レントゲン', 'レントゲン', 'XP'] }),
  term('CT', 'imaging', { aliases: ['胸部CT', '腹部CT', '造影CT', '単純CT'] }),
  term('MRI', 'imaging', { aliases: ['頭部MRI', 'MRA'] }),
  term('超音波', 'imaging', { aliases: ['エコー', '腹部エコー', '心エコー', '甲状腺エコー', '頸動脈エコー'] }),
  term('肺機能検査', 'procedure', { aliases: ['スパイロメトリー'] }),
  term('上部消化管内視鏡', 'procedure', { aliases: ['胃カメラ', 'EGD'] }),
  term('下部消化管内視鏡', 'procedure', { aliases: ['大腸カメラ', 'CS'] }),
];

const MEDICATIONS: SeedTerm[] = [
  // 降圧
  ...['アムロジピン', 'ニフェジピン', 'アゼルニジピン', 'シルニジピン', 'ベニジピン',
    'テルミサルタン', 'オルメサルタン', 'カンデサルタン', 'アジルサルタン', 'ロサルタン', 'イルベサルタン', 'バルサルタン',
    'エナラプリル', 'ペリンドプリル', 'ビソプロロール', 'カルベジロール', 'アテノロール',
    'トリクロルメチアジド', 'ヒドロクロロチアジド', 'インダパミド',
    'フロセミド', 'アゾセミド', 'スピロノラクトン', 'エプレレノン', 'エサキセレノン',
  ].map((n) => term(n, 'medication', { subcategory: '降圧薬', riskLevel: 'critical' })),
  // 糖尿病
  ...['メトホルミン', 'グリメピリド', 'グリクラジド',
    'シタグリプチン', 'リナグリプチン', 'ビルダグリプチン', 'アログリプチン', 'テネリグリプチン',
    'ダパグリフロジン', 'エンパグリフロジン', 'イプラグリフロジン', 'ルセオグリフロジン', 'トホグリフロジン', 'カナグリフロジン',
    'ボグリボース', 'アカルボース', 'ミグリトール', 'ピオグリタゾン',
    'セマグルチド', 'デュラグルチド', 'チルゼパチド',
    'インスリン', 'インスリンアスパルト', 'インスリンリスプロ', 'インスリングラルギン', 'インスリンデグルデク',
  ].map((n) => term(n, 'medication', { subcategory: '糖尿病', riskLevel: 'critical' })),
  ...['ロスバスタチン', 'アトルバスタチン', 'ピタバスタチン', 'プラバスタチン', 'シンバスタチン', 'エゼチミブ', 'ペマフィブラート', 'フェノフィブラート'].map(
    (n) => term(n, 'medication', { subcategory: '脂質', riskLevel: 'critical' }),
  ),
  ...['ワルファリン', 'アピキサバン', 'エドキサバン', 'リバーロキサバン', 'ダビガトラン', 'アスピリン', 'クロピドグレル', 'プラスグレル'].map(
    (n) => term(n, 'medication', { subcategory: '抗凝固抗血小板', riskLevel: 'critical' }),
  ),
  ...['ボノプラザン', 'エソメプラゾール', 'ランソプラゾール', 'ラベプラゾール', 'オメプラゾール', 'ファモチジン', 'レバミピド', 'モサプリド',
    '酸化マグネシウム', 'センノシド', 'ルビプロストン', 'リナクロチド', 'エロビキシバット',
  ].map((n) => term(n, 'medication', { subcategory: '胃腸', riskLevel: 'critical' })),
  ...['モンテルカスト', 'プランルカスト', 'フェキソフェナジン', 'ビラスチン', 'デスロラタジン', 'ロラタジン', 'レボセチリジン', 'エピナスチン',
    'カルボシステイン', 'アンブロキソール', 'デキストロメトルファン', 'チペピジン',
  ].map((n) => term(n, 'medication', { subcategory: '呼吸アレルギー', riskLevel: 'critical' })),
  ...['アセトアミノフェン', 'ロキソプロフェン', 'セレコキシブ'].map((n) =>
    term(n, 'medication', { subcategory: '鎮痛解熱', riskLevel: 'critical' }),
  ),
  ...['アモキシシリン', 'アモキシシリン・クラブラン酸', 'クラリスロマイシン', 'アジスロマイシン', 'レボフロキサシン', 'セフカペンピボキシル', 'セフジトレンピボキシル'].map(
    (n) => term(n, 'medication', { subcategory: '抗菌薬', riskLevel: 'critical' }),
  ),
  ...['フェブキソスタット', 'ドチヌラド', 'アロプリノール'].map((n) =>
    term(n, 'medication', { subcategory: '高尿酸', riskLevel: 'critical' }),
  ),
  term('レボチロキシン', 'medication', { subcategory: '甲状腺', riskLevel: 'critical' }),
  term('チアマゾール', 'medication', { subcategory: '甲状腺', riskLevel: 'critical' }),
  ...['アレンドロン酸', 'リセドロン酸', 'エルデカルシトール'].map((n) =>
    term(n, 'medication', { subcategory: '骨粗鬆症', riskLevel: 'critical' }),
  ),
];

/** Brand → generic aliases (STT correction only; sourceCode stays null until master import) */
const BRAND_ALIASES: Array<{ brand: string; generic: string }> = [
  { brand: 'カロナール', generic: 'アセトアミノフェン' },
  { brand: 'ロキソニン', generic: 'ロキソプロフェン' },
  { brand: 'タケキャブ', generic: 'ボノプラザン' },
  { brand: 'ネキシウム', generic: 'エソメプラゾール' },
  { brand: 'タケプロン', generic: 'ランソプラゾール' },
  { brand: 'ガスター', generic: 'ファモチジン' },
  { brand: 'ムコスタ', generic: 'レバミピド' },
  { brand: 'ムコダイン', generic: 'カルボシステイン' },
  { brand: 'アレグラ', generic: 'フェキソフェナジン' },
  { brand: 'ビラノア', generic: 'ビラスチン' },
  { brand: 'デザレックス', generic: 'デスロラタジン' },
  { brand: 'ジャヌビア', generic: 'シタグリプチン' },
  { brand: 'トラゼンタ', generic: 'リナグリプチン' },
  { brand: 'エクア', generic: 'ビルダグリプチン' },
  { brand: 'フォシーガ', generic: 'ダパグリフロジン' },
  { brand: 'ジャディアンス', generic: 'エンパグリフロジン' },
  { brand: 'リベルサス', generic: 'セマグルチド' },
  { brand: 'オゼンピック', generic: 'セマグルチド' },
  { brand: 'エリキュース', generic: 'アピキサバン' },
  { brand: 'リクシアナ', generic: 'エドキサバン' },
  { brand: 'イグザレルト', generic: 'リバーロキサバン' },
  { brand: 'プラザキサ', generic: 'ダビガトラン' },
  { brand: 'フェブリク', generic: 'フェブキソスタット' },
  { brand: 'ユリス', generic: 'ドチヌラド' },
  { brand: 'ラシックス', generic: 'フロセミド' },
];

const ABBREVIATIONS: SeedTerm[] = [
  term('高血圧', 'diagnosis', {
    aliases: [
      { alias: 'HT', aliasType: 'abbreviation' },
      { alias: 'HTN', aliasType: 'abbreviation' },
    ],
  }),
  term('糖尿病', 'diagnosis', { aliases: [{ alias: 'DM', aliasType: 'abbreviation' }] }),
  term('2型糖尿病', 'diagnosis', { aliases: [{ alias: 'T2DM', aliasType: 'abbreviation' }] }),
  term('脂質異常症', 'diagnosis', { aliases: [{ alias: 'DL', aliasType: 'abbreviation' }] }),
  term('慢性腎臓病', 'diagnosis', { aliases: [{ alias: 'CKD', aliasType: 'abbreviation' }] }),
  term('急性腎障害', 'diagnosis', { aliases: [{ alias: 'AKI', aliasType: 'abbreviation' }] }),
  term('心不全', 'diagnosis', { aliases: [{ alias: 'HF', aliasType: 'abbreviation' }] }),
  term('うっ血性心不全', 'diagnosis', { aliases: [{ alias: 'CHF', aliasType: 'abbreviation' }] }),
  term('心房細動', 'diagnosis', {
    aliases: [
      { alias: 'AF', aliasType: 'abbreviation' },
      { alias: 'Af', aliasType: 'abbreviation' },
      { alias: 'Afib', aliasType: 'abbreviation' },
    ],
  }),
  term('急性心筋梗塞', 'diagnosis', { aliases: [{ alias: 'AMI', aliasType: 'abbreviation' }] }),
  term('冠動脈疾患', 'diagnosis', { aliases: [{ alias: 'CAD', aliasType: 'abbreviation' }] }),
  term('慢性閉塞性肺疾患', 'diagnosis', { aliases: [{ alias: 'COPD', aliasType: 'abbreviation' }] }),
  term('睡眠時無呼吸症候群', 'diagnosis', {
    aliases: [
      { alias: 'SAS', aliasType: 'abbreviation' },
      { alias: 'OSAS', aliasType: 'abbreviation' },
    ],
  }),
  term('胃食道逆流症', 'diagnosis', { aliases: [{ alias: 'GERD', aliasType: 'abbreviation' }] }),
  term('過敏性腸症候群', 'diagnosis', { aliases: [{ alias: 'IBS', aliasType: 'abbreviation' }] }),
  term('尿路感染症', 'diagnosis', { aliases: [{ alias: 'UTI', aliasType: 'abbreviation' }] }),
  term('急性上気道炎', 'diagnosis', { aliases: [{ alias: 'URI', aliasType: 'abbreviation' }] }),
  term('一過性脳虚血発作', 'diagnosis', { aliases: [{ alias: 'TIA', aliasType: 'abbreviation' }] }),
];

const STT_ERRORS: SeedTerm[] = [
  term('アムロジピン', 'medication', {
    riskLevel: 'critical',
    aliases: [{ alias: 'アムロジビン', aliasType: 'stt_error' }],
  }),
  term('ムコダイン', 'medication', {
    riskLevel: 'critical',
    aliases: [
      { alias: '無効団員', aliasType: 'stt_error' },
      { alias: '無効だいん', aliasType: 'stt_error' },
    ],
  }),
  term('気管支炎', 'diagnosis', {
    aliases: [{ alias: '期間支援', aliasType: 'stt_error' }],
  }),
];

const UNITS: SeedTerm[] = [
  term('mg', 'unit', { aliases: ['ミリグラム', 'ミリ'], riskLevel: 'critical' }),
  term('g', 'unit', { aliases: ['グラム'], riskLevel: 'critical' }),
  term('μg', 'unit', { aliases: ['マイクログラム', 'ug'], riskLevel: 'critical' }),
  term('mL', 'unit', { aliases: ['ミリリットル', 'ml'], riskLevel: 'high' }),
  term('%', 'unit', { riskLevel: 'high' }),
  term('錠', 'unit', { aliases: ['錠剤', 'OD錠', '口腔内崩壊錠'], riskLevel: 'high' }),
  term('カプセル', 'unit'),
  term('散', 'unit', { aliases: ['散剤', '顆粒'] }),
  term('シロップ', 'unit'),
  term('貼付剤', 'unit', { aliases: ['テープ'] }),
  term('軟膏', 'unit'),
  term('クリーム', 'unit'),
];

const FREQUENCY: SeedTerm[] = [
  term('1日1回', 'frequency', { aliases: ['一日一回'] }),
  term('1日2回', 'frequency'),
  term('1日3回', 'frequency'),
  term('朝', 'frequency'),
  term('昼', 'frequency'),
  term('夕', 'frequency'),
  term('眠前', 'frequency', { aliases: ['就寝前'] }),
  term('食前', 'frequency'),
  term('食後', 'frequency'),
  term('朝食後', 'frequency'),
  term('夕食後', 'frequency'),
  term('毎食後', 'frequency'),
  term('頓服', 'frequency'),
];

const ACTIONS: SeedTerm[] = [
  term('開始', 'treatment_action', { aliases: ['新規開始', '処方開始'], riskLevel: 'critical' }),
  term('継続', 'treatment_action', { aliases: ['そのまま', '同量継続', '変更なし'], riskLevel: 'critical' }),
  term('中止', 'treatment_action', { aliases: ['休薬'], riskLevel: 'critical' }),
  term('増量', 'treatment_action', { riskLevel: 'critical' }),
  term('減量', 'treatment_action', { riskLevel: 'critical' }),
  term('変更', 'treatment_action', { aliases: ['切り替え', '変更予定'], riskLevel: 'critical' }),
  term('再開', 'treatment_action', { riskLevel: 'critical' }),
  term('経過観察', 'treatment_action', { aliases: ['様子を見る', '様子見で', 'フォロー'], riskLevel: 'high' }),
  term('紹介', 'treatment_action', { aliases: ['専門医紹介', '精査目的'] }),
];

const NEGATIONS: SeedTerm[] = [
  term('なし', 'negation', {
    riskLevel: 'critical',
    aliases: [
      '無い',
      'ありません',
      'ないです',
      '認めない',
      '否定',
      '陰性',
      '問題なし',
      '異常なし',
      '所見なし',
      '症状なし',
    ],
  }),
  term('あり', 'negation', {
    riskLevel: 'critical',
    aliases: ['認める', '陽性', '有り', 'あります'],
  }),
  term('改善', 'negation', { aliases: ['軽快', '消失'], riskLevel: 'high' }),
  term('悪化', 'negation', { aliases: ['増悪', '持続', '変わらない'], riskLevel: 'high' }),
];

const BODY_SIDE: SeedTerm[] = [
  term('右', 'body_side', { riskLevel: 'critical' }),
  term('左', 'body_side', { riskLevel: 'critical' }),
  term('両側', 'body_side', { riskLevel: 'critical' }),
];

function mergeBrandAliases(terms: SeedTerm[]): SeedTerm[] {
  const byName = new Map<string, SeedTerm>(
    terms.map((t) => [t.canonicalName, { ...t, aliases: [...(t.aliases ?? [])] }]),
  );
  for (const { brand, generic } of BRAND_ALIASES) {
    const existing = byName.get(generic);
    if (existing) {
      existing.aliases = [...(existing.aliases ?? []), { alias: brand, aliasType: 'brand_name' }];
    } else {
      byName.set(
        generic,
        term(generic, 'medication', {
          riskLevel: 'critical',
          aliases: [{ alias: brand, aliasType: 'brand_name' }],
        }),
      );
    }
  }
  return [...byName.values()];
}

function applyAutoSttPatches(terms: SeedTerm[]): SeedTerm[] {
  const byName = new Map<string, SeedTerm>(
    terms.map((t) => [t.canonicalName, { ...t, aliases: [...(t.aliases ?? [])] }]),
  );
  for (const p of AUTO_STT_ERROR_PATCHES) {
    const existing = byName.get(p.canonicalName);
    const alias = { alias: p.alias, aliasType: 'stt_error' as AliasType };
    if (existing) {
      const already = (existing.aliases ?? []).some((a) => a.alias === p.alias);
      if (!already) existing.aliases = [...(existing.aliases ?? []), alias];
    } else {
      byName.set(
        p.canonicalName,
        term(p.canonicalName, p.category ?? 'other', {
          riskLevel: 'critical',
          aliases: [alias],
        }),
      );
    }
  }
  return [...byName.values()];
}

export const INTERNAL_MEDICINE_SEED_TERMS: SeedTerm[] = applyAutoSttPatches(
  mergeBrandAliases([
    ...many(DIAGNOSES_CARDIO, 'diagnosis', '循環器'),
    ...many(DIAGNOSES_DM, 'diagnosis', '糖尿病代謝'),
    ...many(DIAGNOSES_RENAL, 'diagnosis', '腎臓'),
    ...many(DIAGNOSES_RESP, 'diagnosis', '呼吸器'),
    ...many(DIAGNOSES_INF, 'diagnosis', '感染症'),
    ...many(DIAGNOSES_GI, 'diagnosis', '消化器'),
    ...many(DIAGNOSES_LIVER, 'diagnosis', '肝臓'),
    ...many(DIAGNOSES_ENDO, 'diagnosis', '内分泌'),
    ...many(DIAGNOSES_BLOOD, 'diagnosis', '血液'),
    ...many(DIAGNOSES_NEURO, 'diagnosis', '神経'),
    ...many(DIAGNOSES_OTHER, 'diagnosis', 'その他'),
    ...many(SYMPTOMS, 'symptom'),
    ...VITALS,
    ...LABS,
    ...IMAGING,
    ...MEDICATIONS,
    ...ABBREVIATIONS,
    ...STT_ERRORS,
    ...UNITS,
    ...FREQUENCY,
    ...ACTIONS,
    ...NEGATIONS,
    ...BODY_SIDE,
  ]),
);
