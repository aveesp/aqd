import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';

export const MAX_PHOTOS = 6;
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DOCUMENT_MIME_TYPES = [...IMAGE_MIME_TYPES, 'application/pdf'];

type MulterFileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => void;

export const imageFileFilter: MulterFileFilter = (_req, file, callback) => {
  if (!IMAGE_MIME_TYPES.includes(file.mimetype)) {
    callback(
      new BadRequestException('Only JPEG, PNG, or WebP images are allowed'),
      false,
    );
    return;
  }
  callback(null, true);
};

export const documentFileFilter: MulterFileFilter = (_req, file, callback) => {
  if (!DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
    callback(
      new BadRequestException('Only JPEG, PNG, WebP, or PDF files are allowed'),
      false,
    );
    return;
  }
  callback(null, true);
};
