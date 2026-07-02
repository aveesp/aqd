import { IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSuggestionDto {
  @IsMongoId()
  clientProfileId: string;

  @IsMongoId()
  suggestedProfileId: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
