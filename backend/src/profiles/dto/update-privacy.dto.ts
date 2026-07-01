import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePrivacyDto {
  @IsOptional()
  @IsBoolean()
  hidePhotos?: boolean;

  @IsOptional()
  @IsBoolean()
  hideContact?: boolean;

  @IsOptional()
  @IsBoolean()
  hideLastActive?: boolean;
}
