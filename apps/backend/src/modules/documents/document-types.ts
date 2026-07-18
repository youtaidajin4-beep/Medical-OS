import { GeneratedDocumentType } from '@prisma/client';
import { StructuredClinicalDataPayload } from '../../providers/ai/llm.provider';
import { PhysicianRules } from '../settings/physician-rules.types';

export type DocumentGenerationContext = {
  consultationId: string;
  caseCode: string;
  patientName: string;
  patientNameKana?: string;
  sex: string;
  age: number | null;
  dateOfBirth?: string;
  address?: string;
  phone?: string;
  occupation?: string;
  memo?: string;
  soap: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  structured: StructuredClinicalDataPayload;
  physicianRules: PhysicianRules;
  revisionExamples: string;
};

export const GENERATED_DOCUMENT_TYPES: GeneratedDocumentType[] = [
  GeneratedDocumentType.REFERRAL,
  GeneratedDocumentType.PRESCRIPTION_LIST,
  GeneratedDocumentType.MEDICAL_CERTIFICATE,
  GeneratedDocumentType.CARE_OPINION_1,
  GeneratedDocumentType.CARE_OPINION_2,
  GeneratedDocumentType.INFO_PROVIDE_COMBINED,
];

export const FRONTEND_DOC_TYPE_MAP: Record<GeneratedDocumentType, string> = {
  REFERRAL: 'referral',
  PRESCRIPTION_LIST: 'prescription',
  MEDICAL_CERTIFICATE: 'certificate',
  CARE_OPINION_1: 'care-opinion-1',
  CARE_OPINION_2: 'care-opinion-2',
  INFO_PROVIDE_COMBINED: 'info-combined',
};

export const BACKEND_DOC_TYPE_MAP: Record<string, GeneratedDocumentType> = {
  referral: GeneratedDocumentType.REFERRAL,
  prescription: GeneratedDocumentType.PRESCRIPTION_LIST,
  certificate: GeneratedDocumentType.MEDICAL_CERTIFICATE,
  'care-opinion-1': GeneratedDocumentType.CARE_OPINION_1,
  'care-opinion-2': GeneratedDocumentType.CARE_OPINION_2,
  'info-combined': GeneratedDocumentType.INFO_PROVIDE_COMBINED,
};
