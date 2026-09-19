import { CLINIC_CONFIG } from '../clinic-config';
import { getCareOpinion1Mock, getCareOpinion2Mock } from './scenario-care-opinion';
import { getCertificateMock } from './scenario-certificate';
import { getPrescriptionsForCase } from './scenario-prescriptions';
import type {
  ConsultationContext,
  GeneratedDocuments,
  ReferralLetterData,
} from './types';

const PATIENT_DEFAULTS: Record<string, { kana: string; address: string; phone: string; occupation: string }> = {
  'P-001': { kana: 'ヤマダ タロウ', address: '長崎県大村市西乾馬町 1-2-3', phone: '0957-50-1234', occupation: '会社員' },
  'P-002': { kana: 'サトウ ハナコ', address: '長崎県大村市東三城町 4-5-6', phone: '0957-51-5678', occupation: '主婦' },
  'P-003': { kana: 'スズキ イチロウ', address: '長崎県大村市富の原 2-8-1', phone: '090-1234-5678', occupation: '会社員' },
  'ANON-001': { kana: 'トクメイ', address: '長崎県大村市', phone: '', occupation: '' },
};

// 「先生 御机下」は雛形に印字されている。ここに入れるのは医師の氏名だけ（敬称なし）
const REFERRAL_TARGETS: Record<string, { hospital: string; department: string; doctor: string }> = {
  'P-001': { hospital: '国立病院機構長崎医療センター', department: '呼吸器内科', doctor: '' },
  'P-002': { hospital: '長崎大学病院', department: '循環器内科', doctor: '' },
  'P-003': { hospital: '長崎みなとメディカルセンター', department: '脳神経外科', doctor: '' },
  'ANON-001': { hospital: '長崎みなとメディカルセンター', department: '脳神経内科', doctor: '' },
};

/** 雛形の日付欄は西暦（例: 2026年7月10日） */
function formatJapaneseDate(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 雛形の生年月日欄はゼロ詰め（例: 2007年01月01日） */
function formatBirthDate(d?: string): string {
  if (!d) return '';
  const date = new Date(d);
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}年${mm}月${dd}日`;
}

function formatReiwaDate(d: Date): string {
  const y = d.getFullYear();
  const reiwa = y - 2018;
  return `令和 ${reiwa} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

export function buildConsultationContext(input: {
  caseCode: string;
  patientName: string;
  sex?: string | null;
  age?: number | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  memo?: string | null;
  soap: { subjective: string; objective: string; assessment: string; plan: string };
  structured?: Record<string, unknown> | null;
}): ConsultationContext {
  const defaults = PATIENT_DEFAULTS[input.caseCode] ?? PATIENT_DEFAULTS['P-002']!;
  const structured = (input.structured ?? {}) as ConsultationContext['structured'];
  return {
    caseCode: input.caseCode,
    patientName: input.patientName,
    patientNameKana: defaults.kana,
    sex: input.sex === 'F' ? '女' : input.sex === 'M' ? '男' : '—',
    age: input.age ?? null,
    dateOfBirth: input.dateOfBirth ?? undefined,
    address: defaults.address,
    phone: input.phone ?? defaults.phone,
    occupation: defaults.occupation,
    memo: input.memo ?? undefined,
    soap: input.soap,
    structured,
    issuedAt: new Date(),
  };
}

export function generateDocuments(ctx: ConsultationContext): GeneratedDocuments {
  const target = REFERRAL_TARGETS[ctx.caseCode] ?? REFERRAL_TARGETS['P-002']!;
  const certMock = getCertificateMock(ctx.caseCode);
  const co1Mock = getCareOpinion1Mock(ctx.caseCode);
  const co2Mock = getCareOpinion2Mock(ctx.caseCode);

  const diagnosis = ctx.structured.assessment ?? ctx.soap.assessment;
  const purpose =
    ctx.caseCode === 'P-002'
      ? '高血圧症の精査・加療のため紹介'
      : ctx.caseCode === 'P-003'
        ? '頭痛の精査のため紹介'
        : '精査・加療のため紹介';

  const referral: ReferralLetterData = {
    issuedDate: formatJapaneseDate(ctx.issuedAt),
    recipientHospital: target.hospital,
    recipientDepartment: target.department,
    recipientDoctor: target.doctor,
    patientName: ctx.patientName,
    patientNameKana: ctx.patientNameKana ?? '',
    sex: ctx.sex,
    postalCode: '',
    address: ctx.address ?? '',
    phone: ctx.phone ?? '',
    dateOfBirth: formatBirthDate(ctx.dateOfBirth),
    age: ctx.age,
    occupation: ctx.occupation ?? '',
    diagnosis,
    purpose,
    pastHistory: ctx.structured.pastHistory ?? '特記すべき既往歴なし',
    // 雛形の固定文（バックエンドの referral-template.ts と同じ文面）
    examResults: '別紙を同封しております。',
    clinicalCourse:
      'いつも大変お世話になっております。\n御多忙中誠に恐縮ですが、ご高診・ご加療を宜しくお願いいたします。',
    currentPrescription: (ctx.structured.medications ?? []).join('\n'),
    remarks: ctx.soap.plan,
  };

  const certificate = {
    issuedDate: formatReiwaDate(ctx.issuedAt),
    patientName: ctx.patientName,
    dateOfBirth: formatBirthDate(ctx.dateOfBirth),
    age: ctx.age,
    examDate: formatJapaneseDate(ctx.issuedAt),
    doctorDiagnosis: diagnosis,
    ...certMock,
  };

  const careOpinion1 = {
    municipalityCode: CLINIC_CONFIG.municipalityCode,
    doctorNumber: CLINIC_CONFIG.doctorNumber,
    applicationDate: formatJapaneseDate(ctx.issuedAt),
    entryDate: formatReiwaDate(ctx.issuedAt),
    patientName: ctx.patientName,
    patientNameKana: ctx.patientNameKana ?? '',
    dateOfBirth: formatBirthDate(ctx.dateOfBirth),
    age: ctx.age,
    contact: ctx.phone ?? '',
    diagnoses: [{ name: diagnosis, onsetDate: '' }],
    treatmentCourse: [ctx.soap.subjective, ctx.soap.objective, ctx.soap.plan].filter(Boolean).join('\n'),
    ...co1Mock,
  };

  const careOpinion2 = {
    municipalityCode: CLINIC_CONFIG.municipalityCode,
    entryDate: formatReiwaDate(ctx.issuedAt),
    specialNotes: [ctx.soap.assessment, ctx.soap.plan, ctx.memo].filter(Boolean).join('\n'),
    riskPolicy: ctx.soap.plan,
    ...co2Mock,
  };

  return {
    referral,
    prescription: { items: getPrescriptionsForCase(ctx.caseCode) },
    certificate,
    careOpinion1,
    careOpinion2,
  };
}
