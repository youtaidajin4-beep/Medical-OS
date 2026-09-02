import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

let ffmpegAvailable: boolean | null = null;

export function getFfmpegPath(): string {
  if (process.env.FFMPEG_PATH?.trim()) return process.env.FFMPEG_PATH.trim();
  try {
    // Local development fallback. Production images already install ffmpeg.
    // require() (not import) so a missing optional dependency at runtime is caught, not a load-time crash.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const staticPath = require('ffmpeg-static') as string | null;
    if (staticPath) return staticPath;
  } catch {
    // Fall back to PATH below.
  }
  return 'ffmpeg';
}

export async function isFfmpegAvailable(): Promise<boolean> {
  if (ffmpegAvailable !== null) return ffmpegAvailable;
  try {
    await execFileAsync(getFfmpegPath(), ['-version']);
    ffmpegAvailable = true;
  } catch {
    ffmpegAvailable = false;
  }
  return ffmpegAvailable;
}

export function resetFfmpegCache() {
  ffmpegAvailable = null;
}
