import { IsIn } from 'class-validator';
import { UserStatus } from '../../users/schemas/user.schema';

const ADMIN_SETTABLE_STATUSES = [
  UserStatus.Active,
  UserStatus.Suspended,
] as const;

export class UpdateUserStatusDto {
  @IsIn(ADMIN_SETTABLE_STATUSES)
  status: UserStatus;
}
