import { TranscriptNormalizer } from '../src/modules/ai/transcript-normalizer';
import { verifyChecksum, computeSha256 } from '../src/common/utils/checksum';

describe('TranscriptNormalizer', () => {
  const normalizer = new TranscriptNormalizer();

  it('normalizes whitespace and adds trailing punctuation', () => {
    const result = normalizer.normalize([{ text: '  咳が出る  ', confidence: 0.9 }]);
    expect(result[0]?.text).toBe('咳が出る。');
  });

  it('maps low confidence speakers to unknown', () => {
    const result = normalizer.normalize([
      { text: 'こんにちは', speaker: 'patient', confidence: 0.5 },
    ]);
    expect(result[0]?.speaker).toBe('unknown');
  });
});

describe('checksum utils', () => {
  it('verifies matching checksum', () => {
    const buffer = Buffer.from('audio-chunk');
    const checksum = computeSha256(buffer);
    expect(() => verifyChecksum(buffer, checksum)).not.toThrow();
  });

  it('rejects mismatched checksum', () => {
    const buffer = Buffer.from('audio-chunk');
    expect(() => verifyChecksum(buffer, 'deadbeef')).toThrow('Chunk checksum mismatch');
  });
});
