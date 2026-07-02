import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import * as crypto from 'crypto';
import { PaymentsService } from './payments.service';
import { Payment } from './schemas/payment.schema';
import { Invoice } from './schemas/invoice.schema';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

describe('PaymentsService.verifyWebhookSignature', () => {
  let service: PaymentsService;
  const secret = 'test_webhook_secret';

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getModelToken(Payment.name), useValue: {} },
        { provide: getModelToken(Invoice.name), useValue: {} },
        { provide: SubscriptionsService, useValue: {} },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'RAZORPAY_WEBHOOK_SECRET' ? secret : undefined,
          },
        },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  function sign(body: string): string {
    return crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  it('accepts a correctly signed payload', () => {
    const body = JSON.stringify({ event: 'payment.captured' });
    expect(service.verifyWebhookSignature(body, sign(body))).toBe(true);
  });

  it('rejects a payload with the wrong signature', () => {
    const body = JSON.stringify({ event: 'payment.captured' });
    expect(service.verifyWebhookSignature(body, 'deadbeef'.repeat(8))).toBe(
      false,
    );
  });

  it('rejects when the signature was computed over a different body', () => {
    const original = JSON.stringify({ event: 'payment.captured' });
    const tampered = JSON.stringify({ event: 'payment.failed' });
    expect(service.verifyWebhookSignature(tampered, sign(original))).toBe(
      false,
    );
  });

  it('rejects a signature of the wrong length without throwing', () => {
    const body = JSON.stringify({ event: 'payment.captured' });
    expect(service.verifyWebhookSignature(body, 'short')).toBe(false);
  });
});
