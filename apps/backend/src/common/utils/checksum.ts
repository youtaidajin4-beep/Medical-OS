import { createHash } from 'crypto';
import { BadRequestException } from '@nestjs/common';

export function computeSha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function verifyChecksum(buffer: Buffer, expected?: string): void {
  if (!expected) return;
  const actual = computeSha256(buffer);
  if (actual !== expected) {
    throw new BadRequestException('Chunk checksum mismatch');
  }
}
