import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import {
  PersonalDto,
  FamilyDto,
  EducationDto,
  OccupationDto,
  ReligionDto,
  LifestyleDto,
  LocationDto,
  PartnerPreferencesDto,
} from './create-profile.dto';

class PartialPersonalDto extends PartialType(PersonalDto) {}

export class UpdateProfileDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => PartialPersonalDto)
  personal?: PartialPersonalDto;

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
