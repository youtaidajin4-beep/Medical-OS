import { z } from 'zod';
import { GeneratedDocumentType } from '@prisma/client';
import { MedicalGlossary } from './medical-glossary.types';
import { mockScenarioContext } from './mock-scenario-context';
import { MOCK_SCENARIOS } from './mock-scenarios';

const optionalString = z.preprocess(
  (value) => (value === null || value === '' ? undefined : value),
  z.string().optional(),
);

const optionalStringArray = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.array(z.string()).optional(),
);

/**
 * 診察の会話を、SOAPを書く前に一度ここへ落とす。
 *
 * 2026-09-30、谷口先生がアプリとZoomを同じ日に使って比較された。結論は
 * 「zoomの文字起こしもアプリと大差ない。文字起こしを要約に持ってくる際の精度の違い」。
 * 文字起こしは同等で、落ちているのはこの構造化の段で合っていた。
 *
 * もとは9項目しかなく、しかも全項目が「短い事実句のみ」だった。10分の会話が
 * 9つの短句に潰れ、そこから先はSOAPを書く側も原文を見ないので、ここでこぼれたものは
 * 二度と戻らない。先生の「会話したボリュームに対して転記が乏しい」(9/25)、
 * 「30〜50%くらいの精度」(9/29) はこの構造が出していた数字。
 *
 * 足した欄は、実際に落ちたものに1対1で対応している（9/26 先生の10名分の報告より）:
 *   course           … 近藤さん「自己中止後に血圧が再上昇」が経過ごと消えた
 *   adherence        … 前川さんの服薬状況を入れる欄が無かった
 *   inClinicTests    … 小川内さんの院内検査・点滴を入れる欄が無かった
 *   guidance         … 指導した内容を入れる欄が無かった
 *   prescriptionDays … 坂井さんの処方日数を入れる欄が無かった
 *   followUpInterval … 江口さんの再診が1か月→半年に化けた。間隔を持つ欄が無く
 *                      文章に埋もれたため。欄を分けて、言われた数字だけを置く
 *   differentials    … 医師が口に出した鑑別（林さんの亜鉛・甲状腺・貧血・咳喘息）
 *   familyReport     … 江口さんの、本人の話と家族の話の区別
 *   orderedTests     … この診察で出した検査オーダー（林さんの採血項目）
 */
export const StructuredClinicalDataSchema = z.object({
  chiefComplaint: optionalString,
  presentIllness: optionalString,
  /** 前回受診以降の変化・増悪・改善。「自己中止後に再上昇」のような筋道をそのまま置く */
  course: optionalString,
  pastHistory: optionalString,
  medications: optionalStringArray,
  /** 服薬できているか、飲み忘れ・自己中止の有無 */
  adherence: optionalString,
  allergies: optionalStringArray,
  vitals: optionalString,
  physicalExam: optionalString,
  /** この診察で院内で実施した検査・処置（採血・点滴・心電図・レントゲン等） */
  inClinicTests: optionalStringArray,
  /** この診察で出した検査オーダーと、その項目 */
  orderedTests: optionalStringArray,
  /** 医師が口に出した鑑別。確定診断ではない */
  differentials: optionalStringArray,
  assessment: optionalString,
  plan: optionalString,
  /** 生活指導・説明した内容 */
  guidance: optionalString,
  /** 処方日数。医師が言った数字のみ（例「60日分」）。言われていなければ空 */
  prescriptionDays: optionalString,
  /** 再診の間隔。医師が言った表現のまま（例「1週間以内」「1か月後」）。言われていなければ空 */
  followUpInterval: optionalString,
  /**
   * 主訴以外に医師が確認した症状。
   *
   * 内科で漢方を出すときは、冷え・肩こり・便秘・睡眠・食欲をひととおり聞いて証をとる。
   * 林さんの診察ではその5つが全部会話に出ていたのに、置く欄が無く全部落ちていた
   * （実測 2026-10-01）。Zoomの要約も同じところを落としている。
   */
  reviewOfSystems: optionalStringArray,
  /** 家族・付き添いが話した内容。本人の訴えと混ぜない */
  familyReport: optionalString,
});

export type StructuredClinicalDataPayload = z.infer<typeof StructuredClinicalDataSchema>;

