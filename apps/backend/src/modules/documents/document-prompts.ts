import { GeneratedDocumentType } from '@prisma/client';
import { rulesToPromptSection } from '../settings/physician-rules.types';
import { DocumentGenerationContext } from './document-types';
import {
  knowledgePackDocumentHint,
  knowledgePackSafetyRules,
} from '../medical-knowledge/data/load-knowledge-pack';

const BASE_RULES = `あなたは日本のクリニック向け医療書類作成アシスタントです。
SOAP・構造化データ・医師サブカルテ・問診票・診察時の会話記録を使います。

情報の優先順位:
1. 医師サブカルテ（疑い・方針・処方意図の正。SOAPより優先）
2. SOAP・構造化データ
3. 問診票（既往歴・服薬・アレルギー・生活歴の転記元として積極的に使う）
4. 会話記録（SOAPに載っていない経過・数値・訴えの詳細を補完する。会話に出た事実のみ使用可）

厳守事項:
- 推測で新規診断や未記載の検査値を作らない（サブカルテに医師が書いた内容は採用可）
- 患者氏名・生年月日・年齢・日付は与えられた情報を一字一句正確に転記する
- 発行日・記入日には「本日の日付」を使う
- 不明な項目は空文字または「要確認」とする
- 空欄を埋めるためだけの創作は禁止。ただし SOAP・問診票・会話記録に根拠がある情報は漏らさず反映する
- 薬剤名・用量・単位・アレルギー・検査値・左右・陽性陰性・中止/継続は高精度に転記し、数値の桁違い補正はしない

文章品質:
- 診療文脈を理解し、単語の羅列ではなく読みやすい医学文書にする
- 文体は丁寧な紹介状・診療情報提供書として、カルテにそのまま使える表現にする
- 出力前に全フィールドを自己点検する: 誤字脱字・仮名遣いの誤り・薬剤名や病名の誤変換（例: 気管支炎を期間支援と書くなど）・数値や単位の転記ミスがないこと
- 薬剤名は正式名称（一般名または先発品名）で正確に表記し、用法用量の単位（mg、錠、回、日）を正しく書く
- 商品名が出た場合は可能なら一般名も併記してよい（例: ムコダイン＝カルボシステイン）`;

