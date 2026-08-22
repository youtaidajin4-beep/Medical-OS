'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  CheckCircle2,
  ClipboardCopy,
  ClipboardList,
  FileHeart,
  FileText,
  ImageIcon,
  MessageCircle,
  Mic,
  Pill,
  Plus,
  Printer,
  Sparkles,
  Square,
  Stethoscope,
  UserPlus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { buildConsultationContext, generateDocuments } from '@/lib/mock-documents/generate-documents';
import type {
  DocumentTypeId,
  GeneratedDocuments,
  PrescriptionListData,
  ReferralLetterData,
  SoapData,
} from '@/lib/mock-documents/types';
import { ReferralLetter } from '@/components/documents/referral-letter';
import { PrescriptionList } from '@/components/documents/prescription-list';
import { InfoProvideCombined } from '@/components/documents/info-provide-combined';
import { MedicalCertificate } from '@/components/documents/medical-certificate';
import { CareOpinion1 } from '@/components/documents/care-opinion-1';
import { CareOpinion2 } from '@/components/documents/care-opinion-2';
import '@/styles/documents-print.css';

type Phase = 'idle' | 'recording' | 'processing' | 'review';
type ReviewTab = 'soap' | 'docs';
type ChatMsg = { id: string; role: 'user' | 'ai'; text: string };
type Sex = 'M' | 'F' | '';

type DemoPatient = {
  id: string;
  name: string;
  nameKana: string;
  sex: Sex;
  age: number;
  dateOfBirth: string;
  phone: string;
  address: string;
  occupation: string;
  memo: string;
  questionnairePhoto?: string;
  questionnaireText?: string;
};

type PatientForm = {
  name: string;
  nameKana: string;
  sex: Sex;
  dateOfBirth: string;
  phone: string;
  address: string;
  occupation: string;
  memo: string;
};

const EMPTY_FORM: PatientForm = {
  name: '',
  nameKana: '',
  sex: '',
  dateOfBirth: '',
  phone: '',
  address: '',
  occupation: '',
  memo: '',
};

const YAMADA: DemoPatient = {
  id: 'p-yamada',
  name: '山田 太郎',
  nameKana: 'ヤマダ タロウ',
  sex: 'M',
  age: 68,
  dateOfBirth: '1958-03-12',
  phone: '0957-50-2211',
  address: '長崎県大村市杭出津1-12-8',
  occupation: '無職（元会社員）',
  memo: '高血圧・2型糖尿病で通院中',
};

const DEMO_LINES = [
  { speaker: '先生', text: '今日はどうされましたか。いつもの薬の調子はいかがですか。' },
  { speaker: '患者', text: '特に変わりはないです。薬は朝に飲んでます。たまに頭がぼっとすることはありますけど。' },
  { speaker: '先生', text: 'わかりました。では血圧の薬、アムロジピンはそのまま継続でいきましょう。量も今のままで大丈夫です。' },
  { speaker: '患者', text: 'はい。胸が苦しいとかは特にないです。' },
  { speaker: '先生', text: '胸痛はありませんね。息切れもありませんね。歩くときに胸が締めつけられる感じもありませんか。' },
  { speaker: '患者', text: 'それはないです。普通に歩いてます。' },
  {
    speaker: '先生',
    text: 'よかったです。糖尿病のほうですが、前回の HbA1c は 7.2 でした。食事と運動も今まで通り続けてください。',
  },
  { speaker: '患者', text: 'わかりました。甘いものはできるだけ控えてます。' },
  {
    speaker: '先生',
    text: 'メトホルミンも継続です。低血糖みたいな、急に汗が出る・手が震える、といったことはありませんか。',
  },
  { speaker: '患者', text: 'それはないですね。あ、あと最近少し便秘気味かな、くらいです。' },
  {
    speaker: '先生',
    text: '便秘は様子を見て、ひどければまた相談してください。今日は大きな変更なしで、今の薬を続けます。何か他に気になることはありますか。',
  },
  { speaker: '患者', text: '大丈夫です。お願いします。' },
  { speaker: '先生', text: 'ではまた1か月後に拝見します。今日もお疲れさまでした。' },
] as const;

const DEMO_SOAP: SoapData = {
  subjective:
    '再診。特変なし。朝に内服継続。時に頭がぼっとすることがある。胸痛・息切れ・歩行時の胸部圧迫感なし。甘いものは控えている。低血糖症状なし。軽度の便秘気味。',
  objective: '高血圧・2型糖尿病で通院中。前回 HbA1c 7.2%。',
  assessment: '高血圧、2型糖尿病。現状安定。狭心症を積極的に疑う所見なし。',
  plan: 'アムロジピン同量継続。メトホルミン継続。食事・運動継続。便秘は経過観察。紹介不要。1か月後再診。',
};

