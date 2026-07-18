'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, getToken, isUnauthorizedError } from '@/lib/api-client';
import { useRecording } from '@/hooks/use-recording';
import { useTranscriptPreview } from '@/hooks/use-transcript-preview';
import { RecordingPhase } from '@/components/consultation/recording-phase';
import { ProcessingPhase } from '@/components/consultation/processing-phase';
import { ErrorPhase } from '@/components/consultation/error-phase';
import { ReviewPhase } from '@/components/consultation/review-phase';

type Soap = { subjective: string; objective: string; assessment: string; plan: string };
type Warning = { id: string; message: string; severity: string };
type Phase = 'recording' | 'processing' | 'error' | 'review';

export default function ConsultationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const recording = useRecording(id);
  const transcriptPreview = useTranscriptPreview(
    id,
    recording.state === 'recording' || recording.state === 'paused',
  );
  const [phase, setPhase] = useState<Phase>('recording');
  const [soap, setSoap] = useState<Soap>({ subjective: '', objective: '', assessment: '', plan: '' });
  const [note, setNote] = useState('');
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [transcript, setTranscript] = useState<Array<{ id: string; text: string; speaker: string }>>([]);
  const [revisions, setRevisions] = useState<
    Array<{
      id: string;
      fieldName: string;
      beforeValue: string;
      afterValue: string;
      changedAt: string;
      documentType: string;
    }>
  >([]);
  const [approved, setApproved] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [generatingDocs, setGeneratingDocs] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [caseName, setCaseName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [documentInput, setDocumentInput] = useState<{
    caseCode: string;
    patientName: string;
    sex?: string | null;
    age?: number | null;
    dateOfBirth?: string | null;
    phone?: string | null;
    memo?: string | null;
    soap: Soap;
    structured?: Record<string, unknown> | null;
  }>({
    caseCode: 'P-001',
    patientName: '',
    soap: { subjective: '', objective: '', assessment: '', plan: '' },
  });

  function calcAge(dateOfBirth?: string | null): number | null {
    if (!dateOfBirth) return null;
    return Math.floor(
      (Date.now() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );
  }

  const loadConsultation = useCallback(async () => {
    try {
      const data = await api.getConsultation(id);
    const patientName = data.patient?.name ?? data.anonymousCase?.displayName ?? '症例';
    setCaseName(patientName);

    const caseCode = data.patient?.patientCode ?? data.anonymousCase?.caseCode ?? 'P-001';
    const currentSoap = data.soapDocuments?.[0] ?? {
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
    };
    setDocumentInput({
      caseCode,
      patientName,
      sex: data.patient?.sex ?? data.anonymousCase?.sex,
      age: data.patient?.dateOfBirth
        ? calcAge(data.patient.dateOfBirth)
        : (data.anonymousCase?.age ?? null),
      dateOfBirth: data.patient?.dateOfBirth ?? null,
      phone: data.patient?.phone ?? null,
      memo: data.patient?.memo ?? null,
      soap: currentSoap,
      structured: data.structuredData?.data ?? null,
    });

    if (data.pipelineError) {
      setErrorMessage(data.pipelineError);
      setPhase('error');
      return;
    }

    if (data.status === 'PROCESSING') {
      setPhase('processing');
      return;
    }

    if (['REVIEW', 'APPROVED', 'COMPLETED'].includes(data.status)) {
      const hasContent =
        (data.soapDocuments?.length ?? 0) > 0 || (data.transcriptSegments?.length ?? 0) > 0;
      if (!hasContent && data.status === 'REVIEW') {
        setErrorMessage('処理は完了しましたが、下書きが生成されませんでした。');
        setPhase('error');
        return;
      }
      if (data.soapDocuments?.[0]) {
        setSoap(data.soapDocuments[0]);
        setDocumentInput((prev) => ({ ...prev, soap: data.soapDocuments![0]! }));
      }
      if (data.clinicalNotes?.[0]) setNote(data.clinicalNotes[0].content);
      if (data.warnings) setWarnings(data.warnings);
      if (data.transcriptSegments) setTranscript(data.transcriptSegments);
      if (data.revisions) setRevisions(data.revisions);
      setPhase('review');
      setApproved(data.status === 'APPROVED' || data.status === 'COMPLETED');
      return;
    }

    if (data.status === 'RECORDING') {
      setPhase('recording');
    }
    } catch (error) {
      if (isUnauthorizedError(error)) {
        router.replace('/login');
      }
    }
  }, [id, router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    void loadConsultation();
  }, [id, router, loadConsultation]);

  useEffect(() => {
    if (phase !== 'processing') return;
    const timer = setInterval(() => {
      void loadConsultation();
    }, 3000);
    return () => clearInterval(timer);
  }, [phase, loadConsultation]);

  async function handleStop() {
    await recording.stop();
    setPhase('processing');
    setErrorMessage('');
  }

  async function handleApprove() {
    await api.approve(id);
    setApproved(true);
  }

  async function handleCopySoap() {
    if (!approved) return;
    const text = `S: ${soap.subjective}\nO: ${soap.objective}\nA: ${soap.assessment}\nP: ${soap.plan}`;
    await navigator.clipboard.writeText(text);
    await api.copied(id);
    setCopyMsg('SOAP をコピーしました');
  }

  async function handleCopyNote() {
    if (!approved) return;
    await navigator.clipboard.writeText(note);
    await api.copied(id);
    setCopyMsg('通常診療記録をコピーしました');
  }

  async function saveSoap() {
    await api.updateSoap(id, soap);
    setSaveMsg('SOAP を保存しました');
    setDocumentInput((prev) => ({ ...prev, soap }));
    await loadConsultation();
    setTimeout(() => setSaveMsg(''), 3000);
  }

  async function saveNote() {
    await api.updateNote(id, note);
    setSaveMsg('診療記録を保存しました');
    await loadConsultation();
    setTimeout(() => setSaveMsg(''), 3000);
  }

  async function handleSpeakerChange(segmentId: string, speaker: string) {
    await api.updateSpeaker(id, segmentId, speaker);
    setTranscript((prev) =>
      prev.map((seg) => (seg.id === segmentId ? { ...seg, speaker } : seg)),
    );
  }

  async function handleGenerateAll() {
    setGeneratingDocs(true);
    try {
      await api.generateAllDocuments(id);
      setCopyMsg('全書類を生成しました。書類タブで確認できます。');
    } catch (error) {
      setCopyMsg(error instanceof Error ? error.message : '書類の生成に失敗しました');
    } finally {
      setGeneratingDocs(false);
    }
  }

  if (phase === 'recording') {
    return (
      <RecordingPhase
        caseName={caseName}
        state={recording.state}
        seconds={recording.seconds}
        preview={transcriptPreview.preview}
        pendingChunks={recording.pendingChunks}
        limitReached={recording.limitReached}
        consentGiven={consentGiven}
        onConsentChange={setConsentGiven}
        onStart={() => recording.start()}
        onPause={recording.pause}
        onResume={recording.resume}
        onStop={handleStop}
      />
    );
  }

  if (phase === 'processing') {
    return <ProcessingPhase />;
  }

  if (phase === 'error') {
    return (
      <ErrorPhase message={errorMessage} onBack={() => router.push('/patients')} />
    );
  }

  return (
    <ReviewPhase
      consultationId={id}
      caseName={caseName}
      soap={soap}
      note={note}
      warnings={warnings}
      transcript={transcript}
      revisions={revisions}
      approved={approved}
      copyMsg={copyMsg}
      saveMsg={saveMsg}
      onSoapChange={setSoap}
      onNoteChange={setNote}
      onSaveSoap={saveSoap}
      onSaveNote={saveNote}
      onSpeakerChange={handleSpeakerChange}
      onApprove={handleApprove}
      onCopySoap={handleCopySoap}
      onCopyNote={handleCopyNote}
      onGenerateAll={handleGenerateAll}
      generatingDocs={generatingDocs}
      documentInput={{ ...documentInput, soap }}
    />
  );
}
