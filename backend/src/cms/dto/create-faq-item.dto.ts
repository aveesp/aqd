import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateFaqItemDto {
  @IsString()
  question: string;

  @IsString()
  answer: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;
}
