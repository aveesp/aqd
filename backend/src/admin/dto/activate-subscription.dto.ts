import { IsIn } from 'class-validator';
import { BillingCycle, Plan } from '../../subscriptions/plan-catalog';

const ADMIN_ACTIVATABLE_PLANS = [Plan.Basic, Plan.Premium, Plan.Vip] as const;

export class ActivateSubscriptionDto {
  @IsIn(ADMIN_ACTIVATABLE_PLANS)
  plan: Plan;

  @IsIn(Object.values(BillingCycle))
  billingCycle: BillingCycle;
}
