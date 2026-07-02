import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

// Local disk storage for dev — mirrors the local-mongod-instead-of-Atlas
// pattern elsewhere in this project. Every method is keyed by (subdir,
// filename) rather than a full path, so swapping in a real S3-backed
// implementation later only means replacing this class, not its callers.
@Injectable()
export class StorageService {
  private readonly uploadsRoot = path.join(process.cwd(), 'uploads');

  async saveFile(
    subdir: string,
    buffer: Buffer,
    originalName: string,
  ): Promise<{ filename: string; url: string }> {
    const ext = path.extname(originalName);
    const filename = `${randomUUID()}${ext}`;
    const dir = path.join(this.uploadsRoot, subdir);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, filename), buffer);
    return { filename, url: `/uploads/${subdir}/${filename}` };
  }

  async deleteFile(subdir: string, filename: string): Promise<void> {
    try {
      await fs.unlink(path.join(this.uploadsRoot, subdir, filename));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }

  getFilePath(subdir: string, filename: string): string {
    return path.join(this.uploadsRoot, subdir, filename);
  }
}
