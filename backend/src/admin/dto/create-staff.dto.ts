import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';
import { Role } from '../../auth/roles.enum';

const STAFF_ROLES = [
  Role.SupportStaff,
  Role.MatchmakingStaff,
  Role.Admin,
] as const;

export class CreateStaffDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsIn(STAFF_ROLES)
  role: Role;
}
