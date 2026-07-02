export type Plan = 'free' | 'basic' | 'premium' | 'vip';
export type BillingCycle = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'grace_period';

export interface PlanFeatures {
  dailyInterestLimit: number | null;
  dedicatedMatchmaking: boolean;
}

export interface PlanCyclePrice {
  amountPaise: number;
  amountRupees: number;
}

export interface PlanCatalogEntry {
  plan: Plan;
  features: PlanFeatures;
  pricing: Record<BillingCycle, PlanCyclePrice> | null;
}

export interface Subscription {
  _id: string;
  userId: string;
  plan: Plan;
  billingCycle: BillingCycle | null;
  status: SubscriptionStatus;
  startedAt: string;
  currentPeriodEnd: string | null;
  autoRenew: boolean;
}

export interface CheckoutResponse {
  razorpayOrderId: string;
  razorpayKeyId: string;
  amountPaise: number;
  currency: string;
}

export interface Invoice {
  _id: string;
  userId: string;
  paymentId: string;
  invoiceNumber: string;
  subtotalPaise: number;
  gstPaise: number;
  totalPaise: number;
  issuedAt: string;
}
