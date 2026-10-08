'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken, isUnauthorizedError } from '@/lib/api-client';
import { useRecording } from '@/hooks/use-recording';
import { useMicCheck } from '@/hooks/use-mic-check';
import { useTranscriptPreview } from '@/hooks/use-transcript-preview';
import { RecordingPhase } from '@/components/consultation/recording-phase';
import { ProcessingPhase } from '@/components/consultation/processing-phase';
import { ErrorPhase } from '@/components/consultation/error-phase';
import { ReviewPhase } from '@/components/consultation/review-phase';
import { formatSoapForChartCopy, type CopyStyle, type VisitType } from '@/lib/soap-visit';

type Soap = { subjective: string; objective: string; assessment: string; plan: string };
type Warning = { id: string; message: string; severity: string };
type Phase = 'recording' | 'processing' | 'error' | 'review';

/** Match backend pipeline-progress.ts */
const CLIENT_STALE_NO_PROGRESS_MS = 15 * 60 * 1000;
const CLIENT_ABSOLUTE_MAX_MS = 40 * 60 * 1000;
const CLIENT_POLL_FAIL_LIMIT = 5;
const CLIENT_STALE_MESSAGE =
  '処理がタイムアウトしました。もう一度処理するか、録り直してください。録音が長い場合は数分かかることがあります。';
const CLIENT_POLL_FAIL_MESSAGE =
  '処理状況の取得に失敗しました。通信を確認し、「もう一度処理」を試してください。';

export type ConsultationDensity = 'compact' | 'full';

