import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Subscription,
  SubscriptionDocument,
  SubscriptionStatus,
} from './schemas/subscription.schema';
import {
  BILLING_CYCLE_DAYS,
  BillingCycle,
  Plan,
  getPlanCatalog,
} from './plan-catalog';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  listPlans() {
    return getPlanCatalog();
  }

  async getOrCreateMine(userId: string): Promise<SubscriptionDocument> {
    let sub = await this.subscriptionModel.findOne({ userId }).exec();
    if (!sub) {
      sub = await this.subscriptionModel.create({
        userId,
        plan: Plan.Free,
        status: SubscriptionStatus.Active,
      });
    }
    return this.applyExpiry(sub);
  }

  // Returns the plan actually in effect right now, downgrading to Free if a
  // paid plan's period has lapsed (rather than trusting a stale `plan`
  // field). This is what feature-gating logic should call, not `.plan`
  // directly.
  async getEffectivePlan(userId: string): Promise<Plan> {
    const sub = await this.getOrCreateMine(userId);
    return sub.plan;
  }

  private async applyExpiry(
    sub: SubscriptionDocument,
  ): Promise<SubscriptionDocument> {
    if (
      sub.plan !== Plan.Free &&
      sub.status === SubscriptionStatus.Active &&
      sub.currentPeriodEnd &&
      sub.currentPeriodEnd.getTime() < Date.now()
    ) {
      sub.status = SubscriptionStatus.Expired;
      sub.plan = Plan.Free;
      sub.billingCycle = null;
      sub.autoRenew = false;
      await sub.save();
    }
    return sub;
  }

  // Called once a payment is confirmed captured (webhook) or by an admin
  // granting a plan manually (e.g. offline/bank-transfer payment).
  async activate(
    userId: string,
    plan: Plan,
    billingCycle: BillingCycle,
  ): Promise<SubscriptionDocument> {
    const days = BILLING_CYCLE_DAYS[billingCycle];
    const currentPeriodEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const sub = await this.subscriptionModel
      .findOneAndUpdate(
        { userId },
        {
          userId,
          plan,
          billingCycle,
          status: SubscriptionStatus.Active,
          startedAt: new Date(),
          currentPeriodEnd,
        },
        { upsert: true, new: true },
      )
      .exec();
    return sub;
  }

  async cancelAutoRenew(userId: string): Promise<SubscriptionDocument> {
    const sub = await this.getOrCreateMine(userId);
    sub.autoRenew = false;
    await sub.save();
    return sub;
  }
}
