import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  Gender,
  VerificationStatus,
} from '../../profiles/schemas/profile.schema';

export class SearchProfilesDto {
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(18)
  ageMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(120)
  ageMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  heightMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(250)
  heightMax?: number;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  sect?: string;

  @IsOptional()
  @IsString()
  maslak?: string;

  @IsOptional()
  @IsString()
  educationLevel?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  verifiedOnly?: boolean;

  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