export function ConsultationWorkflow({
  id,
  density = 'full',
  backHref = '/home',
}: {
  id: string;
  density?: ConsultationDensity;
  backHref?: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('recording');
  // 録音前のマイク確認。録音が始まったら閉じて、マイクを二重に掴まないようにする。
  // ここで選んだマイクを、そのまま録音でも使う（診察室に置いた外付けマイクで録るため）
  const [micCheckOpen, setMicCheckOpen] = useState(true);
  const mic = useMicCheck(phase === 'recording' && micCheckOpen);
  const recording = useRecording(id, mic.deviceId);
  const transcriptPreview = useTranscriptPreview(
    id,
    recording.state === 'recording' || recording.state === 'paused',
  );
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
  /** 電子カルテへコピーした後か（コピーすると診察は「完了」になる） */
  const [copied, setCopied] = useState(false);
  /** サーバーに保存済みのSOAP。画面の編集との差で「未保存」を出し、コピー時に先に保存する */
  const [savedSoap, setSavedSoap] = useState<Soap>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  });
  const [consentGiven, setConsentGiven] = useState(false);
  const [generatingDocs, setGeneratingDocs] = useState(false);
  const [savingTranscript, setSavingTranscript] = useState(false);
  const [glossarySuggestions, setGlossarySuggestions] = useState<
    Array<{ wrong: string; correct: string }>
  >([]);
  const [copyMsg, setCopyMsg] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [caseName, setCaseName] = useState('');
  const [visitType, setVisitType] = useState<VisitType>('ROUTINE');
  const [errorMessage, setErrorMessage] = useState('');
  const [canReprocess, setCanReprocess] = useState(false);
  const [errorBusy, setErrorBusy] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<string | null>(null);
  const [pipelineStartedAt, setPipelineStartedAt] = useState<string | null>(null);
  const [pipelineUpdatedAt, setPipelineUpdatedAt] = useState<string | null>(null);
  const [pollFailCount, setPollFailCount] = useState(0);
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

  function enterClientTimeout(hasAudioHint = true) {
    setErrorMessage(CLIENT_STALE_MESSAGE);
    setCanReprocess(hasAudioHint);
    setPhase('error');
  }

  const loadConsultation = useCallback(async () => {
    try {
      const data = await api.getConsultation(id);
      setPollFailCount(0);
      const patientName = data.patient?.name ?? data.anonymousCase?.displayName ?? '症例';
      setCaseName(patientName);
      setVisitType(data.visitType === 'CHECKUP' ? 'CHECKUP' : 'ROUTINE');

      const caseCode = data.patient?.patientCode ?? data.anonymousCase?.caseCode ?? '—';
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
        setCanReprocess(Boolean(data.hasAudio));
        setPhase('error');
        return;
      }

      if (data.status === 'PROCESSING') {
        const startedAt = data.pipelineStartedAt ?? null;
        const updatedAt = data.pipelineUpdatedAt ?? null;
        setPipelineStep(data.pipelineStep ?? null);
        setPipelineStartedAt(startedAt);
        setPipelineUpdatedAt(updatedAt);

        const now = Date.now();
        const startedMs = startedAt ? new Date(startedAt).getTime() : NaN;
        const updatedMs = updatedAt ? new Date(updatedAt).getTime() : NaN;
        if (
          (Number.isFinite(startedMs) && now - startedMs > CLIENT_ABSOLUTE_MAX_MS) ||
          (Number.isFinite(updatedMs) && now - updatedMs > CLIENT_STALE_NO_PROGRESS_MS)
        ) {
          enterClientTimeout(Boolean(data.hasAudio));
          return;
        }

        setPhase('processing');
        return;
      }

      if (['REVIEW', 'APPROVED', 'COMPLETED'].includes(data.status)) {
        const hasContent =
          (data.soapDocuments?.length ?? 0) > 0 || (data.transcriptSegments?.length ?? 0) > 0;
        if (!hasContent && data.status === 'REVIEW') {
          setErrorMessage('処理は完了しましたが、下書きが生成されませんでした。');
          setCanReprocess(Boolean(data.hasAudio));
          setPhase('error');
          return;
        }
        if (data.soapDocuments?.[0]) {
          setSoap(data.soapDocuments[0]);
          setSavedSoap(data.soapDocuments[0]);
          setDocumentInput((prev) => ({ ...prev, soap: data.soapDocuments![0]! }));
        }
        if (data.clinicalNotes?.[0]) setNote(data.clinicalNotes[0].content);
        if (data.warnings) setWarnings(data.warnings);
        if (data.transcriptSegments) setTranscript(data.transcriptSegments);
        if (data.revisions) setRevisions(data.revisions);
        setPhase('review');
        setApproved(data.status === 'APPROVED' || data.status === 'COMPLETED');
        setCopied(data.status === 'COMPLETED');
        return;
      }

      if (data.status === 'RECORDING') {
        setPhase('recording');
      }
    } catch (error) {
      if (isUnauthorizedError(error)) {
        router.replace('/login');
        return;
      }
      setPollFailCount((n) => {
        const next = n + 1;
        if (next >= CLIENT_POLL_FAIL_LIMIT) {
          setErrorMessage(CLIENT_POLL_FAIL_MESSAGE);
          setCanReprocess(true);
          setPhase('error');
        }
        return next;
      });
    }
  }, [id, router]);

  // 診療ホームで確認した患者の同意は、録音画面へ引き継ぐ
  useEffect(() => {
    try {
      if (sessionStorage.getItem(`consent:${id}`) === '1') setConsentGiven(true);
    } catch {
      // 読めなければ、録音画面で確認してもらう
    }
  }, [id]);

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

  /** 通知を出して、少しして消す（同じ文面をもう一度出しても、また出る） */
  function flashMsg(message: string) {
    setCopyMsg(message);
    setTimeout(() => setCopyMsg(''), 3500);
  }

  const soapDirty = (['subjective', 'objective', 'assessment', 'plan'] as const).some(
    (key) => soap[key] !== savedSoap[key],
  );

  /**
   * 「電子カルテへコピー」。診察後の画面で一番よく押す操作を、1回にまとめた。
   *
   * 1. クリップボードへ書く（ブラウザは、押した直後でないと書かせてくれないので一番先）
   * 2. 画面で直した分が未保存なら保存する（保存せずに確認すると、直す前の文章が確認済みになる）
   * 3. まだなら確認済みにする
   * 4. コピーした記録を付ける（診察ログに「コピー済み」が出る）
   *
   * 以前は「確認済みにする」を押さないとコピーできず、直した分の保存も別のボタンだった。
   */
  async function handleCopySoap(style?: CopyStyle) {
    const text = formatSoapForChartCopy(soap, visitType, style);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      flashMsg('コピーできませんでした。ブラウザのクリップボードの許可を確認してください');
      return;
    }
    try {
      // 保存すると、サーバーでは確認済みが外れて「確認中」に戻る。直したときは確認し直す
      const needsApprove = !approved || soapDirty;
      if (soapDirty) {
        await api.updateSoap(id, soap);
        setSavedSoap(soap);
        setDocumentInput((prev) => ({ ...prev, soap }));
      }
      if (needsApprove) {
        await api.approve(id);
        setApproved(true);
      }
      await api.copied(id);
      setCopied(true);
      flashMsg('カルテへコピーしました — CLINICS に貼り付けてください');
    } catch (error) {
      flashMsg(
        error instanceof Error
          ? `コピーはできましたが、記録に失敗しました：${error.message}`
          : 'コピーはできましたが、記録に失敗しました',
      );
    }
  }

  async function handleCopyNote() {
    try {
      await navigator.clipboard.writeText(note);
    } catch {
      flashMsg('コピーできませんでした。ブラウザのクリップボードの許可を確認してください');
      return;
    }
    if (approved) await api.copied(id);
    flashMsg('通常診療記録をコピーしました — CLINICS に貼り付けてください');
  }

  async function saveSoap() {
    try {
      await api.updateSoap(id, soap);
    } catch (error) {
      // 保存に失敗したのに何も出ないと、直した内容が残ったと思い込む
      flashMsg(
        error instanceof Error ? `SOAP を保存できませんでした：${error.message}` : 'SOAP を保存できませんでした',
      );
      return;
    }
    setSavedSoap(soap);
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

  function handleTranscriptTextChange(segmentId: string, text: string) {
    setTranscript((prev) =>
      prev.map((seg) => (seg.id === segmentId ? { ...seg, text } : seg)),
    );
  }

  async function handleSaveTranscript() {
    setSavingTranscript(true);
    try {
      const result = await api.saveTranscript(
        id,
        transcript.map((seg) => ({ id: seg.id, text: seg.text })),
      );
      setTranscript(result.segments);
      setGlossarySuggestions(result.suggestedReplacements);
      setSaveMsg('文字起こしを保存しました');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (error) {
      setSaveMsg(error instanceof Error ? error.message : '文字起こしの保存に失敗しました');
    } finally {
      setSavingTranscript(false);
    }
  }

  async function handleAddGlossarySuggestions(
    selected: Array<{ wrong: string; correct: string }>,
  ) {
    if (!selected.length) {
      setGlossarySuggestions([]);
      return;
    }
    await api.addGlossaryReplacements(selected);
    setGlossarySuggestions([]);
    setSaveMsg('修正を語彙に追加しました');
    setTimeout(() => setSaveMsg(''), 3000);
  }

  async function handleReprocess() {
    setErrorBusy(true);
    try {
      await api.reprocessConsultation(id);
      setErrorMessage('');
      setPollFailCount(0);
      setPipelineStep(null);
      setPipelineStartedAt(new Date().toISOString());
      setPipelineUpdatedAt(new Date().toISOString());
      setPhase('processing');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '再処理に失敗しました');
      setCanReprocess(false);
    } finally {
      setErrorBusy(false);
    }
  }

  async function handleRerecord() {
    setErrorBusy(true);
    try {
      await api.resetRecording(id);
      setErrorMessage('');
      setCanReprocess(false);
      setConsentGiven(false);
      // 録り直しは「前回うまく録れなかった」が理由のことが多い。マイク確認から始め直す
      setMicCheckOpen(true);
      setPhase('recording');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '録り直しの準備に失敗しました');
    } finally {
      setErrorBusy(false);
    }
  }

  /**
   * 同じ診察の続きを録る。
   *
   * 2026-09-28、谷口先生の池田さんの診察。採血のあいだに患者さんが退室し、そのあいだに
   * 別の患者さんを診て、戻ってきてから結果を説明された。画面の一時停止では、別の患者さんの
   * 画面へ移った時点で続けられない。前半を残したまま録り足し、止めたときに全体で作り直す。
   */
  async function handleAppendRecording() {
    setErrorBusy(true);
    try {
      await recording.startAppend();
      setErrorMessage('');
      setPhase('recording');
    } catch (error) {
      setCopyMsg(
        error instanceof Error ? error.message : '続きの録音を開始できませんでした',
      );
      setTimeout(() => setCopyMsg(''), 5000);
    } finally {
      setErrorBusy(false);
    }
  }

  async function handleGenerateAll() {
    setGeneratingDocs(true);
    try {
      await api.generateAllDocuments(id);
      setCopyMsg('全書類を生成しました。書類セクションで確認できます。');
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
        onStart={() => {
          setMicCheckOpen(false);
          return recording.start();
        }}
        onPause={recording.pause}
        onResume={recording.resume}
        onStop={handleStop}
        mic={mic}
        liveLevel={recording.level}
        liveVerdict={recording.micVerdict}
        liveMicLabel={recording.micLabel}
        density={density}
      />
    );
  }

  if (phase === 'processing') {
    return (
      <ProcessingPhase
        density={density}
        pipelineStep={pipelineStep}
        pipelineStartedAt={pipelineStartedAt}
      />
    );
  }

  if (phase === 'error') {
    return (
      <ErrorPhase
        message={errorMessage}
        onBack={() => router.push(backHref)}
        backLabel="診療ホームに戻る"
        density={density}
        canReprocess={canReprocess}
        onReprocess={handleReprocess}
        onRerecord={handleRerecord}
        busy={errorBusy}
      />
    );
  }

  return (
    <ReviewPhase
      consultationId={id}
      caseName={caseName}
      visitType={visitType}
      soap={soap}
      note={note}
      warnings={warnings}
      transcript={transcript}
      revisions={revisions}
      approved={approved}
      copied={copied}
      soapDirty={soapDirty}
      copyMsg={copyMsg}
      saveMsg={saveMsg}
      onSoapChange={setSoap}
      onNoteChange={setNote}
      onSaveSoap={saveSoap}
      onSaveNote={saveNote}
      onSpeakerChange={handleSpeakerChange}
      onTranscriptTextChange={handleTranscriptTextChange}
      onSaveTranscript={handleSaveTranscript}
      savingTranscript={savingTranscript}
      glossarySuggestions={glossarySuggestions}
      onAddGlossarySuggestions={handleAddGlossarySuggestions}
      onDismissGlossarySuggestions={() => setGlossarySuggestions([])}
      onApprove={handleApprove}
      onCopySoap={handleCopySoap}
      onCopyNote={handleCopyNote}
      onGenerateAll={handleGenerateAll}
      onReprocess={handleReprocess}
      onAppendRecording={approved ? undefined : handleAppendRecording}
      reprocessing={errorBusy}
      generatingDocs={generatingDocs}
      documentInput={{ ...documentInput, soap }}
      density={density}
      backHref={backHref}
    />
  );
}
