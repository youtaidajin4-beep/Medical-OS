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

export const StructuredClinicalDataSchema = z.object({
  chiefComplaint: optionalString,
  presentIllness: optionalString,
  pastHistory: optionalString,
  medications: optionalStringArray,
  allergies: optionalStringArray,
  vitals: optionalString,
  physicalExam: optionalString,
  assessment: optionalString,
  plan: optionalString,
});

export type StructuredClinicalDataPayload = z.infer<typeof StructuredClinicalDataSchema>;

export type SoapStyleHints = {
  revisionExamples?: string;
  greeting?: string;
  closing?: string;
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
  generateClinicalNote(data: StructuredClinicalDataPayload, consultationId?: string): Promise<string>;
  generateDocument(
    type: GeneratedDocumentType,
    system: string,
    user: string,
  ): Promise<Record<string, unknown>>;
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
      documents: Record<string, Record<string, unknown>>;
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
    _styleHints?: import('./llm.provider').SoapStyleHints,
  ) {
    return {
      subjective: `主訴: ${data.chiefComplaint ?? ''}\n現病歴: ${data.presentIllness ?? ''}`,
      objective: [data.vitals, data.physicalExam].filter(Boolean).join('\n'),
      assessment: data.assessment ?? '',
      plan: data.plan ?? '',
    };
  }

  async generateClinicalNote(data: StructuredClinicalDataPayload, _consultationId?: string) {
    return [
      data.chiefComplaint && `【主訴】${data.chiefComplaint}`,
      data.presentIllness && `【現病歴】${data.presentIllness}`,
      data.pastHistory && `【既往歴】${data.pastHistory}`,
      data.physicalExam && `【所見】${data.physicalExam}`,
      data.assessment && `【評価】${data.assessment}`,
      data.plan && `【方針】${data.plan}`,
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
        return {
          issuedDate,
          recipientHospital: '長崎みなとメディカルセンター',
          recipientDepartment: '脳神経外科',
          recipientDoctor: '御机下',
          patientName: '患者',
          patientNameKana: 'カンジャ',
          sex: '—',
          address: '長崎県大村市',
          phone: '',
          dateOfBirth: '',
          age: null,
          occupation: '',
          diagnosis,
          purpose: '精査・加療のため紹介',
          pastHistory: scenario.structured.pastHistory ?? '',
          examResults: '別紙を同封しております。',
          clinicalCourse: scenario.structured.presentIllness ?? '',
          greeting: '',
          remarks: scenario.structured.plan ?? '',
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
        return {
          issuedDate,
          patientName: '患者',
          dateOfBirth: '',
          age: null,
          examDate: issuedDate,
          interview: scenario.structured.presentIllness ?? '',
          smokingMeds: '',
          symptoms: scenario.structured.chiefComplaint ?? '',
          height: '',
          weight: '',
          waist: '',
          bmi: '',
          hearing: '',
          vision: '',
          bloodPressure: scenario.structured.vitals ?? '',
          pulse: '',
          urinalysis: '',
          chestXray: '',
          ecg: '',
          bloodTests: '',
          doctorDiagnosis: diagnosis,
          overallGrade: '要確認',
          remarks: scenario.structured.plan ?? '',
        };
      case GeneratedDocumentType.CARE_OPINION_1:
        return {
          municipalityCode: '422041',
          doctorNumber: '12345',
          applicationDate: issuedDate,
          entryDate: issuedDate,
          patientName: '患者',
          patientNameKana: 'カンジャ',
          dateOfBirth: '',
          age: null,
          contact: '',
          diagnoses: [{ name: diagnosis, onsetDate: '' }],
          stability: 'unknown',
          treatmentCourse: scenario.structured.presentIllness ?? '',
          independencePhysical: '要確認',
          independenceCognitive: '要確認',
          specialMedicalCare: [],
          coreSymptoms: {},
          peripheralSymptoms: [],
          otherPsychSymptoms: '',
        };
      case GeneratedDocumentType.CARE_OPINION_2:
        return {
          municipalityCode: '422041',
          entryDate: issuedDate,
          dominantHand: 'right',
          height: '',
          weight: '',
          weightChange: 'maintain',
          physicalImpairments: [],
          mobility: [],
          nutrition: '要確認',
          risks: [],
          riskPolicy: scenario.structured.plan ?? '',
          serviceOutlook: '',
          medicalManagement: [],
          servicePrecautions: '',
          infectiousDisease: '',
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
      documents: Record<string, Record<string, unknown>>;
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
