import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { isFfmpegAvailable } from '../../providers/ai/ffmpeg.util';

const execFileAsync = promisify(execFile);

@Injectable()
export class AudioAssemblerService {
  private readonly logger = new Logger(AudioAssemblerService.name);

  async assemble(chunkBuffers: Buffer[]): Promise<{ buffer: Buffer; mimeType: string; extension: string }> {
    if (chunkBuffers.length === 0) {
      throw new Error('No audio chunks to assemble');
    }

    if (chunkBuffers.length === 1) {
      const single = chunkBuffers[0]!;
      const converted = await this.convertToWavRequired(single, 'chunk-0.webm');
      return converted;
    }

    const concatenated = await this.tryFfmpegConcat(chunkBuffers);
    if (concatenated) return concatenated;

    throw new Error(
      'ffmpeg が必要です。音声を WAV に変換できません。brew install ffmpeg を実行するか、本番環境の ffmpeg 設定を確認してください。',
    );
  }

  private async convertToWavRequired(
    buffer: Buffer,
    filename: string,
  ): Promise<{ buffer: Buffer; mimeType: string; extension: string }> {
    if (!(await this.isFfmpegAvailable())) {
      throw new Error(
        'ffmpeg がインストールされていません。Whisper 用に音声を WAV 変換できません。brew install ffmpeg を実行してください。',
      );
    }
    const converted = await this.tryConvertToWav(buffer, filename);
    if (!converted) {
      throw new Error(
        '音声の WAV 変換に失敗しました。録音形式または ffmpeg 設定を確認してください。',
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
      await execFileAsync('ffmpeg', [
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

      const wavPath = path.join(tmpDir, 'output.wav');
      await execFileAsync('ffmpeg', [
        '-i',
        mergedWebm,
        '-ar',
        '16000',
        '-ac',
        '1',
        '-c:a',
        'pcm_s16le',
        wavPath,
        '-y',
      ]);

      return {
        buffer: fs.readFileSync(wavPath),
        mimeType: 'audio/wav',
        extension: 'wav',
      };
    } catch (error) {
      this.logger.warn('ffmpeg concat failed', error);
      return null;
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  private async tryConvertToWav(
    buffer: Buffer,
    filename: string,
  ): Promise<{ buffer: Buffer; mimeType: string; extension: string } | null> {
    if (!(await this.isFfmpegAvailable())) return null;

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'medical-os-audio-'));
    try {
      const inputPath = path.join(tmpDir, filename);
      const wavPath = path.join(tmpDir, 'output.wav');
      fs.writeFileSync(inputPath, buffer);
      await execFileAsync('ffmpeg', [
        '-i',
        inputPath,
        '-ar',
        '16000',
        '-ac',
        '1',
        '-c:a',
        'pcm_s16le',
        wavPath,
        '-y',
      ]);
      return {
        buffer: fs.readFileSync(wavPath),
        mimeType: 'audio/wav',
        extension: 'wav',
      };
    } catch {
      return null;
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}