export type SoapStyleHints = {
  /**
   * 話者ラベル付きの文字起こし。SOAPを書く側にも会話そのものを見せる。
   *
   * 構造化データだけを渡していた頃は、SOAPを書くモデルが原文を一度も見ていなかった。
   * 構造化でこぼれた事実は、SOAPの段で取り戻す手段が無い。
   * 骨組みは構造化データ、肉付けの出典はこの原文、という二段で使う。
   */
  transcript?: string;
  revisionExamples?: string;
  /** 先生が指定した書き方（形式・文体・粒度）。事実は変えない */
  customInstruction?: string;
  greeting?: string;
  closing?: string;
  visitType?: 'ROUTINE' | 'CHECKUP';
  templateFloor?: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
};

export interface LlmProvider {
  readonly name: string;
  correctTranscript(
    transcript: string,
    glossary?: MedicalGlossary,
    consultationId?: string,
  ): Promise<string>;
  extractStructured(transcript: string, consultationId?: string): Promise<StructuredClinicalDataPayload>;
  generateSoap(
    data: StructuredClinicalDataPayload,
    consultationId?: string,
    styleHints?: SoapStyleHints,
  ): Promise<{
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  }>;
  generateClinicalNote(
    data: StructuredClinicalDataPayload,
    consultationId?: string,
    transcript?: string,
  ): Promise<string>;
  generateDocument(
    type: GeneratedDocumentType,
    system: string,
    user: string,
  ): Promise<Record<string, unknown>>;
  /**
   * いまのSOAPを、指定された書き方に書き直す。事実は足さず、削らない。
   * transcript は、書き直しの根拠（会話に無いことを書かないための出典）。
   */
  restyleSoap?(
    soap: { subjective: string; objective: string; assessment: string; plan: string },
    instruction: string,
    transcript?: string,
  ): Promise<{ subjective: string; objective: string; assessment: string; plan: string }>;
  /**
   * 診察室の会話の文ごとに、医師・患者・その他を判別する（リアルタイム書き起こし用）。
   *
   * 文の内容は変えず、ラベルだけを返す。判別できない文・件数が合わないときは unknown。
   * context は直前の流れ（「医師: …」「患者: …」の行）。
   */
  labelSpeakers?(
    sentences: string[],
    context?: string[],
  ): Promise<Array<'physician' | 'patient' | 'other' | 'unknown'>>;
  /** Optional physician consult chat (legacy). Prefer subkarteChat. */
  consultChat?(
    system: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<string>;
  /** Subkarte chat: returns JSON patches for SOAP / note / documents. */
  subkarteChat?(
    system: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    context: {
      soap: { subjective: string; objective: string; assessment: string; plan: string };
      note: string;
      documents: Record<string, unknown>;
      patientSummary?: string;
      structured?: unknown;
    },
  ): Promise<{
    reply: string;
    soapPatch?: { subjective?: string; objective?: string; assessment?: string; plan?: string };
    notePatch?: string;
    documentPatches?: Array<{ type: string; content: Record<string, unknown> }>;
    generateDocuments?:
      | 'all'
      | Array<
          | 'referral'
          | 'prescription'
          | 'certificate'
          | 'care-opinion-1'
          | 'care-opinion-2'
          | 'info-combined'
        >;
  }>;
}

function getScenario(consultationId?: string) {
  if (consultationId) {
    const fromContext = mockScenarioContext.get(consultationId);
    if (fromContext) return fromContext;
  }
  return MOCK_SCENARIOS['P-001']!;
}

export class MockLlmProvider implements LlmProvider {
  readonly name = 'mock';

  async correctTranscript(transcript: string, _glossary?: MedicalGlossary, _consultationId?: string) {
    return transcript;
  }

  async extractStructured(_transcript: string, consultationId?: string): Promise<StructuredClinicalDataPayload> {
    return getScenario(consultationId).structured;
  }

  async generateSoap(
    data: StructuredClinicalDataPayload,
    _consultationId?: string,
    styleHints?: import('./llm.provider').SoapStyleHints,
  ) {
    const floor = styleHints?.templateFloor;
    const visitType = styleHints?.visitType ?? 'ROUTINE';
    const hasChief = Boolean(data.chiefComplaint?.trim());
    const hasExam = Boolean(data.physicalExam?.trim() || data.vitals?.trim());
    const hasAssessment = Boolean(data.assessment?.trim());
    const hasPlan = Boolean(data.plan?.trim());

    const subjective = hasChief
      ? [
          data.chiefComplaint,
          data.presentIllness,
          data.course,
          ...(data.reviewOfSystems ?? []),
          data.adherence,
          data.familyReport,
        ]
          .filter(Boolean)
          .join('\n')
      : floor?.subjective ?? '';
    const objective = hasExam
      ? [data.vitals, data.physicalExam, ...(data.inClinicTests ?? [])].filter(Boolean).join('\n')
      : floor?.objective ?? '';

    let assessment = hasAssessment ? (data.assessment ?? '') : floor?.assessment ?? '';
    let plan = hasPlan ? (data.plan ?? '') : floor?.plan ?? '';
    if (hasPlan) {
      plan = [
        plan,
        ...(data.orderedTests ?? []),
        data.guidance,
        data.prescriptionDays,
        data.followUpInterval,
      ]
        .filter(Boolean)
        .join('\n');
    }
    if (visitType === 'CHECKUP' && !hasAssessment) assessment = '';
    if (visitType === 'CHECKUP' && !hasPlan) plan = '';

    return { subjective, objective, assessment, plan };
  }

