import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import type { AttachmentKind } from './schemas/message.schema';

export const MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024;

const MIME_TO_KIND: Record<string, AttachmentKind> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'audio/webm': 'voice',
  'audio/ogg': 'voice',
  'audio/mpeg': 'voice',
  'audio/mp4': 'voice',
  'application/pdf': 'document',
};

export function kindForMimeType(mimeType: string): AttachmentKind | null {
  return MIME_TO_KIND[mimeType] ?? null;
}

type MulterFileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => void;

export const attachmentFileFilter: MulterFileFilter = (
  _req,
  file,
  callback,
) => {
  if (!kindForMimeType(file.mimetype)) {
    callback(
      new BadRequestException(
        'Only JPEG/PNG/WebP images, WebM/OGG/MP3/M4A audio, or PDF documents are allowed',
      ),
      false,
    );
    return;
  }
  callback(null, true);
};
