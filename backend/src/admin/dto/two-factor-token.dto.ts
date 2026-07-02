import { IsString, Length } from 'class-validator';

export class TwoFactorTokenDto {
  @IsString()
  @Length(6, 6)
  token: string;
}
