import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTestimonialDto {
  @IsString()
  authorName: string;

  @IsOptional()
  @IsString()
  authorLocation?: string;

  @IsString()
  @MaxLength(1000)
  quote: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;
}
