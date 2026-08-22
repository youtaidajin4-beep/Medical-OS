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

  it('returns mp3 for single chunk when ffmpeg converts successfully', async () => {
    jest
      .spyOn(service as unknown as { isFfmpegAvailable: () => Promise<boolean> }, 'isFfmpegAvailable')
      .mockResolvedValue(true);
    jest
      .spyOn(
        service as unknown as {
          tryConvertToMp3: (
            buffer: Buffer,
            filename: string,
          ) => Promise<{ buffer: Buffer; mimeType: string; extension: string } | null>;
        },
        'tryConvertToMp3',
      )
      .mockResolvedValue({
        buffer: Buffer.from('mp3-data'),
        mimeType: 'audio/mpeg',
        extension: 'mp3',
      });

    const chunk = Buffer.from('webm-chunk-data');
    const result = await service.assemble([chunk]);
    expect(result.extension).toBe('mp3');
    expect(result.mimeType).toBe('audio/mpeg');
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
