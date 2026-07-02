import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Connection } from 'mongoose';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './app-test-bootstrap';
import { startInMemoryMongo, stopInMemoryMongo } from './mongo-test-helper';
import { registerAndLogin, TestUser } from './test-helpers';

async function seedAdmin(
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

describe('Analytics (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let regularUser: TestUser;

  beforeAll(async () => {
    await startInMemoryMongo();
    app = await createTestApp();
    const connection = app.get<Connection>(getConnectionToken());
    await seedAdmin(connection, 'analytics-admin@example.com', 'AdminPass123!');
    const login = await request(app.getHttpServer())
      .post('/api/v1/admin/login')
      .send({ email: 'analytics-admin@example.com', password: 'AdminPass123!' })
      .expect(200);
    adminToken = login.body.accessToken;
    regularUser = await registerAndLogin(app, 'analytics-user');
  });

  afterAll(async () => {
    await app.close();
    await stopInMemoryMongo();
  });

  it('rejects a regular user reading analytics', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/analytics/summary')
      .set('Authorization', `Bearer ${regularUser.accessToken}`)
      .expect(403);
  });

  it('returns a summary reflecting the seeded users', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/analytics/summary')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    // regularUser + adminToken's own account = at least 2 users.
    expect(res.body.totalUsers).toBeGreaterThanOrEqual(2);
    expect(res.body.newRegistrations7Days).toBeGreaterThanOrEqual(1);
    expect(res.body.subscriptionBreakdown).toBeDefined();
    expect(typeof res.body.totalRevenuePaise).toBe('number');
  });

  it('touches lastActiveAt on an authenticated request', async () => {
    // regularUser has already made authenticated calls via registerAndLogin
    // + the earlier /users/me-equivalent flows exercised elsewhere; make an
    // explicit authenticated call here and check the field directly.
    await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${regularUser.accessToken}`)
      .expect(200);
    const connection = app.get<Connection>(getConnectionToken());
    const doc = await connection
      .collection('users')
      .findOne({ email: regularUser.email });
    expect(doc?.lastActiveAt).toBeDefined();
    expect(doc?.lastActiveAt).not.toBeNull();
  });

  it('returns a 30-day registrations time series with no gaps', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/analytics/registrations?days=30')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body).toHaveLength(30);
    const total = res.body.reduce(
      (sum: number, row: { count: number }) => sum + row.count,
      0,
    );
    expect(total).toBeGreaterThanOrEqual(2);
  });

  it('returns a revenue time series (zero, since no payments were made)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/analytics/revenue?days=7')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body).toHaveLength(7);
    expect(
      res.body.every((row: { revenuePaise: number }) => row.revenuePaise === 0),
    ).toBe(true);
  });
});
