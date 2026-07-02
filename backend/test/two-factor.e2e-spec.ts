import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { Connection } from 'mongoose';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './app-test-bootstrap';
import { startInMemoryMongo, stopInMemoryMongo } from './mongo-test-helper';

async function seedStaff(
  connection: Connection,
  email: string,
  password: string,
): Promise<void> {
  const passwordHash = await bcrypt.hash(password, 12);
  await connection.collection('users').insertOne({
    email: email.toLowerCase(),
    passwordHash,
    role: 'admin',
    status: 'active',
    emailVerifiedAt: new Date(),
    twoFactorEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('Two-factor authentication (e2e)', () => {
  let app: INestApplication<App>;
  const email = 'staff-2fa@example.com';
  const password = 'StaffPass123!';

  beforeAll(async () => {
    await startInMemoryMongo();
    app = await createTestApp();
    const connection = app.get<Connection>(getConnectionToken());
    await seedStaff(connection, email, password);
  });

  afterAll(async () => {
    await app.close();
    await stopInMemoryMongo();
  });

  let accessToken: string;

  it('logs in normally when 2FA is not yet enabled', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/login')
      .send({ email, password })
      .expect(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.requiresTwoFactor).toBeUndefined();
    accessToken = res.body.accessToken;
  });

  let secret: string;

  it('begins 2FA setup and returns a secret + QR code', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/2fa/setup')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);
    expect(res.body.secret).toBeDefined();
    expect(res.body.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    secret = res.body.secret;
  });

  it('rejects confirming setup with a wrong code', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/2fa/confirm')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ token: '000000' })
      .expect(401);
  });

  it('confirms setup with a valid TOTP code, enabling 2FA', async () => {
    const code = authenticator.generate(secret);
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/2fa/confirm')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ token: code })
      .expect(200);
    expect(res.body.enabled).toBe(true);
  });

  it('login now requires a second 2FA step instead of returning tokens directly', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/login')
      .send({ email, password })
      .expect(200);
    expect(res.body.requiresTwoFactor).toBe(true);
    expect(res.body.pendingToken).toBeDefined();
    expect(res.body.accessToken).toBeUndefined();
  });

  it('rejects the wrong TOTP code at the second step', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/admin/login')
      .send({ email, password })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/admin/login/2fa')
      .send({ pendingToken: login.body.pendingToken, token: '000000' })
      .expect(401);
  });

  it('completes login with the correct TOTP code', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/admin/login')
      .send({ email, password })
      .expect(200);
    const code = authenticator.generate(secret);
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/login/2fa')
      .send({ pendingToken: login.body.pendingToken, token: code })
      .expect(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user.email).toBe(email);
    accessToken = res.body.accessToken;
  });

  it('rejects disabling 2FA with a wrong code', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/2fa/disable')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ token: '000000' })
      .expect(401);
  });

  it('disables 2FA with a valid code, restoring single-step login', async () => {
    const code = authenticator.generate(secret);
    await request(app.getHttpServer())
      .post('/api/v1/admin/2fa/disable')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ token: code })
      .expect(200);

    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/login')
      .send({ email, password })
      .expect(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.requiresTwoFactor).toBeUndefined();
  });
});