const DOC_TABS: Array<{ id: DocumentTypeId; label: string; icon: typeof FileText }> = [
  { id: 'referral', label: '診療情報提供書', icon: FileText },
  { id: 'prescription', label: '現在の処方', icon: Pill },
  { id: 'info-combined', label: '情報提供書＋処方', icon: ClipboardList },
  { id: 'certificate', label: '健康診断結果表', icon: Stethoscope },
  { id: 'care-opinion-1', label: '主治医意見書①', icon: FileHeart },
  { id: 'care-opinion-2', label: '主治医意見書②', icon: FileHeart },
];

function todayJa() {
  return new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ageFromDob(dob: string) {
  if (!dob) return 0;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return Math.max(0, age);
}

function sexLabel(sex: Sex) {
  if (sex === 'M') return '男';
  if (sex === 'F') return '女';
  return '—';
}

function hospitalFromText(text: string) {
  const m = [...text.matchAll(/([^\s「」をにへ、。]+(?:病院|クリニック|医院|センター))/g)];
  return m.at(-1)?.[1];
}

function soapFromQuestionnaire(base: SoapData, patient: DemoPatient): SoapData {
  if (!patient.questionnaireText) return base;
  const extra = `【問診票】${patient.questionnaireText}`;
  if (base.subjective.includes('問診票')) return base;
  return {
    ...base,
    subjective: `${extra}\n${base.subjective}`,
    objective: patient.memo ? `${base.objective} ${patient.memo}` : base.objective,
  };
}

function mockQuestionnaire(patient: DemoPatient) {
  const name = patient.name || '山田 太郎';
  const kana = patient.nameKana || 'ヤマダ タロウ';
  const sex = patient.sex || 'M';
  const age = patient.age || 68;
  const dob = patient.dateOfBirth || '1958-03-12';
  const phone = patient.phone || '0957-50-2211';
  const address = patient.address || '長崎県大村市杭出津1-12-8';
  const narrative = [
    `主訴: 高血圧・糖尿病の定期受診。時々頭がぼっとする。胸痛なし。便秘気味。`,
    `既往歴: 高血圧、2型糖尿病`,
    `内服: アムロジピン5mg 朝食後 / メトホルミン250mg 朝夕食後`,
    `アレルギー: なし`,
  ].join('\n');
  return {
    name,
    nameKana: kana,
    sex,
    age,
    dateOfBirth: dob,
    phone,
    address,
    occupation: patient.occupation || (sex === 'M' ? '無職（元会社員）' : ''),
    memo: '高血圧・2型糖尿病で通院中',
    narrative,
  };
}

function buildDemoDocs(
  patient: DemoPatient,
  soap: SoapData,
  note: string,
  hospital?: string,
): GeneratedDocuments {
  const ctx = buildConsultationContext({
    caseCode: 'P-002',
    patientName: patient.name,
    sex: patient.sex || 'M',
    age: patient.age || 68,
    dateOfBirth: patient.dateOfBirth || undefined,
    phone: patient.phone || undefined,
    memo: [patient.memo, patient.questionnaireText, note].filter(Boolean).join('\n') || null,
    soap,
  });
  const generated = generateDocuments(ctx);
  const male = patient.sex !== 'F';
  const height = male ? '168' : '158';
  const weight = male ? '70' : '62';
  const bmi = male ? '24.8' : '24.8';
  const kana = patient.nameKana || generated.referral.patientNameKana;
  const phone = patient.phone || generated.referral.phone;
  const address = patient.address || generated.referral.address;
  const occupation = patient.occupation || generated.referral.occupation;
  const age = patient.age || generated.referral.age;
  const prescription: PrescriptionListData = {
    items: [
      {
        index: 1,
        name: 'アムロジピン 5mg',
        dosePerTake: '1錠',
        dailyDose: '1日1回',
        days: '28日分',
        frequency: '朝食後',
        note: '同量継続',
        prescribedDate: todayJa(),
      },
      {
        index: 2,
        name: 'メトホルミン塩酸塩 250mg',
        dosePerTake: '1錠',
        dailyDose: '1日2回',
        days: '28日分',
        frequency: '朝夕食後',
        note: '継続',
        prescribedDate: todayJa(),
      },
    ],
  };
  const referral: ReferralLetterData = {
    ...generated.referral,
    patientName: patient.name,
    patientNameKana: kana,
    sex: sexLabel(patient.sex || 'M'),
    address,
    phone,
    occupation,
    age,
    recipientHospital: hospital ? hospital : /紹介不要/.test(note) ? '（紹介不要）' : generated.referral.recipientHospital,
    recipientDepartment: '内科',
    diagnosis: '高血圧症、2型糖尿病',
    purpose: note.includes('紹介不要') ? '紹介不要（再診経過観察）' : '必要時の精査・加療',
    pastHistory: '高血圧、2型糖尿病',
    examResults: '前回 HbA1c 7.2%',
    clinicalCourse: [soap.subjective, soap.objective, note && `【医師判断】\n${note}`].filter(Boolean).join('\n\n'),
    remarks: soap.plan,
  };
  return {
    ...generated,
    referral,
    prescription,
    infoCombined: { referral, prescription, combinedNote: note },
    certificate: {
      ...generated.certificate,
      patientName: patient.name,
      age,
      height,
      weight,
      bmi,
      bloodPressure: '138 / 82',
      pulse: '72 回/分 整',
      bloodTests:
        'AST 24 / ALT 20 / γ-GTP 32 / LDL 142 / HDL 52 / TG 128 / 空腹時血糖 118 / HbA1c 7.2% / Hb 14.0',
      interview: patient.questionnaireText
        ? `問診票より反映。高血圧症・2型糖尿病で当院フォロー中`
        : '高血圧症・2型糖尿病で当院フォロー中',
      smokingMeds: '喫煙歴なし。アムロジピン5mg・メトホルミン250mg 内服中',
      symptoms: '時に頭がぼっとする。胸痛なし。軽度便秘。',
      doctorDiagnosis: soap.assessment,
      overallGrade: 'C',
      remarks: soap.plan,
    },
    careOpinion1: {
      ...generated.careOpinion1,
      patientName: patient.name,
      patientNameKana: kana,
      age,
      contact: phone,
      diagnoses: [
        { name: '高血圧症', onsetDate: '' },
        { name: '2型糖尿病', onsetDate: '' },
      ],
      stability: 'stable',
      treatmentCourse: [soap.subjective, soap.objective, soap.plan, note].filter(Boolean).join('\n'),
      independencePhysical: '自立',
      independenceCognitive: '自立',
    },
    careOpinion2: {
      ...generated.careOpinion2,
      height,
      weight,
      weightChange: 'maintain',
      risks: ['血圧管理', '血糖管理'],
      servicePrecautions: '血圧・服薬状況の確認。便秘の経過観察。',
      infectiousDisease: '無',
      medicalManagement: ['訪問診療: 不要', '訪問看護: 不要'],
      specialNotes: [soap.assessment, soap.plan, note, patient.questionnaireText].filter(Boolean).join('\n'),
      riskPolicy: soap.plan,
    },
  };
}

export default function DemoPage() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [patients, setPatients] = useState<DemoPatient[]>([YAMADA]);
  const [selectedId, setSelectedId] = useState(YAMADA.id);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<PatientForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [ocrBusy, setOcrBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [soap, setSoap] = useState<SoapData>(DEMO_SOAP);
  const [note, setNote] = useState('');
  const [docs, setDocs] = useState<GeneratedDocuments | null>(null);
  const [reviewTab, setReviewTab] = useState<ReviewTab>('soap');
  const [docTab, setDocTab] = useState<DocumentTypeId>('referral');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [mounted, setMounted] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [copiedField, setCopiedField] = useState<string>('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  const patient = useMemo(
    () => patients.find((p) => p.id === selectedId) ?? patients[0] ?? YAMADA,
    [patients, selectedId],
  );

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (phase !== 'recording') return;
    const t = window.setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  function startVisit() {
    if (!consentGiven) return;
    setPhase('recording');
    setSeconds(0);
    setSoap(soapFromQuestionnaire(DEMO_SOAP, patient));
    setNote('');
    setDocs(null);
    setChat([]);
    setReviewTab('soap');
    void navigator.mediaDevices?.getUserMedia({ audio: true }).catch(() => undefined);
  }

  function stopVisit() {
    setPhase('processing');
    window.setTimeout(() => {
      setSoap(soapFromQuestionnaire(DEMO_SOAP, patient));
      setPhase('review');
    }, 1400);
  }

  function resetDemo() {
    setPhase('idle');
    setSeconds(0);
    setDocs(null);
    setNote('');
    setChat([]);
    setChatOpen(false);
    setReviewTab('soap');
    setConsentGiven(false);
    setCopiedField('');
  }

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(label);
      setToast(label === 'SOAP' ? 'SOAP をコピーしました' : `${label} をコピーしました`);
      window.setTimeout(() => setCopiedField(''), 2000);
    } catch {
      setToast('コピーに失敗しました');
    }
  }

  function copySoap() {
    void copyText(
      'SOAP',
      `S: ${soap.subjective}\nO: ${soap.objective}\nA: ${soap.assessment}\nP: ${soap.plan}`,
    );
  }

  function generateAllDocs(nextNote = note, nextSoap = soap, hospital?: string) {
    const generated = buildDemoDocs(patient, nextSoap, nextNote, hospital);
    setDocs(generated);
    setReviewTab('docs');
    setDocTab('referral');
    return generated;
  }

  function applyChat(text: string) {
    const hospital = hospitalFromText(text);
    const wantsDocs = /作って|作成|書類|処方一覧|紹介状|意見書|健康診断/.test(text);
    let nextNote = note;
    let nextSoap = soap;
    let reply = '記録しました。SOAPよりこちらの判断を優先します。';

    if (!wantsDocs && !hospital) {
      nextNote = [note, text].filter(Boolean).join('\n');
      setNote(nextNote);
    }

    if (/紹介不要/.test(text)) {
      nextNote = [nextNote, '紹介は不要。次回は1か月後。処方意図は現状維持。'].filter(Boolean).join('\n');
      setNote(nextNote);
      nextSoap = { ...nextSoap, plan: `${nextSoap.plan}\n紹介不要。1か月後再診。`.trim() };
      setSoap(nextSoap);
      reply = '紹介不要・次回1か月後を記録し、Plan に反映しました。';
    }

    if (hospital) {
      nextNote = [nextNote, `紹介先: ${hospital}`].filter(Boolean).join('\n');
      setNote(nextNote);
    }

    if (wantsDocs || hospital) {
      generateAllDocs(nextNote, nextSoap, hospital);
      reply = hospital
        ? `「${hospital}」向けに書類へ反映しました。書類タブで確認できます。`
        : 'SOAP とチャットの判断で書類を作成しました。書類タブで確認できます。';
    }

    return reply;
  }

  function sendChat(e: FormEvent) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    setChatInput('');
    setChat((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text }]);
    window.setTimeout(() => {
      const reply = applyChat(text);
      setChat((prev) => [...prev, { id: `a-${Date.now()}`, role: 'ai', text: reply }]);
    }, 400);
  }

  function openAddPatient() {
    setForm(EMPTY_FORM);
    setFormError('');
    setAddOpen(true);
  }

  function savePatient(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError('氏名を入力してください');
      return;
    }
    const age = form.dateOfBirth ? ageFromDob(form.dateOfBirth) : 0;
    const next: DemoPatient = {
      id: `p-${Date.now()}`,
      name: form.name.trim(),
      nameKana: form.nameKana.trim(),
      sex: form.sex,
      age,
      dateOfBirth: form.dateOfBirth,
      phone: form.phone.trim(),
      address: form.address.trim(),
      occupation: form.occupation.trim(),
      memo: form.memo.trim(),
    };
    setPatients((prev) => [next, ...prev]);
    setSelectedId(next.id);
    setAddOpen(false);
    setToast(`${next.name} さんを追加しました`);
  }

  function handleQuestionnaire(file: File | null) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setOcrBusy(true);
    setPatients((prev) =>
      prev.map((p) => (p.id === patient.id ? { ...p, questionnairePhoto: url } : p)),
    );
    window.setTimeout(() => {
      const extracted = mockQuestionnaire(patient);
      setPatients((prev) =>
        prev.map((p) => {
          if (p.id !== patient.id) return p;
          return {
            ...p,
            questionnairePhoto: url,
            questionnaireText: extracted.narrative,
            name: p.name || extracted.name,
            nameKana: p.nameKana || extracted.nameKana,
            sex: p.sex || extracted.sex,
            age: p.age || extracted.age,
            dateOfBirth: p.dateOfBirth || extracted.dateOfBirth,
            phone: p.phone || extracted.phone,
            address: p.address || extracted.address,
            occupation: p.occupation || extracted.occupation,
            memo: [p.memo, extracted.memo].filter(Boolean).join('\n'),
          };
        }),
      );
      setSoap((s) => ({
        ...s,
        subjective: s.subjective.includes('問診票')
          ? s.subjective
          : `【問診票】${extracted.narrative}\n${s.subjective}`,
      }));
      setOcrBusy(false);
      setToast('問診票を読み取り、基本情報とSOAPに反映しました');
    }, 1200);
  }

  const chatUi = (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex flex-col items-end gap-3">
      {chatOpen && (
        <div
          className="pointer-events-auto flex w-[min(100vw-1.5rem,22rem)] flex-col overflow-hidden rounded-3xl border border-white/20 bg-[#0c2f2c]/95 text-[#f3efe4] shadow-[0_24px_80px_-20px_rgba(6,24,22,0.7)] backdrop-blur-xl"
          style={{ height: 'min(52vh, 26rem)' }}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold tracking-wide">チャット</p>
              <p className="text-[10px] text-[#c9ddd8]">判断の追記・宛先変更・書類作成</p>
            </div>
            <button type="button" className="rounded-full p-1.5 text-[#c9ddd8] hover:bg-white/10" onClick={() => setChatOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-xs">
            {chat.length === 0 && (
              <li className="rounded-2xl bg-white/5 px-3 py-2 leading-relaxed text-[#d5e6e1]">
                例: 「高血圧・2型糖尿病で再診。アムロジピン5mgとメトホルミン継続。」
                <br />
                「市立病院向けに紹介状を作って」
              </li>
            )}
            {chat.map((m) => (
              <li
                key={m.id}
                className={cn(
                  'max-w-[90%] rounded-2xl px-3 py-2 leading-relaxed',
                  m.role === 'user' ? 'ml-auto bg-[#1f6f66] text-white' : 'bg-white/10 text-[#f3efe4]',
                )}
              >
                <p className="mb-0.5 text-[10px] font-medium text-[#b7cec8]">{m.role === 'user' ? '医師' : 'AI'}</p>
                <span className="whitespace-pre-wrap">{m.text}</span>
              </li>
            ))}
          </ul>
          <form onSubmit={sendChat} className="flex gap-2 border-t border-white/10 p-3">
            <Textarea
              rows={2}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="判断を書く / 紹介状を作って"
              className="min-h-0 flex-1 border-white/10 bg-white/10 text-xs text-[#f3efe4] placeholder:text-[#9bb8b1]"
            />
            <Button type="submit" size="sm" className="self-end bg-[#e8c98a] text-[#0c2f2c] hover:bg-[#f0d7a4]" disabled={!chatInput.trim()}>
              送信
            </Button>
          </form>
        </div>
      )}
      <button
        type="button"
        onClick={() => setChatOpen((v) => !v)}
        className={cn(
          'pointer-events-auto inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-[0_12px_30px_-8px_rgba(12,47,44,0.55)] transition',
          chatOpen ? 'bg-[#1a3f3a] text-white' : 'bg-[#0c2f2c] text-[#f3efe4] hover:bg-[#134540]',
        )}
      >
        {chatOpen ? <X className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
        チャット
      </button>
    </div>
  );

  const addModal = addOpen && (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#0c2f2c]/45 p-3 backdrop-blur-sm min-[640px]:items-center">
      <form
        onSubmit={savePatient}
        className="w-full max-w-lg animate-scale-in rounded-3xl border border-[#d7e2dd] bg-[#fbfaf6] p-5 shadow-[0_30px_80px_-28px_rgba(12,47,44,0.55)] min-[480px]:p-7"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#6f8f88]">PATIENT</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#0c2f2c]">患者を追加</h2>
            <p className="mt-1 text-sm text-slate-500">基本情報を入れてから、問診票の写真で補完できます。</p>
          </div>
          <button type="button" className="rounded-full p-2 text-slate-500 hover:bg-slate-100" onClick={() => setAddOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3 min-[520px]:grid-cols-2">
          <label className="space-y-1 min-[520px]:col-span-2">
            <span className="text-xs font-medium text-slate-600">氏名</span>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="山田 太郎" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">ふりがな</span>
            <Input value={form.nameKana} onChange={(e) => setForm((f) => ({ ...f, nameKana: e.target.value }))} placeholder="ヤマダ タロウ" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">性別</span>
            <Select
              className="w-full"
              value={form.sex}
              onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value as Sex }))}
            >
              <option value="">未選択</option>
              <option value="M">男</option>
              <option value="F">女</option>
            </Select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">生年月日</span>
            <Input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">電話</span>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="0957-50-0000" />
          </label>
          <label className="space-y-1 min-[520px]:col-span-2">
            <span className="text-xs font-medium text-slate-600">住所</span>
            <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="長崎県大村市…" />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600">職業</span>
            <Input value={form.occupation} onChange={(e) => setForm((f) => ({ ...f, occupation: e.target.value }))} />
          </label>
          <label className="space-y-1 min-[520px]:col-span-2">
            <span className="text-xs font-medium text-slate-600">メモ</span>
            <Textarea rows={2} value={form.memo} onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))} placeholder="既往・通院理由など" />
          </label>
        </div>
        {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>
            キャンセル
          </Button>
          <Button type="submit" icon={<UserPlus />}>
            追加する
          </Button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[#eef3f0] text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_500px_at_10%_-10%,rgba(15,118,110,0.16),transparent),radial-gradient(900px_400px_at_90%_0%,rgba(196,165,116,0.18),transparent)]" />

      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0c2f2c]/95 px-4 py-3 text-[#f3efe4] backdrop-blur-xl min-[480px]:px-6">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e8c98a] text-[#0c2f2c] shadow-sm">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold tracking-[0.28em] text-[#c9ddd8]">KUSHIMA INTERNAL MEDICINE</p>
            <p className="truncate text-sm font-semibold tracking-wide">Medical OS</p>
          </div>
          <div className="hidden rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-[#d5e6e1] min-[640px]:block">
            {patient.name}
            {patient.age ? ` · ${patient.age}歳` : ''}
            {patient.sex ? ` · ${sexLabel(patient.sex)}` : ''}
          </div>
          {phase !== 'idle' && (
            <Button size="sm" variant="ghost" className="text-[#f3efe4] hover:bg-white/10" onClick={resetDemo}>
              最初から
            </Button>
          )}
        </div>
      </header>

      <main className={cn('relative mx-auto max-w-6xl px-4 py-5 min-[480px]:px-6 min-[480px]:py-8', phase === 'review' && 'pb-28')}>
        {phase === 'idle' && (
          <section className="grid gap-5 min-[900px]:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] min-[900px]:items-start">
            <div className="overflow-hidden rounded-[2rem] border border-[#d7e2dd] bg-[#fbfaf6] shadow-[0_30px_70px_-40px_rgba(12,47,44,0.55)]">
              <div className="relative border-b border-[#e4ebe7] bg-[linear-gradient(135deg,#0c2f2c_0%,#1a5c55_55%,#0c2f2c_100%)] px-6 py-7 text-[#f3efe4] min-[480px]:px-8">
                <p className="text-[11px] font-semibold tracking-[0.28em] text-[#e8c98a]">TODAY&apos;S VISIT</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight min-[480px]:text-4xl">診療を始める</h1>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-[#d5e6e1]">
                  録音終了後に、文字起こし・SOAP・書類を作成します。
                </p>
              </div>
              <div className="space-y-5 px-5 py-6 min-[480px]:px-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0c2f2c] text-lg font-semibold text-[#e8c98a]">
                    {patient.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xl font-semibold tracking-tight text-[#0c2f2c]">{patient.name}</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {patient.nameKana || 'ふりがな未登録'}
                      {' · '}
                      {patient.age ? `${patient.age}歳` : '年齢未登録'}
                      {' · '}
                      {sexLabel(patient.sex)}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                      {[patient.phone, patient.address, patient.occupation].filter(Boolean).join(' / ') || '基本情報はまだ少ないです。問診票で補えます。'}
                    </p>
                  </div>
                </div>

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    handleQuestionnaire(e.target.files?.[0] ?? null);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={ocrBusy}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-dashed border-[#b7cfc8] bg-[#f3f7f5] px-4 py-4 text-left transition hover:border-[#0f766e] hover:bg-white"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-[#d7e2dd]">
                    {patient.questionnairePhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={patient.questionnairePhoto} alt="問診票" className="h-full w-full object-cover" />
                    ) : (
                      <Camera className="h-5 w-5 text-[#0f766e]" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#0c2f2c]">
                      {ocrBusy ? '問診票を読み取り中…' : patient.questionnairePhoto ? '問診票を読み取り済み' : '問診票を撮影して取り込む'}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {ocrBusy
                        ? '写真から氏名・既往・内服を反映しています'
                        : '紙の問診票を撮るだけで、基本情報とSOAPに入ります'}
                    </span>
                  </span>
                  <Sparkles className="h-4 w-4 shrink-0 text-[#c4a574]" />
                </button>

                {patient.questionnaireText && (
                  <div className="rounded-2xl border border-[#d7e2dd] bg-white px-4 py-3 text-xs leading-relaxed text-slate-600">
                    <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-[#0f766e]">
                      <ImageIcon className="h-3.5 w-3.5" />
                      問診票の読取
                    </p>
                    <p className="whitespace-pre-wrap">{patient.questionnaireText}</p>
                  </div>
                )}

                <label className="flex w-full cursor-pointer items-start gap-3 rounded-2xl border border-[#d7e2dd] bg-white px-4 py-3.5 text-sm leading-relaxed text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0c2f2c] accent-[#0c2f2c]"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                  />
                  <span>
                    患者の同意を得た上で診療音声を記録します。音声はSOAP生成後に削除されます。
                  </span>
                </label>

                <Button
                  size="lg"
                  className="h-14 w-full rounded-2xl bg-[#0c2f2c] text-base hover:bg-[#134540]"
                  icon={<Mic />}
                  disabled={!consentGiven}
                  onClick={startVisit}
                >
                  診療を開始
                </Button>
              </div>
            </div>

            <aside className="rounded-[2rem] border border-[#d7e2dd] bg-[#fbfaf6]/90 p-4 shadow-[0_20px_50px_-36px_rgba(12,47,44,0.5)] min-[480px]:p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.22em] text-[#6f8f88]">PATIENTS</p>
                  <h2 className="text-lg font-semibold text-[#0c2f2c]">患者一覧</h2>
                </div>
                <Button size="sm" className="rounded-full bg-[#0c2f2c] hover:bg-[#134540]" icon={<Plus />} onClick={openAddPatient}>
                  追加
                </Button>
              </div>
              <ul className="space-y-2">
                {patients.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      className={cn(
                        'w-full rounded-2xl border px-3.5 py-3 text-left transition',
                        p.id === patient.id
                          ? 'border-[#0f766e] bg-[#eef8f5] shadow-sm'
                          : 'border-transparent bg-white hover:border-[#d7e2dd]',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0c2f2c] text-sm font-semibold text-[#e8c98a]">
                          {p.name.slice(0, 1)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-[#0c2f2c]">{p.name}</span>
                          <span className="block text-xs text-slate-500">
                            {p.age ? `${p.age}歳` : '年齢—'} · {sexLabel(p.sex)}
                            {p.questionnairePhoto ? ' · 問診票あり' : ''}
                          </span>
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
          </section>
        )}

        {phase === 'recording' && (
          <section className="flex min-h-[72dvh] flex-col items-center justify-center rounded-[2rem] bg-[radial-gradient(circle_at_50%_30%,#1a5c55,transparent_55%),linear-gradient(180deg,#0c2f2c,#071c1a)] px-6 text-[#f3efe4] shadow-[0_40px_80px_-40px_rgba(12,47,44,0.8)]">
            <div className="relative mb-8 flex h-40 w-40 items-center justify-center">
              <span className="absolute inset-0 animate-pulse-ring rounded-full bg-red-400/40" />
              <span className="absolute inset-6 animate-pulse rounded-full bg-red-500/20" />
              <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-red-600 text-white shadow-[0_0_40px_rgba(220,38,38,0.45)]">
                <Mic className="h-10 w-10" />
              </span>
            </div>
            <p className="text-xs font-semibold tracking-[0.35em] text-red-200">RECORDING</p>
            <p className="mt-2 font-mono text-6xl font-light tabular-nums tracking-tight min-[480px]:text-7xl">{formatTime(seconds)}</p>
            <p className="mt-4 text-sm text-[#c9ddd8]">
              {patient.name} さん{patient.age ? ` · ${patient.age}歳` : ''}
            </p>
            <Button size="lg" variant="danger" className="mt-10 rounded-full px-8" icon={<Square />} onClick={stopVisit}>
              終了
            </Button>
          </section>
        )}

        {phase === 'processing' && (
          <section className="flex min-h-[62dvh] flex-col items-center justify-center gap-4 text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#c9ddd8] border-t-[#0c2f2c]" />
            <p className="text-lg font-semibold text-[#0c2f2c]">文字起こしと SOAP を作成中</p>
            <p className="max-w-sm text-sm leading-relaxed text-slate-500">
              音声を文字にし、内科の言葉に寄せています。
            </p>
          </section>
        )}

        {phase === 'review' && (
          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[#d7e2dd] bg-[#fbfaf6] px-4 py-3 shadow-sm min-[480px]:px-5">
              <div className="flex min-w-0 items-center gap-3">
                {patient.questionnairePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={patient.questionnairePhoto} alt="" className="h-11 w-11 rounded-xl object-cover ring-1 ring-[#d7e2dd]" />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0c2f2c] text-[#e8c98a]">
                    {patient.name.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#0c2f2c]">{patient.name}</p>
                  <p className="text-xs text-slate-500">
                    {patient.age ? `${patient.age}歳` : ''} {sexLabel(patient.sex)} · 高血圧 / 2型糖尿病
                  </p>
                </div>
              </div>
              <div className="flex rounded-full bg-[#e8eee9] p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setReviewTab('soap')}
                  className={cn(
                    'rounded-full px-4 py-2 transition',
                    reviewTab === 'soap' ? 'bg-[#0c2f2c] text-white shadow-sm' : 'text-slate-600',
                  )}
                >
                  SOAP
                </button>
                <button
                  type="button"
                  onClick={() => setReviewTab('docs')}
                  className={cn(
                    'rounded-full px-4 py-2 transition',
                    reviewTab === 'docs' ? 'bg-[#0c2f2c] text-white shadow-sm' : 'text-slate-600',
                  )}
                >
                  書類
                </button>
              </div>
            </div>

            {reviewTab === 'soap' && (
              <div className="grid gap-5 min-[860px]:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] min-[860px]:items-start">
                <div className="rounded-[1.75rem] border border-[#d7e2dd] bg-[#fbfaf6] p-4 shadow-sm min-[480px]:p-6">
                  <p className="mb-4 text-[11px] font-semibold tracking-[0.22em] text-[#6f8f88]">TRANSCRIPT</p>
                  <div className="max-h-[68dvh] space-y-3 overflow-y-auto pr-1">
                    {DEMO_LINES.map((line, i) => (
                      <div
                        key={`${line.speaker}-${i}`}
                        className={cn('flex', line.speaker === '患者' ? 'justify-end' : 'justify-start')}
                      >
                        <p
                          className={cn(
                            'max-w-[92%] rounded-2xl px-4 py-3 text-[0.98rem] leading-relaxed min-[480px]:text-lg',
                            line.speaker === '先生'
                              ? 'rounded-tl-md bg-[#0c2f2c] text-[#f3efe4]'
                              : 'rounded-tr-md bg-white text-slate-800 ring-1 ring-[#e4ebe7]',
                          )}
                        >
                          <span className="mb-1 block text-[10px] font-bold tracking-wide opacity-70">{line.speaker}</span>
                          {line.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold tracking-[0.22em] text-[#6f8f88]">SOAP</p>
                    <Button size="sm" variant="secondary" className="rounded-full" icon={<ClipboardCopy />} onClick={copySoap}>
                      {copiedField === 'SOAP' ? 'コピー済み' : 'SOAP をコピー'}
                    </Button>
                  </div>
                  {(
                    [
                      ['S', 'subjective', soap.subjective, '主観'],
                      ['O', 'objective', soap.objective, '客観'],
                      ['A', 'assessment', soap.assessment, '評価'],
                      ['P', 'plan', soap.plan, '計画'],
                    ] as const
                  ).map(([label, key, value, hint]) => (
                    <div key={key} className="overflow-hidden rounded-[1.5rem] border border-[#d7e2dd] bg-white p-4 shadow-sm">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#0c2f2c] text-sm font-bold text-[#e8c98a]">
                          {label}
                        </span>
                        <span className="text-xs font-semibold tracking-wide text-[#6f8f88]">{hint}</span>
                        <button
                          type="button"
                          className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-[#0c2f2c]"
                          onClick={() => void copyText(label, value)}
                        >
                          <ClipboardCopy className="h-3.5 w-3.5" />
                          {copiedField === label ? 'コピー済み' : 'コピー'}
                        </button>
                      </div>
                      <Textarea
                        rows={3}
                        value={value}
                        onChange={(e) => setSoap((s) => ({ ...s, [key]: e.target.value }))}
                        className="border-0 bg-[#f7faf8] text-sm leading-relaxed shadow-none min-[480px]:text-[0.95rem]"
                      />
                    </div>
                  ))}
                  {note && (
                    <div className="rounded-[1.5rem] border border-[#e8c98a]/50 bg-[#fbf6ea] p-4 text-sm text-slate-700">
                      <p className="mb-1 text-[10px] font-bold tracking-wide text-[#8a6d32]">チャットの判断</p>
                      <p className="whitespace-pre-wrap">{note}</p>
                    </div>
                  )}
                  <Button className="h-12 w-full rounded-2xl bg-[#0c2f2c] hover:bg-[#134540]" icon={<Printer />} onClick={() => generateAllDocs()}>
                    書類をすべて作る
                  </Button>
                </div>
              </div>
            )}

            {reviewTab === 'docs' && (
              <div className="space-y-4">
                {!docs ? (
                  <div className="rounded-[2rem] border border-dashed border-[#b7cfc8] bg-[#fbfaf6] px-6 py-14 text-center">
                    <p className="text-sm text-slate-500">まだ書類がありません。チャットか下のボタンで作成できます。</p>
                    <Button className="mt-5 rounded-2xl bg-[#0c2f2c] hover:bg-[#134540]" icon={<Printer />} onClick={() => generateAllDocs()}>
                      書類をすべて作る
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {DOC_TABS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setDocTab(item.id)}
                          className={cn(
                            'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition',
                            docTab === item.id
                              ? 'bg-[#0c2f2c] text-white shadow-sm'
                              : 'bg-white text-slate-600 ring-1 ring-[#d7e2dd] hover:bg-[#f3f7f5]',
                          )}
                        >
                          <item.icon className="h-3.5 w-3.5" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <div className="overflow-auto rounded-[1.5rem] border border-[#d7e2dd] bg-[#f4f1ea] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] min-[480px]:p-5">
                      <div className="mx-auto max-w-[52rem] rounded-xl bg-white p-2 shadow-[0_18px_50px_-28px_rgba(12,47,44,0.45)]">
                        {docTab === 'referral' && (
                          <ReferralLetter
                            data={docs.referral}
                            onChange={(referral) =>
                              setDocs({
                                ...docs,
                                referral,
                                infoCombined: { referral, prescription: docs.prescription, combinedNote: note },
                              })
                            }
                          />
                        )}
                        {docTab === 'prescription' && (
                          <PrescriptionList
                            data={docs.prescription}
                            onChange={(prescription) =>
                              setDocs({
                                ...docs,
                                prescription,
                                infoCombined: { referral: docs.referral, prescription, combinedNote: note },
                              })
                            }
                          />
                        )}
                        {docTab === 'info-combined' && docs.infoCombined && (
                          <InfoProvideCombined
                            data={docs.infoCombined}
                            onChange={(infoCombined) =>
                              setDocs({
                                ...docs,
                                infoCombined,
                                referral: infoCombined.referral,
                                prescription: infoCombined.prescription,
                              })
                            }
                          />
                        )}
                        {docTab === 'certificate' && (
                          <MedicalCertificate
                            data={docs.certificate}
                            onChange={(certificate) => setDocs({ ...docs, certificate })}
                          />
                        )}
                        {docTab === 'care-opinion-1' && (
                          <CareOpinion1
                            data={docs.careOpinion1}
                            onChange={(careOpinion1) => setDocs({ ...docs, careOpinion1 })}
                          />
                        )}
                        {docTab === 'care-opinion-2' && (
                          <CareOpinion2
                            data={docs.careOpinion2}
                            onChange={(careOpinion2) => setDocs({ ...docs, careOpinion2 })}
                          />
                        )}
                      </div>
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#0f766e]" />
                      診療内容とチャットの判断が書類に反映されます。
                    </p>
                  </>
                )}
              </div>
            )}
          </section>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[90] -translate-x-1/2 animate-toast-in rounded-full bg-[#0c2f2c] px-4 py-2 text-sm text-[#f3efe4] shadow-lg">
          {toast}
        </div>
      )}

      {mounted && addOpen && createPortal(addModal, document.body)}
      {mounted && phase === 'review' && createPortal(chatUi, document.body)}
    </div>
  );
}
