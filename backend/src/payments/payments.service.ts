import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
} from './schemas/payment.schema';
import { Invoice, InvoiceDocument } from './schemas/invoice.schema';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import {
  BillingCycle,
  GST_RATE,
  PLAN_PRICES_PAISE,
  Plan,
} from '../subscriptions/plan-catalog';

export interface CheckoutResponse {
  razorpayOrderId: string;
  razorpayKeyId: string;
  amountPaise: number;
  currency: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<InvoiceDocument>,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly config: ConfigService,
  ) {}

  async createCheckout(
    userId: string,
    plan: Plan,
    billingCycle: BillingCycle,
  ): Promise<CheckoutResponse> {
    const amountPaise =
      PLAN_PRICES_PAISE[plan as Exclude<Plan, Plan.Free>]?.[billingCycle];
    if (!amountPaise) {
      throw new BadRequestException('Invalid plan/billing cycle combination');
    }

    const razorpay = this.getClient();
    const keyId = this.config.get<string>('RAZORPAY_KEY_ID') ?? '';
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `sub_${userId}_${Date.now()}`,
      notes: { userId, plan, billingCycle },
    });

    await this.paymentModel.create({
      userId,
      plan,
      billingCycle,
      razorpayOrderId: order.id,
      amountPaise,
      currency: 'INR',
      status: PaymentStatus.Created,
    });

    return {
      razorpayOrderId: order.id,
      razorpayKeyId: keyId,
      amountPaise,
      currency: 'INR',
    };
  }

  // Razorpay signs webhook payloads with HMAC-SHA256 over the raw request
  // body, keyed with a webhook secret configured in the Razorpay dashboard.
  // Must run against the *raw* body — a re-serialized JSON.stringify of the
  // parsed body would not reproduce the same bytes and would always fail.
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!secret) {
      return false;
    }
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');
    if (expected.length !== signature.length) {
      return false;
    }
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature),
    );
  }

  async handlePaymentCaptured(
    orderId: string,
    paymentId: string,
    method: string | null,
  ): Promise<void> {
    const payment = await this.paymentModel
      .findOne({ razorpayOrderId: orderId })
      .exec();
    if (!payment || payment.status === PaymentStatus.Paid) {
      return;
    }
    payment.status = PaymentStatus.Paid;
    payment.razorpayPaymentId = paymentId;
    payment.method = method;
    await payment.save();

    await this.subscriptionsService.activate(
      payment.userId.toString(),
      payment.plan,
      payment.billingCycle,
    );
    await this.generateInvoice(payment);
  }

  async handlePaymentFailed(orderId: string): Promise<void> {
    await this.paymentModel
      .updateOne({ razorpayOrderId: orderId }, { status: PaymentStatus.Failed })
      .exec();
  }

  async listMyInvoices(userId: string): Promise<InvoiceDocument[]> {
    return this.invoiceModel.find({ userId }).sort({ issuedAt: -1 }).exec();
  }

  private async generateInvoice(
    payment: PaymentDocument,
  ): Promise<InvoiceDocument> {
    const totalPaise = payment.amountPaise;
    const subtotalPaise = Math.round(totalPaise / (1 + GST_RATE));
    const gstPaise = totalPaise - subtotalPaise;
    const count = await this.invoiceModel.countDocuments().exec();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    return this.invoiceModel.create({
      userId: payment.userId,
      paymentId: payment.id,
      invoiceNumber,
      subtotalPaise,
      gstPaise,
      totalPaise,
    });
  }

  private getClient(): Razorpay {
    const keyId = this.config.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) {
      throw new ServiceUnavailableException(
        'Payment gateway is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
      );
    }
    return new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
}
