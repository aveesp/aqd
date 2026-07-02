import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BillingCycle, Plan } from '../../subscriptions/plan-catalog';

export type PaymentDocument = HydratedDocument<Payment>;

export enum PaymentStatus {
  Created = 'created',
  Paid = 'paid',
  Failed = 'failed',
}

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: Plan, required: true })
  plan: Plan;

  @Prop({ type: String, enum: BillingCycle, required: true })
  billingCycle: BillingCycle;

  @Prop({ required: true })
  razorpayOrderId: string;

  @Prop({ type: String, default: null })
  razorpayPaymentId: string | null;

  // Paise (INR smallest unit), matching Razorpay's own `amount` convention.
  @Prop({ required: true })
  amountPaise: number;

  @Prop({ default: 'INR' })
  currency: string;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.Created })
  status: PaymentStatus;

  @Prop({ type: String, default: null })
  method: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ razorpayOrderId: 1 }, { unique: true });
PaymentSchema.index({ userId: 1, createdAt: -1 });
