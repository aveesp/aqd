import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Gender } from '../schemas/profile.schema';

export class PersonalDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsDateString()
  dob: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsOptional()
  @IsInt()
  @Min(100)
  heightCm?: number;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;
}

export class FamilyDto {
  @IsOptional() @IsString() fatherOccupation?: string;
  @IsOptional() @IsString() motherOccupation?: string;
  @IsOptional() @IsInt() @Min(0) siblings?: number;
  @IsOptional() @IsString() familyType?: string;
  @IsOptional() @IsString() familyValues?: string;
}

export class EducationDto {
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsString() field?: string;
  @IsOptional() @IsString() institution?: string;
}

export class OccupationDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() incomeBand?: string;
}

export class ReligionDto {
  @IsOptional() @IsString() sect?: string;
  @IsOptional() @IsString() maslak?: string;
  @IsOptional() @IsString() prayerStatus?: string;
}

export class LifestyleDto {
  @IsOptional() @IsString() diet?: string;
  @IsOptional() @IsString() smoking?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) languages?: string[];
}

export class LocationDto {
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() area?: string;
  @IsOptional() @IsString() pincode?: string;
}

export class PartnerPreferencesDto {
  @IsOptional() @IsInt() ageMin?: number;
  @IsOptional() @IsInt() ageMax?: number;
  @IsOptional() @IsInt() heightMin?: number;
  @IsOptional() @IsInt() heightMax?: number;
  @IsOptional() @IsString() sect?: string;
  @IsOptional() @IsString() maslak?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() education?: string;
  @IsOptional() @IsString() income?: string;
}

export class CreateProfileDto {
  @ValidateNested()
  @Type(() => PersonalDto)
  personal: PersonalDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FamilyDto)
  family?: FamilyDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EducationDto)
  education?: EducationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OccupationDto)
  occupation?: OccupationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReligionDto)
  religion?: ReligionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LifestyleDto)
  lifestyle?: LifestyleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PartnerPreferencesDto)
  partnerPreferences?: PartnerPreferencesDto;
}
