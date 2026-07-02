import { IsIn } from 'class-validator';
import { DOCUMENT_TYPES } from '../schemas/profile.schema';
import type { DocumentType } from '../schemas/profile.schema';

export class UploadDocumentDto {
  @IsIn(DOCUMENT_TYPES)
  docType: DocumentType;
}