  async generateClinicalNote(
    data: StructuredClinicalDataPayload,
    _consultationId?: string,
    _transcript?: string,
  ) {
    return [
      data.chiefComplaint && `【主訴】${data.chiefComplaint}`,
      data.presentIllness && `【現病歴】${data.presentIllness}`,
      data.course && `【経過】${data.course}`,
      data.reviewOfSystems?.length && `【その他の症状】${data.reviewOfSystems.join('、')}`,
      data.pastHistory && `【既往歴】${data.pastHistory}`,
      data.adherence && `【服薬状況】${data.adherence}`,
      data.physicalExam && `【所見】${data.physicalExam}`,
      data.inClinicTests?.length && `【院内で実施】${data.inClinicTests.join('、')}`,
      data.differentials?.length && `【鑑別】${data.differentials.join('、')}`,
      data.assessment && `【評価】${data.assessment}`,
      data.plan && `【方針】${data.plan}`,
      data.orderedTests?.length && `【検査オーダー】${data.orderedTests.join('、')}`,
      data.guidance && `【指導】${data.guidance}`,
      data.prescriptionDays && `【処方日数】${data.prescriptionDays}`,
      data.followUpInterval && `【再診】${data.followUpInterval}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  async generateDocument(
    type: GeneratedDocumentType,
    _system: string,
    _user: string,
  ): Promise<Record<string, unknown>> {
    const scenario = getScenario();
    const diagnosis = scenario.structured.assessment ?? '';
    const issuedDate = new Date().toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    switch (type) {
      case GeneratedDocumentType.REFERRAL:
        // 患者欄・発行日・固定文は DocumentsService が雛形どおりに埋めるので、
        // モックも医師がチャットで話す項目と宛先だけを返す
        return {
          recipientHospital: '長崎みなとメディカルセンター',
          recipientDepartment: '脳神経外科',
          recipientDoctor: '',
          diagnosis,
          purpose: '',
          pastHistory: scenario.structured.pastHistory ?? '',
          currentPrescription: (scenario.structured.medications ?? []).join('\n'),
          remarks: '',
        };
      case GeneratedDocumentType.PRESCRIPTION_LIST:
        return {
          items: (scenario.structured.medications ?? []).map((name, i) => ({
            index: i + 1,
            name,
            dosePerTake: '—',
            dailyDose: '—',
            days: '—',
            frequency: '—',
            prescribedDate: issuedDate,
          })),
        };
      case GeneratedDocumentType.MEDICAL_CERTIFICATE:
        // 住所・氏名・日付・医療機関は DocumentsService が様式どおりに埋める。
        // 数値は検査結果が無ければ空欄（モックでも作らない）
        return {
          examDate: '',
          interview: scenario.structured.pastHistory ?? '',
          smokingMedication: '',
          symptoms: scenario.structured.chiefComplaint ?? '',
          height: { value: '', judgement: '' },
          weight: { value: '', judgement: '' },
          waist: { value: '', judgement: '' },
          bmi: { value: '', judgement: '' },
          hearing: { right1000: '', right4000: '', left1000: '', left4000: '', judgement: '' },
          vision: { right: '', rightCorrected: '', left: '', leftCorrected: '', judgement: '' },
          bloodPressure: { systolic: '', diastolic: '', judgement: '' },
          pulse: { rate: '', rhythm: '', judgement: '' },
          urinalysis: { glucose: '', protein: '', judgement: '' },
          chestXray: {
            abnormality: '',
            abnormalityDetail: '',
            tuberculosis: '',
            tuberculosisDetail: '',
            judgement: '',
          },
          ecg: { abnormality: '', abnormalityDetail: '', judgement: '' },
          remarks: '',
          doctorDiagnosis: diagnosis,
          overallJudgement: '',
        };
      case GeneratedDocumentType.CARE_OPINION_1:
        // コード・日付・申請者欄は DocumentsService が様式どおりに埋めるので、
        // モックも医師が判断する項目だけを返す
        return {
          diagnoses: [{ name: diagnosis, onsetDate: '' }],
          stability: 'stable',
          instabilityDetail: '',
          courseAndTreatment: scenario.structured.presentIllness ?? '',
          opinionCount: 'first',
          otherDepartmentVisit: '',
          otherDepartments: [],
          procedures: [],
          specialResponses: [],
          incontinenceResponses: [],
          adlLevel: '自立',
          dementiaLevel: '自立',
          shortTermMemory: '問題なし',
          decisionCapacity: '自立',
          communicationAbility: '伝えられる',
          peripheralPresence: 'none',
          peripheralSymptoms: [],
          psychSymptomPresence: 'none',
        };
      case GeneratedDocumentType.CARE_OPINION_2:
        return {
          dominantHand: 'right',
          height: '',
          weight: '',
          weightChange: 'maintain',
          outdoorWalking: '自立',
          wheelchair: '用いていない',
          eating: '自立ないし何とか自分で食べられる',
          nutritionState: '良好',
          risks: [],
          riskPolicy: scenario.structured.plan ?? '',
          serviceOutlook: 'expected',
          medicalManagement: [],
          precautions: {
            bloodPressure: { none: true, detail: '' },
            movement: { none: true, detail: '' },
            eating: { none: true, detail: '' },
            exercise: { none: true, detail: '' },
            swallowing: { none: true, detail: '' },
            other: '',
          },
          infection: { state: 'none', detail: '' },
          specialNotes: diagnosis,
        };
      case GeneratedDocumentType.INFO_PROVIDE_COMBINED: {
        const referral = await this.generateDocument(
          GeneratedDocumentType.REFERRAL,
          _system,
          _user,
        );
        const prescription = await this.generateDocument(
          GeneratedDocumentType.PRESCRIPTION_LIST,
          _system,
          _user,
        );
        return { referral, prescription, combinedNote: '' };
      }
      default:
        return {};
    }
  }

  async consultChat(
    _system: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<string> {
    const last = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    return `（モック）「${last.slice(0, 40)}」を記録しました。`;
  }

  async subkarteChat(
    _system: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    context: {
      soap: { subjective: string; objective: string; assessment: string; plan: string };
      note: string;
      documents: Record<string, unknown>;
    },
  ) {
    const last = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const wantsGenerate = /作って|作成して|生成|資料|書類を全部|全部作/.test(last);
    if (wantsGenerate) {
      const types: Array<
        | 'referral'
        | 'prescription'
        | 'certificate'
        | 'care-opinion-1'
        | 'care-opinion-2'
        | 'info-combined'
      > = [];
      if (/紹介状/.test(last)) types.push('referral');
      if (/処方/.test(last)) types.push('prescription');
      if (/診断書/.test(last)) types.push('certificate');
      const generateDocuments = types.length ? types : ('all' as const);
      const matches = [...last.matchAll(/([^\s「」をにへ]+(?:病院|クリニック|医院))/g)];
      const recipientHospital = matches.at(-1)?.[1];
      return {
        reply: recipientHospital
          ? `${recipientHospital}向けに書類を作成します。`
          : '書類を作成します。',
        generateDocuments,
        documentPatches: recipientHospital
          ? [
              {
                type: 'referral',
                content: { ...(context.documents.referral ?? {}), recipientHospital },
              },
            ]
          : undefined,
      };
    }
    const editLike = /修正|変更|追記|直して|にして|Assessment|assessment|Plan|plan|紹介状|宛先|処方/.test(
      last,
    );
    if (!editLike) {
      return {
        reply: '記録しました。書類を作るときや修正指示のときに反映します。',
      };
    }
    if (/Assessment|assessment|評価/.test(last)) {
      return {
        reply: 'Assessment を更新しました。',
        soapPatch: {
          assessment: `${context.soap.assessment}\n${last}`.trim(),
        },
      };
    }
    if (/紹介状|宛先/.test(last)) {
      const matches = [...last.matchAll(/([^\s「」をにへ]+(?:病院|クリニック|医院))/g)];
      const recipientHospital = matches.at(-1)?.[1] ?? '要確認（紹介先）';
      const existing = context.documents.referral ?? {};
      return {
        reply: `紹介状の宛先を「${recipientHospital}」に更新しました。`,
        documentPatches: [{ type: 'referral', content: { ...existing, recipientHospital } }],
      };
    }
    return {
      reply: '記録し、Plan に反映しました。',
      soapPatch: {
        plan: `${context.soap.plan}\n${last}`.trim(),
      },
    };
  }
}
