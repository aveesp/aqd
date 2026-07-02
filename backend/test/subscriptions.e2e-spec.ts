import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Connection } from 'mongoose';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './app-test-bootstrap';
import { startInMemoryMongo, stopInMemoryMongo } from './mongo-test-helper';
import { registerAndLogin, TestUser } from './test-helpers';

// Mirrors scripts/seed-super-admin.ts — there is no REST endpoint that can
// create a super_admin, so tests needing one insert directly like the
// real bootstrap script does.
async function seedSuperAdmin(
  connection: Connection,
  email: string,
  password: string,
): Promise<void> {
  const passwordHash = await bcrypt.hash(password, 12);
  await connection.collection('users').insertOne({
    email: email.toLowerCase(),
    passwordHash,
    role: 'super_admin',
    status: 'active',
    emailVerifiedAt: new Date(),
    twoFactorEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('Subscriptions & payments (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;

  beforeAll(async () => {
    await startInMemoryMongo();
    app = await createTestApp();
    const connection = app.get<Connection>(getConnectionToken());
    await seedSuperAdmin(connection, 'super@example.com', 'SuperAdmin123!');
    const login = await request(app.getHttpServer())
      .post('/api/v1/admin/login')
      .send({ email: 'super@example.com', password: 'SuperAdmin123!' })
      .expect(200);
    adminToken = login.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await stopInMemoryMongo();
  });

  it('lists the plan catalog publicly, no auth required', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/subscriptions/plans')
      .expect(200);
    const plans = res.body.map((p: { plan: string }) => p.plan);
    expect(plans).toEqual(['free', 'basic', 'premium', 'vip']);
  });

  it('auto-creates a Free subscription on first access', async () => {
    const user = await registerAndLogin(app, 'sub-user');
    const res = await request(app.getHttpServer())
      .get('/api/v1/subscriptions/me')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);
    expect(res.body.plan).toBe('free');
    expect(res.body.status).toBe('active');
  });

  it('503s checkout cleanly when Razorpay is not configured', async () => {
    const user = await registerAndLogin(app, 'checkout-user');
    const res = await request(app.getHttpServer())
      .post('/api/v1/payments/checkout')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ plan: 'premium', billingCycle: 'monthly' })
      .expect(503);
    expect(res.body.message).toContain('not configured');
  });

  it('rejects a non-admin manually activating a subscription', async () => {
    const user = await registerAndLogin(app, 'non-admin');
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/subscriptions/${user.id}/activate`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ plan: 'premium', billingCycle: 'monthly' })
      .expect(403);
  });

  it('lets an admin manually activate a subscription, lifting the free-tier interest limit', async () => {
    const user: TestUser = await registerAndLogin(app, 'upgrade-user');
    const targets: TestUser[] = [];
    for (let i = 0; i < 6; i++) {
      targets.push(await registerAndLogin(app, `upgrade-target-${i}`));
    }

    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post(`/api/v1/matches/interests/${targets[i].id}`)
        .set('Authorization', `Bearer ${user.accessToken}`)
        .expect(201);
    }
    // 6th hits the free-tier ceiling.
    await request(app.getHttpServer())
      .post(`/api/v1/matches/interests/${targets[5].id}`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(403);

    const activation = await request(app.getHttpServer())
      .patch(`/api/v1/admin/subscriptions/${user.id}/activate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ plan: 'premium', billingCycle: 'monthly' })
      .expect(200);
    expect(activation.body.plan).toBe('premium');

    // Same 6th target, now succeeds under the Premium limit (100/day).
    await request(app.getHttpServer())
      .post(`/api/v1/matches/interests/${targets[5].id}`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(201);
  });
});
