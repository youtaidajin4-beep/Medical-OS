import { ConsultationStatus } from '@prisma/client';
import { AiPipelineService } from '../src/modules/ai/ai-pipeline.service';
import { TranscriptService } from '../src/modules/transcript/transcript.service';
import { RecordingService } from '../src/modules/recording/recording.service';
import { PrismaService } from '../src/database/prisma.service';
import { MockLlmProvider } from '../src/providers/ai/llm.provider';
import { MockSttProvider } from '../src/providers/ai/stt.provider';

describe('AiPipelineService integration shape', () => {
  const prisma = {
    aIExecution: { create: jest.fn() },
    structuredClinicalData: { upsert: jest.fn() },
    clinicalWarning: { deleteMany: jest.fn(), createMany: jest.fn() },
    soapDocument: { create: jest.fn() },
    clinicalNote: { create: jest.fn() },
    consultation: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'consultation-1',
        patient: { patientCode: 'P-001' },
        anonymousCase: null,
      }),
      update: jest.fn(),
    },
  } as unknown as PrismaService;

  const transcriptService = {
    finalizeFromAudio: jest.fn().mockResolvedValue([
      { text: '3日前から咳が出て、少し息苦しいです。' },
      { text: '熱はありましたか？' },
    ]),
    toFullText: jest.fn().mockReturnValue('3日前から咳が出て、少し息苦しいです。\n熱はありましたか？'),
  } as unknown as TranscriptService;

  const recordingService = {
    listChunks: jest.fn().mockResolvedValue([{ sequenceNumber: 0 }]),
    getAssembledAudioBuffer: jest.fn().mockResolvedValue(Buffer.from('audio')),
    deleteAudioForConsultation: jest.fn().mockResolvedValue({ deleted: 1, chunks: 2 }),
  } as unknown as RecordingService;

  const llmProvider = new MockLlmProvider();
  const sttProvider = new MockSttProvider();

  const service = new AiPipelineService(
    prisma,
    transcriptService,
    recordingService,
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
    );
    expect(result.status).toBe('REVIEW');
  });
});
