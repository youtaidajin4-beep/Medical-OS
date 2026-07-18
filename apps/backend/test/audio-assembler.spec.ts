import { AudioAssemblerService } from '../src/modules/recording/audio-assembler.service';

describe('AudioAssemblerService', () => {
  const service = new AudioAssemblerService();

  it('returns single chunk buffer when only one chunk exists', async () => {
    const chunk = Buffer.from('webm-chunk-data');
    const result = await service.assemble([chunk]);
    expect(result.buffer.equals(chunk) || result.extension === 'wav').toBe(true);
  });

  it('throws when multiple chunks and ffmpeg is unavailable', async () => {
    jest.spyOn(service as unknown as { isFfmpegAvailable: () => Promise<boolean> }, 'isFfmpegAvailable').mockResolvedValue(false);

    const a = Buffer.from('chunk-a');
    const b = Buffer.from('chunk-b');
    await expect(service.assemble([a, b])).rejects.toThrow('ffmpeg');
  });
});
