import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { computeSha256, verifyChecksum } from '../../common/utils/checksum';
import { STORAGE_PROVIDER, StorageProvider } from '../../providers/storage/storage.provider';
import { TranscriptService } from '../transcript/transcript.service';
import { AudioAssemblerService } from './audio-assembler.service';

@Injectable()
export class RecordingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly transcriptService: TranscriptService,
    private readonly audioAssembler: AudioAssemblerService,
  ) {}

  async uploadFinalRecording(consultationId: string, buffer: Buffer, checksum?: string) {
    verifyChecksum(buffer, checksum);
    const chunks = await this.listChunks(consultationId);
    for (const chunk of chunks) {
      await this.storage.delete(chunk.storageKey).catch(() => undefined);
      await this.prisma.audioChunk.delete({ where: { id: chunk.id } });
    }
    const files = await this.prisma.audioFile.findMany({
      where: { consultationId, deletedAt: null },
    });
    for (const file of files) {
      await this.storage.delete(file.storageKey).catch(() => undefined);
      await this.prisma.audioFile.update({
        where: { id: file.id },
        data: { deletedAt: new Date(), deleteStatus: 'deleted' },
      });
    }
    return this.uploadChunk(consultationId, 0, buffer, checksum);
  }

  async uploadChunk(
    consultationId: string,
    sequenceNumber: number,
    buffer: Buffer,
    checksum?: string,
  ) {
    verifyChecksum(buffer, checksum);
    const hash = checksum ?? computeSha256(buffer);

    const existing = await this.prisma.audioChunk.findUnique({
      where: {
        consultationId_sequenceNumber: { consultationId, sequenceNumber },
      },
    });
    if (existing) {
      return existing;
    }

    const storageKey = `${consultationId}/${sequenceNumber}.webm`;
    await this.storage.put(storageKey, buffer);

    const chunk = await this.prisma.audioChunk.create({
      data: { consultationId, sequenceNumber, storageKey, checksum: hash },
    });

    void this.transcriptService.processPreviewChunk(consultationId, sequenceNumber, buffer).catch(
      () => {
        // Pass1 preview failures are non-fatal
      },
    );

    return chunk;
  }

  async listChunks(consultationId: string) {
    return this.prisma.audioChunk.findMany({
      where: { consultationId },
      orderBy: { sequenceNumber: 'asc' },
    });
  }

  async assembleAudioFile(consultationId: string) {
    const existingFile = await this.prisma.audioFile.findFirst({
      where: {
        consultationId,
        deletedAt: null,
        storageKey: { startsWith: `${consultationId}/full.` },
      },
    });
    if (existingFile) {
      return existingFile;
    }

    const chunks = await this.listChunks(consultationId);
    const buffers = await Promise.all(chunks.map((c) => this.storage.get(c.storageKey)));
    const assembled = await this.audioAssembler.assemble(buffers);
    const storageKey = `${consultationId}/full.${assembled.extension}`;
    await this.storage.put(storageKey, assembled.buffer);

    return this.prisma.audioFile.create({
      data: { consultationId, storageKey, durationSec: null },
    });
  }

  async getAssembledAudioBuffer(consultationId: string): Promise<Buffer> {
    const file = await this.assembleAudioFile(consultationId);
    return this.storage.get(file.storageKey);
  }

  async getExistingAssembledBuffer(consultationId: string): Promise<Buffer | null> {
    const existingFile = await this.prisma.audioFile.findFirst({
      where: {
        consultationId,
        deletedAt: null,
        storageKey: { startsWith: `${consultationId}/full.` },
      },
    });
    if (!existingFile) return null;
    try {
      return await this.storage.get(existingFile.storageKey);
    } catch {
      return null;
    }
  }

  async hasAudio(consultationId: string): Promise<boolean> {
    const chunks = await this.listChunks(consultationId);
    if (chunks.length > 0) return true;
    const existing = await this.getExistingAssembledBuffer(consultationId);
    return Boolean(existing);
  }

  async resetAudioForRerecord(consultationId: string) {
    await this.deleteAudioForConsultation(consultationId);
    await this.prisma.audioChunk.deleteMany({ where: { consultationId } });
  }

  async deleteAudioForConsultation(consultationId: string) {
    const files = await this.prisma.audioFile.findMany({ where: { consultationId } });
    for (const file of files) {
      await this.storage.delete(file.storageKey);
      await this.prisma.audioFile.update({
        where: { id: file.id },
        data: { deletedAt: new Date(), deleteStatus: 'deleted' },
      });
    }
    const chunks = await this.prisma.audioChunk.findMany({ where: { consultationId } });
    for (const chunk of chunks) {
      await this.storage.delete(chunk.storageKey);
    }
    return { deleted: files.length, chunks: chunks.length };
  }
}
