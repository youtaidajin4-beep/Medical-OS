import * as fs from 'fs';
import * as path from 'path';
import { StorageProvider } from './storage.provider';

export class LocalFsStorageProvider implements StorageProvider {
  readonly name = 'local';
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir ?? path.join(process.cwd(), 'storage', 'audio');
    fs.mkdirSync(this.baseDir, { recursive: true });
  }

  private resolve(key: string): string {
    const resolved = path.join(this.baseDir, key);
    if (!resolved.startsWith(this.baseDir)) {
      throw new Error('Invalid storage key');
    }
    return resolved;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const filePath = this.resolve(key);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, data);
  }

  async get(key: string): Promise<Buffer> {
    const filePath = this.resolve(key);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Storage object not found: ${key}`);
    }
    return fs.readFileSync(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.resolve(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async exists(key: string): Promise<boolean> {
    return fs.existsSync(this.resolve(key));
  }
}
