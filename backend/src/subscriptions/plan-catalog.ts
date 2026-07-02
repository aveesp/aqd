export enum Plan {
  Free = 'free',
  Basic = 'basic',
  Premium = 'premium',
  Vip = 'vip',
}

export enum BillingCycle {
  Monthly = 'monthly',
  Quarterly = 'quarterly',
  HalfYearly = 'half_yearly',
  Yearly = 'yearly',
}

export interface PlanFeatures {
  // null means unlimited.
  dailyInterestLimit: number | null;
  dedicatedMatchmaking: boolean;
}

export const PLAN_FEATURES: Record<Plan, PlanFeatures> = {
  [Plan.Free]: { dailyInterestLimit: 5, dedicatedMatchmaking: false },
  [Plan.Basic]: { dailyInterestLimit: 20, dedicatedMatchmaking: false },
  [Plan.Premium]: { dailyInterestLimit: 100, dedicatedMatchmaking: false },
  [Plan.Vip]: { dailyInterestLimit: null, dedicatedMatchmaking: true },
};

// Prices are in paise (INR's smallest unit, matching Razorpay's `amount`
// convention — 100 paise = ₹1). Free has no billing-cycle pricing.
export const PLAN_PRICES_PAISE: Record<
  Exclude<Plan, Plan.Free>,
  Record<BillingCycle, number>
> = {
  [Plan.Basic]: {
    [BillingCycle.Monthly]: 49_900,
    [BillingCycle.Quarterly]: 129_900,
    [BillingCycle.HalfYearly]: 239_900,
    [BillingCycle.Yearly]: 449_900,
  },
  [Plan.Premium]: {
    [BillingCycle.Monthly]: 99_900,
    [BillingCycle.Quarterly]: 259_900,
    [BillingCycle.HalfYearly]: 479_900,
    [BillingCycle.Yearly]: 899_900,
  },
  [Plan.Vip]: {
    [BillingCycle.Monthly]: 249_900,
    [BillingCycle.Quarterly]: 649_900,
    [BillingCycle.HalfYearly]: 1_199_900,
    [BillingCycle.Yearly]: 2_199_900,
  },
};

export const BILLING_CYCLE_DAYS: Record<BillingCycle, number> = {
  [BillingCycle.Monthly]: 30,
  [BillingCycle.Quarterly]: 90,
  [BillingCycle.HalfYearly]: 182,
  [BillingCycle.Yearly]: 365,
};

// Standard Indian GST rate applied to digital services.
export const GST_RATE = 0.18;

export function getPlanCatalog() {
  return Object.values(Plan).map((plan) => ({
    plan,
    features: PLAN_FEATURES[plan],
    pricing:
      plan === Plan.Free
        ? null
        : Object.fromEntries(
            Object.entries(PLAN_PRICES_PAISE[plan]).map(([cycle, paise]) => [
              cycle,
              { amountPaise: paise, amountRupees: paise / 100 },
            ]),
          ),
  }));
}
