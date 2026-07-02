import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BillingCycle, Plan } from '../plan-catalog';

export type SubscriptionDocument = HydratedDocument<Subscription>;

export enum SubscriptionStatus {
  Active = 'active',
  Expired = 'expired',
  Cancelled = 'cancelled',
  GracePeriod = 'grace_period',
}

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: Plan, default: Plan.Free })
  plan: Plan;

  @Prop({ type: String, enum: BillingCycle, default: null })
  billingCycle: BillingCycle | null;

  @Prop({
    type: String,
    enum: SubscriptionStatus,
    default: SubscriptionStatus.Active,
  })
  status: SubscriptionStatus;

  @Prop({ type: Date, default: Date.now })
  startedAt: Date;

  @Prop({ type: Date, default: null })
  currentPeriodEnd: Date | null;

  @Prop({ default: false })
  autoRenew: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
SubscriptionSchema.index({ userId: 1 }, { unique: true });
SubscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });
