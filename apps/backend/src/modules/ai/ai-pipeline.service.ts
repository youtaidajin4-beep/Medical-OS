import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConsultationStatus, DocumentType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TranscriptService } from '../transcript/transcript.service';
import { RecordingService } from '../recording/recording.service';
import { SettingsService } from '../settings/settings.service';
import { LlmProvider, StructuredClinicalDataSchema } from '../../providers/ai/llm.provider';
import { LLM_PROVIDER } from '../../providers/ai/llm.tokens';
import { STT_PROVIDER } from '../../providers/ai/stt.tokens';
import { SttProvider } from '../../providers/ai/stt.provider';
import { mockScenarioContext } from '../../providers/ai/mock-scenario-context';
import { resolveMockScenario } from '../../providers/ai/mock-scenarios';
import { localizeOpenAiError } from '../../providers/ai/openai-retry.util';
import { buildWhisperPrompt, resolveMedicalGlossary } from '../../providers/ai/medical-glossary';
import { correctMedicalTerms } from '../../providers/ai/medical-term-corrector';
import { validateStructuredData } from '../../providers/ai/clinical-data-validator';
import { buildTranscriptQualityWarnings } from '../../providers/ai/transcript-quality-warnings';
import {
  assessSoapEvidence,
  buildMissingEvidenceWarning,
} from '../../providers/ai/soap-evidence';
import { redistributeCorrectedLines } from '../../providers/ai/speaker-role-mapper';
import {
  resolveSoapVisitType,
  SOAP_TEMPLATE_FLOORS,
} from '../../providers/ai/soap-templates';
import {
  deletesImmediately,
  resolveRetentionMinutes,
} from '../recording/audio-retention';
import { MedicalKnowledgeService } from '../medical-knowledge/medical-knowledge.service';
import { logAiExecution } from './ai-execution.helper';

