import { IsIn } from 'class-validator';
import { BillingCycle, Plan } from '../../subscriptions/plan-catalog';

const PAID_PLANS = [Plan.Basic, Plan.Premium, Plan.Vip] as const;

export class CreateCheckoutDto {
  @IsIn(PAID_PLANS)
  plan: Plan;

  @IsIn(Object.values(BillingCycle))
  billingCycle: BillingCycle;
}
