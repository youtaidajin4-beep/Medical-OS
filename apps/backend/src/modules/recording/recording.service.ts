import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { computeSha256, verifyChecksum } from '../../common/utils/checksum';
import { STORAGE_PROVIDER, StorageProvider } from '../../providers/storage/storage.provider';
import { TranscriptService } from '../transcript/transcript.service';
import { AudioAssemblerService } from './audio-assembler.service';
import { resolveRetentionMinutes, retentionCutoff } from './audio-retention';

/** 保持期間切れの掃除を回す間隔。診療が無い日でも音声が残り続けないようにする */
const PURGE_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class RecordingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RecordingService.name);
  private purgeTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly transcriptService: TranscriptService,
    private readonly audioAssembler: AudioAssemblerService,
  ) {}

  onModuleInit() {
    void this.safePurge();
    this.purgeTimer = setInterval(() => {
      void this.safePurge();
    }, PURGE_INTERVAL_MS);
    // 掃除のためだけにプロセスを起こし続けない
    this.purgeTimer.unref?.();
  }

  /**
   * 掃除の失敗でAPIを落とさない。
   * 起動直後はDBがまだ受け付けないこともあり、そこで例外を投げると
   * 診療そのものが始められなくなる。次の実行で片付けばよい。
   */
  private async safePurge() {
    try {
      await this.purgeExpiredAudio();
    } catch (error) {
      this.logger.warn(
        `音声の掃除に失敗しました（次回の実行で再試行します）: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  onModuleDestroy() {
    if (this.purgeTimer) clearInterval(this.purgeTimer);
  }

  /**
   * 保持期間を過ぎた音声を消す。
   * 「処理後に自動削除（設定可能）」という方針は保ったまま、
   * 作り直せる時間だけ手元に置いておくための掃除。
   */
  async purgeExpiredAudio(now: Date = new Date()) {
    const retentionMinutes = resolveRetentionMinutes();
    const cutoff = retentionCutoff(now, retentionMinutes);

    const expiredFiles = await this.prisma.audioFile.findMany({
      where: { deletedAt: null, createdAt: { lt: cutoff } },
      select: { id: true, storageKey: true },
    });
    for (const file of expiredFiles) {
      await this.storage.delete(file.storageKey).catch(() => undefined);
      await this.prisma.audioFile.update({
        where: { id: file.id },
        data: { deletedAt: now, deleteStatus: 'deleted' },
      });
    }

    const expiredChunks = await this.prisma.audioChunk.findMany({
      where: { uploadedAt: { lt: cutoff } },
      select: { id: true, storageKey: true },
    });
    for (const chunk of expiredChunks) {
      await this.storage.delete(chunk.storageKey).catch(() => undefined);
    }
    if (expiredChunks.length) {
      await this.prisma.audioChunk.deleteMany({
        where: { id: { in: expiredChunks.map((c) => c.id) } },
      });
    }

    if (expiredFiles.length || expiredChunks.length) {
      this.logger.log(
        `期限切れの音声を削除: ファイル${expiredFiles.length}件 / チャンク${expiredChunks.length}件（保持${retentionMinutes}分）`,
      );
    }
    return { files: expiredFiles.length, chunks: expiredChunks.length };
  }

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
