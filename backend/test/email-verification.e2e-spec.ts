import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './app-test-bootstrap';
import { startInMemoryMongo, stopInMemoryMongo } from './mongo-test-helper';
import { MailerService } from '../src/notifications/mailer.service';

class CapturingMailer {
  sent: { to: string; subject: string; text: string }[] = [];
  send(to: string, subject: string, text: string): Promise<void> {
    this.sent.push({ to, subject, text });
    return Promise.resolve();
  }
}

function extractOtp(text: string): string {
  const match = /code is (\d{6})/.exec(text);
  if (!match) throw new Error(`Could not find OTP in email text: ${text}`);
  return match[1];
}

describe('Email verification (e2e)', () => {
  let app: INestApplication<App>;
  let mailer: CapturingMailer;
  const email = 'verify-e2e@example.com';
  const password = 'Password123!';

  beforeAll(async () => {
    await startInMemoryMongo();
    mailer = new CapturingMailer();
    app = await createTestApp((builder) =>
      builder.overrideProvider(MailerService).useValue(mailer),
    );
  });

  afterAll(async () => {
    await app.close();
    await stopInMemoryMongo();
  });

  it('sends a 6-digit OTP email on registration', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password })
      .expect(201);
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0].to).toBe(email);
    expect(extractOtp(mailer.sent[0].text)).toMatch(/^\d{6}$/);
  });

  it('rejects an incorrect OTP without consuming the correct one', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ email, otp: '000000' })
      .expect(401);
  });

  it('lets messaging stay blocked for an unverified account', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const otherReg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'verify-target@example.com', password })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/chat/messages/${otherReg.body.id}`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ content: 'hello' })
      .expect(403);
    expect(res.body.message).toContain('verify your email');
  });

  it('verifies with the correct OTP and unblocks messaging', async () => {
    const otp = extractOtp(mailer.sent[0].text);
    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ email, otp })
      .expect(200);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    const target = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'verify-target-2@example.com', password })
      .expect(201);

    // Messaging still requires a mutually-accepted interest, so this call
    // should fail for a *different* reason now (no accepted interest),
    // proving the email-verification gate itself was lifted.
    const res = await request(app.getHttpServer())
      .post(`/api/v1/chat/messages/${target.body.id}`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ content: 'hello' })
      .expect(403);
    expect(res.body.message).not.toContain('verify your email');
  });

  it('resend-verification always returns success without revealing account existence', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/resend-verification')
      .send({ email: 'nonexistent@example.com' })
      .expect(200);
  });
});
