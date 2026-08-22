import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { getFfmpegPath, isFfmpegAvailable } from '../../providers/ai/ffmpeg.util';

const execFileAsync = promisify(execFile);

/** OpenAI Whisper file upload limit is 25MB. Keep a safety margin. */
export const WHISPER_MAX_UPLOAD_BYTES = 24 * 1024 * 1024;

@Injectable()
export class AudioAssemblerService {
  private readonly logger = new Logger(AudioAssemblerService.name);

  async assemble(chunkBuffers: Buffer[]): Promise<{ buffer: Buffer; mimeType: string; extension: string }> {
    if (chunkBuffers.length === 0) {
      throw new Error('No audio chunks to assemble');
    }

    if (!(await this.isFfmpegAvailable())) {
      throw new Error(
        'ffmpeg がインストールされていません。Whisper 用に音声を圧縮できません。brew install ffmpeg を実行してください。',
      );
    }

    if (chunkBuffers.length === 1) {
      const converted = await this.convertToMp3Required(chunkBuffers[0]!, 'chunk-0.webm');
      this.assertWhisperSize(converted.buffer);
      return converted;
    }

    const concatenated = await this.tryFfmpegConcat(chunkBuffers);
    if (concatenated) {
      this.assertWhisperSize(concatenated.buffer);
      return concatenated;
    }

    throw new Error(
      'ffmpeg が必要です。音声を結合・圧縮できません。brew install ffmpeg を実行するか、本番環境の ffmpeg 設定を確認してください。',
    );
  }

  private assertWhisperSize(buffer: Buffer) {
    if (buffer.length > WHISPER_MAX_UPLOAD_BYTES) {
      throw new Error(
        `録音が長すぎます（約${Math.round(buffer.length / (1024 * 1024))}MB）。文字起こし上限を超えるため、短く区切って録り直すか、診療を分割してください。`,
      );
    }
  }

  private async convertToMp3Required(
    buffer: Buffer,
    filename: string,
  ): Promise<{ buffer: Buffer; mimeType: string; extension: string }> {
    const converted = await this.tryConvertToMp3(buffer, filename);
    if (!converted) {
      throw new Error(
        '音声の MP3 変換に失敗しました。録音形式または ffmpeg 設定を確認してください。',
      );
    }
    return converted;
  }

  private async isFfmpegAvailable(): Promise<boolean> {
    return isFfmpegAvailable();
  }

  private async tryFfmpegConcat(chunkBuffers: Buffer[]): Promise<{
    buffer: Buffer;
    mimeType: string;
    extension: string;
  } | null> {
    if (!(await this.isFfmpegAvailable())) return null;

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medical-os-audio-'));
    try {
      const chunkPaths: string[] = [];
      for (let i = 0; i < chunkBuffers.length; i++) {
        const chunk = chunkBuffers[i]!;
        const chunkPath = path.join(tmpDir, `chunk-${i}.webm`);
        fs.writeFileSync(chunkPath, chunk);
        chunkPaths.push(chunkPath);
      }

      const listPath = path.join(tmpDir, 'concat.txt');
      const listContent = chunkPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
      fs.writeFileSync(listPath, listContent);

      const mergedWebm = path.join(tmpDir, 'merged.webm');
      await execFileAsync(getFfmpegPath(), [
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        listPath,
        '-c',
        'copy',
        mergedWebm,
        '-y',
      ]);

      const mp3Path = path.join(tmpDir, 'output.mp3');
      await execFileAsync(getFfmpegPath(), [
        '-i',
        mergedWebm,
        '-ar',
        '16000',
        '-ac',
        '1',
        '-c:a',
        'libmp3lame',
        '-b:a',
        '64k',
        mp3Path,
        '-y',
      ]);

      return {
        buffer: fs.readFileSync(mp3Path),
        mimeType: 'audio/mpeg',
        extension: 'mp3',
      };
    } catch (error) {
      this.logger.warn('ffmpeg concat failed', error);
      return null;
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  private async tryConvertToMp3(
    buffer: Buffer,
    filename: string,
  ): Promise<{ buffer: Buffer; mimeType: string; extension: string } | null> {
    if (!(await this.isFfmpegAvailable())) return null;

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medical-os-audio-'));
    try {
      const inputPath = path.join(tmpDir, filename);
      const mp3Path = path.join(tmpDir, 'output.mp3');
      fs.writeFileSync(inputPath, buffer);
      await execFileAsync(getFfmpegPath(), [
        '-i',
        inputPath,
        '-ar',
        '16000',
        '-ac',
        '1',
        '-c:a',
        'libmp3lame',
        '-b:a',
        '64k',
        mp3Path,
        '-y',
      ]);
      return {
        buffer: fs.readFileSync(mp3Path),
        mimeType: 'audio/mpeg',
        extension: 'mp3',
      };
    } catch {
      return null;
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}
