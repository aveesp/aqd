import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SendAttachmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  caption?: string;
}
