import { IsString, Length } from 'class-validator';

export class VerifyTwoFactorLoginDto {
  @IsString()
  pendingToken: string;

  @IsString()
  @Length(6, 6)
  token: string;
}
