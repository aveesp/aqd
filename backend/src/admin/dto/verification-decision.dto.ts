import { IsIn } from 'class-validator';
import { VerificationStatus } from '../../profiles/schemas/profile.schema';

const DECISIONS = [
  VerificationStatus.Verified,
  VerificationStatus.Rejected,
] as const;

export class VerificationDecisionDto {
  @IsIn(DECISIONS)
  decision: VerificationStatus;
}