function contextBlock(ctx: DocumentGenerationContext): string {
  const patternHint =
    ctx.referralPattern === 'complex'
      ? `\n紹介パターン: 複雑紹介。10年分の経過・複数疾患・不定愁訴・既往を、経過／既往／現症／依頼事項の順で A4 一枚に綺麗に要約すること。冗長な羅列は禁止。`
      : `\n紹介パターン: 簡単紹介。診断と依頼事項を短く明確に（例: 肺炎→入院お願いします）。`;
  const subkarte = ctx.physicianSubkarte.trim()
    ? `\n医師サブカルテ（処方・疑い・方針の正・SOAPより優先）:\n${ctx.physicianSubkarte}`
    : `\n医師サブカルテ: （なし）`;
  const patientDetail = [
    ctx.dateOfBirth ? `生年月日: ${ctx.dateOfBirth.slice(0, 10)}` : '',
    ctx.phone ? `電話: ${ctx.phone}` : '',
    ctx.address ? `住所: ${ctx.address}` : '',
    ctx.memo ? `患者メモ: ${ctx.memo}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const questionnaire = ctx.questionnaireText
    ? `\n問診票（既往・服薬・アレルギー等の転記元）:\n${ctx.questionnaireText}`
    : '';
  const transcript = ctx.transcriptExcerpt
    ? `\n診察時の会話記録（補正済み・SOAPにない詳細の補完用）:\n${ctx.transcriptExcerpt}`
    : '';
  const knowledgeHint = knowledgePackDocumentHint();
  const safety = knowledgePackSafetyRules();
  return `本日の日付: ${ctx.todayJa}
患者: ${ctx.patientName}（${ctx.sex}、${ctx.age ?? '—'}歳）
症例コード: ${ctx.caseCode}${patientDetail ? `\n${patientDetail}` : ''}
SOAP:
S: ${ctx.soap.subjective}
O: ${ctx.soap.objective}
A: ${ctx.soap.assessment}
P: ${ctx.soap.plan}${subkarte}${questionnaire}
構造化データ: ${JSON.stringify(ctx.structured, null, 2)}${transcript}
${knowledgeHint}
${safety.length ? `安全ルール再掲:\n${safety.map((r) => `- ${r}`).join('\n')}` : ''}
${rulesToPromptSection(ctx.physicianRules)}
${ctx.revisionExamples ? `\n医師の過去の修正例（文体参考）:\n${ctx.revisionExamples}` : ''}${patternHint}`;
}

const PROMPTS: Record<GeneratedDocumentType, { system: string; schema: string }> = {
  REFERRAL: {
    system: `${BASE_RULES}
紹介状（診療情報提供書）を作成します。紹介先・紹介理由・経過・依頼事項を診療文脈に沿って記載してください。
例: 頭痛→脳梗塞疑い→脳外科紹介のように、臨床の流れが伝わること。`,
    schema: `{
  "issuedDate": "令和X年X月X日形式",
  "recipientHospital": "紹介先病院",
  "recipientDepartment": "診療科",
  "recipientDoctor": "御机下",
  "patientName": "患者氏名",
  "patientNameKana": "カナ",
  "sex": "男/女",
  "address": "住所",
  "phone": "電話",
  "dateOfBirth": "生年月日",
  "age": 数値またはnull,
  "occupation": "職業",
  "diagnosis": "診断名・病名",
  "purpose": "紹介目的・紹介理由",
  "pastHistory": "既往歴",
  "examResults": "検査結果",
  "clinicalCourse": "経過・現病歴の要約",
  "greeting": "挨拶文",
  "remarks": "依頼事項・備考"
}`,
  },
  PRESCRIPTION_LIST: {
    system: `${BASE_RULES}
現在の処方一覧を作成します。構造化データのmedicationsと医師サブカルテの処方意図から処方を抽出してください。`,
    schema: `{
  "items": [{
    "index": 1,
    "name": "薬剤名",
    "dosePerTake": "1回量",
    "dailyDose": "1日量",
    "days": "日数",
    "frequency": "用法",
    "note": "備考（任意）",
    "prescribedDate": "処方日"
  }]
}`,
  },
  MEDICAL_CERTIFICATE: {
    system: `${BASE_RULES}
健康診断結果表を作成します。健診・結果表形式で、記載可能な所見のみを含めてください。タイトルは「健康診断結果表」です。`,
    schema: `{
  "issuedDate": "令和X年X月X日",
  "patientName": "氏名",
  "dateOfBirth": "生年月日",
  "age": 数値またはnull,
  "examDate": "診察日",
  "interview": "問診",
  "smokingMeds": "喫煙・服薬",
  "symptoms": "症状",
  "height": "", "weight": "", "waist": "", "bmi": "",
  "hearing": "", "vision": "", "bloodPressure": "", "pulse": "",
  "urinalysis": "", "chestXray": "", "ecg": "", "bloodTests": "",
  "doctorDiagnosis": "医師の診断",
  "overallGrade": "総合判定",
  "remarks": "備考"
}`,
  },
  CARE_OPINION_1: {
    system: `${BASE_RULES}
介護保険の主治医意見書（1）を作成します。`,
    schema: `{
  "municipalityCode": "市町村番号",
  "doctorNumber": "医師番号",
  "applicationDate": "申請日",
  "entryDate": "記入日",
  "patientName": "氏名",
  "patientNameKana": "カナ",
  "dateOfBirth": "生年月日",
  "age": 数値またはnull,
  "contact": "連絡先",
  "diagnoses": [{"name": "病名", "onsetDate": "発症日"}],
  "stability": "stable|unstable|unknown",
  "treatmentCourse": "治療経過",
  "independencePhysical": "身体機能",
  "independenceCognitive": "認知機能",
  "specialMedicalCare": ["特別な医療"],
  "coreSymptoms": {"key": "value"},
  "peripheralSymptoms": ["周辺症状"],
  "otherPsychSymptoms": "その他"
}`,
  },
  CARE_OPINION_2: {
    system: `${BASE_RULES}
介護保険の主治医意見書（2）を作成します。`,
    schema: `{
  "municipalityCode": "市町村番号",
  "entryDate": "記入日",
  "dominantHand": "right|left",
  "height": "", "weight": "",
  "weightChange": "increase|maintain|decrease",
  "physicalImpairments": ["身体障害"],
  "mobility": ["移動"],
  "nutrition": "栄養",
  "risks": ["リスク"],
  "riskPolicy": "リスク対応",
  "serviceOutlook": "サービス見通し",
  "medicalManagement": ["医学的管理"],
  "servicePrecautions": "サービス留意点",
  "infectiousDisease": "感染症",
  "specialNotes": "特記事項"
}`,
  },
  INFO_PROVIDE_COMBINED: {
    system: `${BASE_RULES}
診療情報提供書と現在の処方を1つの文書にまとめます。上部に紹介状、下部に処方一覧を含めてください。`,
    schema: `{
  "referral": { 紹介状と同じフィールド },
  "prescription": { "items": [処方と同じ] },
  "combinedNote": "統合文書の補足（任意）"
}`,
  },
};

export function buildDocumentPrompt(
  type: GeneratedDocumentType,
  ctx: DocumentGenerationContext,
): { system: string; user: string } {
  const prompt = PROMPTS[type];
  return {
    system: prompt.system,
    user: `${contextBlock(ctx)}\n\n次のJSONスキーマに従って${type}の内容を生成:\n${prompt.schema}`,
  };
}
