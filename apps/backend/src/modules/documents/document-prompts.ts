import { GeneratedDocumentType } from '@prisma/client';
import { rulesToPromptSection } from '../settings/physician-rules.types';
import { DocumentGenerationContext } from './document-types';

const BASE_RULES = `あなたは日本のクリニック向け医療書類作成アシスタントです。
構造化診療データとSOAPに含まれる事実のみを使用してください。
推測・新規診断・未記載の検査値や薬剤を追加しないでください。
不明な項目は空文字または「要確認」としてください。
診療文脈を理解し、単語の羅列ではなく読みやすい医学文書にしてください。
文体は丁寧な紹介状・診療情報提供書として、カルテにそのまま使える表現を心がけてください。`;

function contextBlock(ctx: DocumentGenerationContext): string {
  return `患者: ${ctx.patientName}（${ctx.sex}、${ctx.age ?? '—'}歳）
症例コード: ${ctx.caseCode}
SOAP:
S: ${ctx.soap.subjective}
O: ${ctx.soap.objective}
A: ${ctx.soap.assessment}
P: ${ctx.soap.plan}
構造化データ: ${JSON.stringify(ctx.structured, null, 2)}
${rulesToPromptSection(ctx.physicianRules)}
${ctx.revisionExamples ? `\n医師の過去の修正例（文体参考）:\n${ctx.revisionExamples}` : ''}`;
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
現在の処方一覧を作成します。構造化データのmedicationsから処方を抽出してください。`,
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
診断書を作成します。健診・診断書形式で、記載可能な所見のみを含めてください。`,
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
