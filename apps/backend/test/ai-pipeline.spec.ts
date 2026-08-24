import { ConsultationStatus } from '@prisma/client';
import { AiPipelineService } from '../src/modules/ai/ai-pipeline.service';
import { TranscriptService } from '../src/modules/transcript/transcript.service';
import { RecordingService } from '../src/modules/recording/recording.service';
import { SettingsService } from '../src/modules/settings/settings.service';
import { PrismaService } from '../src/database/prisma.service';
import { MockLlmProvider } from '../src/providers/ai/llm.provider';
import { MockSttProvider } from '../src/providers/ai/stt.provider';
import { DEFAULT_PHYSICIAN_RULES } from '../src/modules/settings/physician-rules.types';
import { MedicalKnowledgeService } from '../src/modules/medical-knowledge/medical-knowledge.service';

describe('AiPipelineService integration shape', () => {
  const prisma = {
    aIExecution: { create: jest.fn() },
    structuredClinicalData: { upsert: jest.fn() },
    clinicalWarning: { deleteMany: jest.fn(), createMany: jest.fn() },
    soapDocument: { create: jest.fn() },
    clinicalNote: { create: jest.fn() },
    revisionHistory: { findMany: jest.fn().mockResolvedValue([]) },
    consultationAttachment: { findFirst: jest.fn().mockResolvedValue(null) },
    consultation: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'consultation-1',
        clinicId: 'clinic-1',
        physicianId: 'physician-1',
        visitType: 'ROUTINE',
        patient: { patientCode: 'P-001' },
        anonymousCase: null,
      }),
      update: jest.fn(),
    },
  } as unknown as PrismaService;

  const transcriptService = {
    finalizeFromAudio: jest.fn().mockResolvedValue([
      { id: 'seg-1', text: '3日前から咳が出て、少し息苦しいです。', speaker: 'PATIENT' },
      { id: 'seg-2', text: '熱はありましたか？', speaker: 'PHYSICIAN' },
    ]),
    getSegments: jest.fn().mockResolvedValue([
      { id: 'seg-1', text: '3日前から咳が出て、少し息苦しいです。', rawText: '3日前から咳が出て、少し息苦しいです。', speaker: 'PATIENT' },
      { id: 'seg-2', text: '熱はありましたか？', rawText: '熱はありましたか？', speaker: 'PHYSICIAN' },
    ]),
    updateFinalSegmentTexts: jest.fn().mockImplementation(async (_id, updates) =>
      updates.map((u: { id: string; text: string }, i: number) => ({
        id: u.id,
        text: u.text,
        speaker: i === 0 ? 'PATIENT' : 'PHYSICIAN',
      })),
    ),
    toSpeakerPrefixedText: jest.fn().mockReturnValue('患者: 3日前から咳が出て、少し息苦しいです。\n医師: 熱はありましたか？'),
    toFullText: jest.fn().mockReturnValue('3日前から咳が出て、少し息苦しいです。\n熱はありましたか？'),
  } as unknown as TranscriptService;

  const recordingService = {
    listChunks: jest.fn().mockResolvedValue([{ sequenceNumber: 0 }]),
    getAssembledAudioBuffer: jest.fn().mockResolvedValue(Buffer.from('audio')),
    getExistingAssembledBuffer: jest.fn().mockResolvedValue(null),
    deleteAudioForConsultation: jest.fn().mockResolvedValue({ deleted: 1, chunks: 2 }),
  } as unknown as RecordingService;

  const settingsService = {
    getPhysicianRules: jest.fn().mockResolvedValue(DEFAULT_PHYSICIAN_RULES),
  } as unknown as SettingsService;

  const medicalKnowledge = {
    correct: jest.fn().mockImplementation((text: string) => ({
      rawText: text,
      correctedText: text,
      entities: [],
      corrections: [],
      automaticCorrectionCount: 0,
      reviewRequiredCount: 0,
    })),
    persistCorrectionResult: jest.fn().mockResolvedValue(undefined),
  } as unknown as MedicalKnowledgeService;

  const llmProvider = new MockLlmProvider();
  const sttProvider = new MockSttProvider();

  const service = new AiPipelineService(
    prisma,
    transcriptService,
    recordingService,
    settingsService,
    medicalKnowledge,
    llmProvider,
    sttProvider,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs STT final pass before generating documents', async () => {
    const promise = service.processConsultation('consultation-1');
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(recordingService.listChunks).toHaveBeenCalledWith('consultation-1');
    expect(recordingService.getAssembledAudioBuffer).toHaveBeenCalledWith('consultation-1');
    expect(transcriptService.finalizeFromAudio).toHaveBeenCalled();
    expect(transcriptService.updateFinalSegmentTexts).toHaveBeenCalled();
    expect(transcriptService.toSpeakerPrefixedText).toHaveBeenCalled();
    expect(prisma.consultation.update).toHaveBeenCalledWith({
      where: { id: 'consultation-1' },
      data: { status: ConsultationStatus.REVIEW },
    });
    expect(result.status).toBe('REVIEW');
  });

  it('generates mock documents without audio chunks', async () => {
    (recordingService.listChunks as jest.Mock).mockResolvedValueOnce([]);

    const promise = service.processConsultation('consultation-1');
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(recordingService.getAssembledAudioBuffer).not.toHaveBeenCalled();
    expect(transcriptService.finalizeFromAudio).toHaveBeenCalledWith(
      'consultation-1',
      expect.any(Buffer),
      expect.objectContaining({ whisperPrompt: undefined }),
    );
    expect(result.status).toBe('REVIEW');
  });
});