const MOCK_PIPELINE_DELAY_MS = 2500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class AiPipelineService {
  private readonly logger = new Logger(AiPipelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transcriptService: TranscriptService,
    private readonly recordingService: RecordingService,
    private readonly settingsService: SettingsService,
    private readonly medicalKnowledge: MedicalKnowledgeService,
    @Inject(LLM_PROVIDER) private readonly llmProvider: LlmProvider,
    @Inject(STT_PROVIDER) private readonly sttProvider: SttProvider,
  ) {}

  async processConsultation(consultationId: string) {
    const start = Date.now();
    const isMock = this.sttProvider.name === 'mock' && this.llmProvider.name === 'mock';
    const providerLabel = `${this.sttProvider.name}+${this.llmProvider.name}`;

    try {
      const consultation = await this.prisma.consultation.findUnique({
        where: { id: consultationId },
        include: { patient: true, anonymousCase: true },
      });
      if (!consultation) {
        throw new Error('Consultation not found');
      }

      const physicianRules = await this.settingsService.getPhysicianRules(consultation.physicianId);
      const glossary = resolveMedicalGlossary(physicianRules);
      const whisperPrompt = isMock ? undefined : buildWhisperPrompt(glossary);

      if (isMock) {
        const scenario = resolveMockScenario(
          consultation.patient?.patientCode,
          consultation.anonymousCase?.caseCode,
        );
        mockScenarioContext.set(consultationId, scenario);
      }

      await logAiExecution(this.prisma, {
        consultationId,
        step: 'pipeline_start',
        provider: providerLabel,
        status: 'started',
      });

      if (isMock) {
        await sleep(MOCK_PIPELINE_DELAY_MS);
      }

      await logAiExecution(this.prisma, {
        consultationId,
        step: 'assemble_started',
        provider: providerLabel,
        status: 'started',
      });

      const chunks = await this.recordingService.listChunks(consultationId);
      let audio: Buffer;
      if (chunks.length > 0) {
        audio = await this.recordingService.getAssembledAudioBuffer(consultationId);
      } else {
        const existing = await this.recordingService.getExistingAssembledBuffer(consultationId);
        if (existing) {
          audio = existing;
        } else if (isMock) {
          audio = Buffer.alloc(128);
        } else {
          throw new Error(
            '録音データがありません。マイクの入力を確認して再度録音するか、「録り直す」からやり直してください。',
          );
        }
      }

      const recordingDurationSec =
        consultation.endedAt && consultation.startedAt
          ? (consultation.endedAt.getTime() - consultation.startedAt.getTime()) / 1000
          : null;
      const minExpectedBytes =
        recordingDurationSec && recordingDurationSec > 5
          ? Math.min(8000, Math.floor(recordingDurationSec * 200))
          : 1024;
      if (!isMock && audio.length < minExpectedBytes) {
        throw new Error(
          `録音データが不完全です（${Math.round(recordingDurationSec ?? 0)}秒録音に対し音声${audio.length}バイト）。通信状況を確認して再度録音してください。`,
        );
      }

      await logAiExecution(this.prisma, {
        consultationId,
        step: 'stt_started',
        provider: this.sttProvider.name,
        status: 'started',
      });
      const sttStart = Date.now();
      const { quality: transcriptQuality } = await this.transcriptService.finalizeFromAudio(
        consultationId,
        audio,
        {
          whisperPrompt,
          resolvePhysicianLabel: isMock
            ? undefined
            : async (_labelA, _labelB, sampleA, sampleB) =>
                this.resolvePhysicianSpeaker(sampleA, sampleB),
        },
      );
      // どの経路で文字起こししたか（話者分離が落ちて whisper へ下がっていないか）。
      // 画面には「話者が全部不明」としか出ないので、原因はここでしか辿れない
      const sttMode = (
        this.sttProvider as SttProvider & {
          getLastSttMode?: () => { mode: string; detail?: string };
        }
      ).getLastSttMode?.();
      await logAiExecution(this.prisma, {
        consultationId,
        step: 'stt_complete',
        provider: this.sttProvider.name,
        status: 'completed',
        durationMs: Date.now() - sttStart,
        promptVersion: isMock ? 'mock-v1' : `openai-${sttMode?.mode ?? 'diarize'}-v1`,
        errorMessage: sttMode?.detail,
      });

      const segments = await this.transcriptService.getSegments(consultationId, { final: true });
      const rawText = segments.map((s) => s.rawText ?? s.text).join('\n');
      let segmentTexts = segments.map((s) => s.text);
      if (!rawText.trim()) {
        throw new Error(
          '文字起こし結果が空です。マイク入力とSTT設定を確認してください。',
        );
      }

      // Legacy glossary homophone pass (kept for backward compatibility)
      const dictStart = Date.now();
      const dictJoined = segmentTexts.join('\n');
      const dictResult = correctMedicalTerms(dictJoined, glossary);
      segmentTexts = redistributeCorrectedLines(segmentTexts, dictResult.text);
      await logAiExecution(this.prisma, {
        consultationId,
        step: 'dict_correction_complete',
        provider: 'medical-term-corrector',
        status: 'completed',
        durationMs: Date.now() - dictStart,
        promptVersion: 'dict-v1',
        errorMessage:
          dictResult.replacements.length > 0
            ? JSON.stringify(dictResult.replacements)
            : undefined,
      });

      // Medical Knowledge Layer (RAG dictionary) — between STT and SOAP
      const knowledgeStart = Date.now();
      const patientMeds = glossary.drugNames ?? [];
      const patientDx = glossary.diagnoses ?? [];
      const knowledgeJoined = segmentTexts.join('\n');
      const knowledgeResult = await this.medicalKnowledge.correctForConsultation({
        rawText: knowledgeJoined,
        clinicId: consultation.clinicId,
        physicianId: consultation.physicianId,
        patientContext: {
          medications: patientMeds,
          diagnoses: patientDx,
        },
      });
      segmentTexts = redistributeCorrectedLines(segmentTexts, knowledgeResult.correctedText);
      await this.medicalKnowledge.persistCorrectionResult({
        clinicId: consultation.clinicId,
        physicianId: consultation.physicianId,
        consultationId,
        result: { ...knowledgeResult, rawText },
      });
      await logAiExecution(this.prisma, {
        consultationId,
        step: 'medical_knowledge_complete',
        provider: 'medical-knowledge-layer-v2',
        status: 'completed',
        durationMs: Date.now() - knowledgeStart,
        promptVersion: 'medical-knowledge-v2',
        errorMessage: JSON.stringify({
          automaticCorrectionCount: knowledgeResult.automaticCorrectionCount,
          reviewRequiredCount: knowledgeResult.reviewRequiredCount,
          entityCount: knowledgeResult.entities.length,
        }),
      });

      const glossaryWithHits = {
        ...glossary,
        sessionHits: knowledgeResult.entities
          .filter((e) => e.normalizedValue && e.rawValue !== e.normalizedValue)
          .slice(0, 24)
          .map((e) => ({
            rawValue: e.rawValue,
            normalizedValue: e.normalizedValue,
            entityType: e.entityType,
            needsReview: e.needsReview,
          })),
      };

      if (!isMock) {
        await logAiExecution(this.prisma, {
          consultationId,
          step: 'llm_correction_started',
          provider: this.llmProvider.name,
          status: 'started',
        });
        const llmCorrectStart = Date.now();
        const beforeLlm = segmentTexts;
        const llmCorrected = await this.llmProvider.correctTranscript(
          segmentTexts.join('\n'),
          glossaryWithHits,
          consultationId,
        );
        const redistributed = redistributeCorrectedLines(beforeLlm, llmCorrected);
        if (redistributed.join('\n') !== beforeLlm.join('\n')) {
          segmentTexts = redistributed;
        } else if (beforeLlm.length === 1 && llmCorrected.trim()) {
          segmentTexts = [llmCorrected.trim()];
        }
        // Line-count mismatch: keep original segments (speaker integrity) — never fan out N gpt-4o calls.
        await logAiExecution(this.prisma, {
          consultationId,
          step: 'llm_correction_complete',
          provider: this.llmProvider.name,
          status: 'completed',
          durationMs: Date.now() - llmCorrectStart,
          promptVersion: 'transcript_medical_correction_v1',
          ...this.getLlmUsage(),
        });
      }

      // Preserve diarized speakers — update display text per segment only
      const updatedSegments = await this.transcriptService.updateFinalSegmentTexts(
        consultationId,
        segments.map((seg, i) => ({ id: seg.id, text: segmentTexts[i] ?? seg.text })),
      );

      const reviewFlags = knowledgeResult.entities
        .filter((e) => e.needsReview && e.normalizedValue)
        .slice(0, 12)
        .map((e) => `[要確認:${e.entityType}:${e.rawValue}→${e.normalizedValue}]`);

      // Speaker-prefixed transcript for SOAP / structured extraction
      let soapSource = this.transcriptService.toSpeakerPrefixedText(updatedSegments);
      if (reviewFlags.length) {
        soapSource = `${soapSource}\n\n${reviewFlags.join('\n')}`;
      }

      await logAiExecution(this.prisma, {
        consultationId,
        step: 'extract_started',
        provider: this.llmProvider.name,
        status: 'started',
      });
      const extractStart = Date.now();
      const structured = await this.llmProvider.extractStructured(soapSource, consultationId);
      StructuredClinicalDataSchema.parse(structured);
      await logAiExecution(this.prisma, {
        consultationId,
        step: 'extract_complete',
        provider: this.llmProvider.name,
        status: 'completed',
        durationMs: Date.now() - extractStart,
        promptVersion: isMock ? 'mock-v1' : 'openai-extract-v1',
        ...this.getLlmUsage(),
      });

      await this.prisma.structuredClinicalData.upsert({
        where: { consultationId },
        create: { consultationId, data: structured },
        update: { data: structured, version: { increment: 1 } },
      });

      const warnings = isMock
        ? resolveMockScenario(
            consultation.patient?.patientCode,
            consultation.anonymousCase?.caseCode,
          ).warnings
        : validateStructuredData(structured, glossary);
      // 音声から診療の中身が取れているか。取れていなければ定型床は使わない
      // （使うと、診察で確認していない所見がそれらしく書かれてしまう）
      const evidence = isMock
        ? { usable: true, measuredChars: 0, requiredChars: 0 }
        : assessSoapEvidence({
            transcriptText: soapSource,
            structured,
            recordingDurationSec,
          });

      // 録音そのものの問題は、SOAPの中身の警告より先に医師へ見せる。
      // 「話者が全部不明」「同じ言葉の繰り返しを除外した」は、どちらもマイクが原因のことが多い
      const allWarnings = [
        ...buildMissingEvidenceWarning(evidence),
        ...buildTranscriptQualityWarnings(transcriptQuality),
        ...warnings,
      ];
      await this.prisma.clinicalWarning.deleteMany({ where: { consultationId } });
      if (allWarnings.length) {
        await this.prisma.clinicalWarning.createMany({
          data: allWarnings.map((w) => ({ consultationId, ...w })),
        });
      }

      const soapStart = Date.now();
      await logAiExecution(this.prisma, {
        consultationId,
        step: 'soap_started',
        provider: this.llmProvider.name,
        status: 'started',
      });
      const soapRevisions = await this.prisma.revisionHistory.findMany({
        where: {
          changedById: consultation.physicianId,
          documentType: { in: [DocumentType.SOAP, DocumentType.CLINICAL_NOTE] },
        },
        orderBy: { changedAt: 'desc' },
        take: 12,
      });
      const soapRevisionExamples = soapRevisions
        .map((r) => `[${r.fieldName}] 「${r.beforeValue}」→「${r.afterValue}」`)
        .join('\n');
      const visitType = resolveSoapVisitType(consultation.visitType);
      const templateFloor = SOAP_TEMPLATE_FLOORS[visitType];

      // 材料が無いときはモデルを呼ばない。呼べば必ず床が埋められて返ってくるため、
      // ここで止めないと「診察していない所見」がカルテに残る
      const generatedSoap = evidence.usable
        ? await this.withProgressHeartbeat(
            consultationId,
            'soap_progress',
            this.llmProvider.name,
            () =>
              this.llmProvider.generateSoap(structured, consultationId, {
                revisionExamples: soapRevisionExamples || undefined,
                greeting: physicianRules.fixedPhrases?.greeting,
                closing: physicianRules.fixedPhrases?.closing,
                visitType,
                templateFloor,
              }),
          )
        : { subjective: '', objective: '', assessment: '', plan: '' };
      const soap = { ...generatedSoap };
      const questionnaire = await this.prisma.consultationAttachment.findFirst({
        where: { consultationId, documentKind: 'questionnaire', ocrText: { not: null } },
        orderBy: { createdAt: 'desc' },
      });
      if (questionnaire?.ocrText && !soap.subjective.includes('【問診票】')) {
        soap.subjective = `【問診票】\n${questionnaire.ocrText.trim()}\n${soap.subjective}`.trim();
      }
      await logAiExecution(this.prisma, {
        consultationId,
        step: 'soap_complete',
        provider: this.llmProvider.name,
        // 空欄で返したことを実行ログに残す。あとから「なぜ空だったのか」を辿れるようにする。
        // 成功時も実測値を残す（しきい値を実診療のデータで詰めるため）
        status: evidence.usable ? 'completed' : 'skipped',
        errorMessage: evidence.usable
          ? `transcript=${evidence.measuredChars}字 / 必要=${evidence.requiredChars}字`
          : evidence.reason,
        durationMs: Date.now() - soapStart,
        promptVersion: isMock ? 'mock-v1' : 'openai-soap-v1',
        ...this.getLlmUsage(),
      });

      const noteStart = Date.now();
      // 診療録もSOAPと同じ材料から書く。材料が無いなら同じく空にする
      const clinicalNote = evidence.usable
        ? await this.withProgressHeartbeat(
            consultationId,
            'note_progress',
            this.llmProvider.name,
            () => this.llmProvider.generateClinicalNote(structured, consultationId),
          )
        : '';
      await logAiExecution(this.prisma, {
        consultationId,
        step: 'note_complete',
        provider: this.llmProvider.name,
        status: evidence.usable ? 'completed' : 'skipped',
        errorMessage: evidence.usable ? undefined : evidence.reason,
        durationMs: Date.now() - noteStart,
        promptVersion: isMock ? 'mock-v1' : 'openai-note-v1',
        ...this.getLlmUsage(),
      });

      await this.prisma.$transaction([
        this.prisma.soapDocument.create({
          data: { consultationId, ...soap, version: 1, isAiGenerated: true },
        }),
        this.prisma.clinicalNote.create({
          data: { consultationId, content: clinicalNote, version: 1, isAiGenerated: true },
        }),
        this.prisma.consultation.update({
          where: { id: consultationId },
          data: { status: ConsultationStatus.REVIEW },
        }),
      ]);

      // 以前はここで必ず音声を消していた。そのため「処理は通ったが中身が使えない」
      // ときに作り直す手段が無く、「もう一度処理する」も録音が無いと言われて弾かれていた
      // （2026-09-05 桑原さん・立川さん）。保持期間のあいだは残し、期限切れは掃除に任せる。
      if (deletesImmediately(resolveRetentionMinutes())) {
        await this.recordingService.deleteAudioForConsultation(consultationId);
      } else {
        // 掃除の失敗で診療の完了を潰さない（次の実行で片付く）
        await this.recordingService.purgeExpiredAudio().catch(() => undefined);
      }

      await logAiExecution(this.prisma, {
        consultationId,
        step: 'pipeline_complete',
        provider: providerLabel,
        status: 'completed',
        durationMs: Date.now() - start,
        promptVersion: isMock ? 'mock-v1' : 'openai-v1',
      });

      return { consultationId, status: 'REVIEW' };
    } catch (error) {
      this.logger.error(`Pipeline failed for ${consultationId}`, error);
      const raw = error instanceof Error ? error.message : 'Unknown error';
      const message = isMock ? raw : localizeOpenAiError(raw);
      await logAiExecution(this.prisma, {
        consultationId,
        step: 'pipeline_failed',
        provider: providerLabel,
        status: 'failed',
        durationMs: Date.now() - start,
        errorMessage: message,
      });
      throw new Error(message);
    } finally {
      mockScenarioContext.clear(consultationId);
    }
  }

  private async resolvePhysicianSpeaker(
    sampleA: string,
    sampleB: string,
  ): Promise<'A' | 'B' | null> {
    if (!this.llmProvider.consultChat) return null;
    try {
      const reply = await this.llmProvider.consultChat(
        'あなたは診察音声の話者判定のみを行う。回答は A または B の1文字だけ。説明不要。',
        [
          {
            role: 'user',
            content: `次の2クラスタのどちらが医師の発話か判定してください。\n\n【A】\n${sampleA}\n\n【B】\n${sampleB}\n\n答えは A または B のみ。`,
          },
        ],
      );
      const letter = reply.trim().toUpperCase().match(/[AB]/)?.[0];
      if (letter === 'A' || letter === 'B') return letter;
      return null;
    } catch (error) {
      this.logger.warn(
        `Speaker role LLM tie-break failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async withProgressHeartbeat<T>(
    consultationId: string,
    step: string,
    provider: string,
    work: () => Promise<T>,
  ): Promise<T> {
    const interval = setInterval(() => {
      void logAiExecution(this.prisma, {
        consultationId,
        step,
        provider,
        status: 'started',
      }).catch((error) => {
        this.logger.warn(
          `Heartbeat log failed (${step}): ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }, 60_000);
    try {
      return await work();
    } finally {
      clearInterval(interval);
    }
  }

  private getLlmUsage(): { inputTokens?: number; outputTokens?: number } {
    const provider = this.llmProvider as LlmProvider & {
      getLastUsage?: () => { inputTokens?: number; outputTokens?: number };
    };
    return provider.getLastUsage?.() ?? {};
  }
}
