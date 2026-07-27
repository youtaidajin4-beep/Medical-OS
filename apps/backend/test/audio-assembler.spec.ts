import { AudioAssemblerService } from '../src/modules/recording/audio-assembler.service';

describe('AudioAssemblerService', () => {
  const service = new AudioAssemblerService();

  it('throws for single chunk when ffmpeg is unavailable', async () => {
    jest
      .spyOn(service as unknown as { isFfmpegAvailable: () => Promise<boolean> }, 'isFfmpegAvailable')
      .mockResolvedValue(false);

    const chunk = Buffer.from('webm-chunk-data');
    await expect(service.assemble([chunk])).rejects.toThrow('ffmpeg');
  });

  it('returns wav for single chunk when ffmpeg converts successfully', async () => {
    jest
      .spyOn(service as unknown as { isFfmpegAvailable: () => Promise<boolean> }, 'isFfmpegAvailable')
      .mockResolvedValue(true);
    jest
      .spyOn(
        service as unknown as {
          tryConvertToWav: (
            buffer: Buffer,
            filename: string,
          ) => Promise<{ buffer: Buffer; mimeType: string; extension: string } | null>;
        },
        'tryConvertToWav',
      )
      .mockResolvedValue({
        buffer: Buffer.from('wav-data'),
        mimeType: 'audio/wav',
        extension: 'wav',
      });

    const chunk = Buffer.from('webm-chunk-data');
    const result = await service.assemble([chunk]);
    expect(result.extension).toBe('wav');
    expect(result.mimeType).toBe('audio/wav');
  });

  it('throws when multiple chunks and ffmpeg is unavailable', async () => {
    jest
      .spyOn(service as unknown as { isFfmpegAvailable: () => Promise<boolean> }, 'isFfmpegAvailable')
      .mockResolvedValue(false);

    const a = Buffer.from('chunk-a');
    const b = Buffer.from('chunk-b');
    await expect(service.assemble([a, b])).rejects.toThrow('ffmpeg');
  });
});
