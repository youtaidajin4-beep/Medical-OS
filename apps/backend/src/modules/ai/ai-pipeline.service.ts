import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConsultationStatus, WarningSeverity } from '@prisma/client';
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

      const chunks = await this.recordingService.listChunks(consultationId);
      let audio: Buffer;
      if (chunks.length > 0) {
        audio = await this.recordingService.getAssembledAudioBuffer(consultationId);
      } else if (isMock) {
        audio = Buffer.alloc(128);
      } else {
        throw new Error('録音データがありません。マイクの入力を確認して再度録音してください。');
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

      const sttStart = Date.now();
      await this.transcriptService.finalizeFromAudio(consultationId, audio, {
        whisperPrompt,
      });
      await logAiExecution(this.prisma, {
        consultationId,
        step: 'stt_complete',
        provider: this.sttProvider.name,
        status: 'completed',
        durationMs: Date.now() - sttStart,
        promptVersion: isMock ? 'mock-v1' : 'openai-whisper-v1',
      });

      const segments = await this.transcriptService.getSegments(consultationId, { final: true });
      let fullText = this.transcriptService.toFullText(segments);
      if (!fullText.trim()) {
        throw new Error(
          '文字起こし結果が空です。マイク入力とSTT設定を確認してください。',
        );
      }

      const dictStart = Date.now();
      const dictResult = correctMedicalTerms(fullText, glossary);
      fullText = dictResult.text;
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

      if (!isMock) {
        const llmCorrectStart = Date.now();
        fullText = await this.llmProvider.correctTranscript(fullText, glossary, consultationId);
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

      await this.transcriptService.replaceFinalTranscript(consultationId, fullText);

      const extractStart = Date.now();
      const structured = await this.llmProvider.extractStructured(fullText, consultationId);
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
        : this.generateLegacyWarnings(structured);
      await this.prisma.clinicalWarning.deleteMany({ where: { consultationId } });
      if (warnings.length) {
        await this.prisma.clinicalWarning.createMany({
          data: warnings.map((w) => ({ consultationId, ...w })),
        });
      }

      const soapStart = Date.now();
      const soap = await this.llmProvider.generateSoap(structured, consultationId);
      await logAiExecution(this.prisma, {
        consultationId,
        step: 'soap_complete',
        provider: this.llmProvider.name,
        status: 'completed',
        durationMs: Date.now() - soapStart,
        promptVersion: isMock ? 'mock-v1' : 'openai-soap-v1',
        ...this.getLlmUsage(),
      });

      const noteStart = Date.now();
      const clinicalNote = await this.llmProvider.generateClinicalNote(structured, consultationId);
      await logAiExecution(this.prisma, {
        consultationId,
        step: 'note_complete',
        provider: this.llmProvider.name,
        status: 'completed',
        durationMs: Date.now() - noteStart,
        promptVersion: isMock ? 'mock-v1' : 'openai-note-v1',
        ...this.getLlmUsage(),
      });

      await this.prisma.soapDocument.create({
        data: { consultationId, ...soap, version: 1, isAiGenerated: true },
      });
      await this.prisma.clinicalNote.create({
        data: { consultationId, content: clinicalNote, version: 1, isAiGenerated: true },
      });

      await this.prisma.consultation.update({
        where: { id: consultationId },
        data: { status: ConsultationStatus.REVIEW },
      });

      await this.recordingService.deleteAudioForConsultation(consultationId);

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

  private getLlmUsage(): { inputTokens?: number; outputTokens?: number } {
    const provider = this.llmProvider as LlmProvider & {
      getLastUsage?: () => { inputTokens?: number; outputTokens?: number };
    };
    return provider.getLastUsage?.() ?? {};
  }

  private generateLegacyWarnings(structured: Record<string, unknown>) {
    const warnings: { category: string; message: string; severity: WarningSeverity }[] = [];
    const meds = structured.medications as string[] | undefined;
    if (meds?.some((m) => m.includes('要確認'))) {
      warnings.push({
        category: 'medication',
        message: '要確認：薬剤名または用量を特定できません',
        severity: WarningSeverity.WARNING,
      });
    }
    return warnings;
  }
}
