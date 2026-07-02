import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './app-test-bootstrap';
import { startInMemoryMongo, stopInMemoryMongo } from './mongo-test-helper';
import { registerAndLogin, TestUser } from './test-helpers';

describe('Matches (e2e)', () => {
  let app: INestApplication<App>;
  let fromUser: TestUser;

  beforeAll(async () => {
    await startInMemoryMongo();
    app = await createTestApp();
    fromUser = await registerAndLogin(app, 'from');
  });

  afterAll(async () => {
    await app.close();
    await stopInMemoryMongo();
  });

  it('rejects expressing interest in yourself', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/matches/interests/${fromUser.id}`)
      .set('Authorization', `Bearer ${fromUser.accessToken}`)
      .expect(400);
  });

  it('rejects expressing interest in a nonexistent user', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/matches/interests/000000000000000000000000')
      .set('Authorization', `Bearer ${fromUser.accessToken}`)
      .expect(404);
  });

  it('rejects a duplicate interest to the same user', async () => {
    const target = await registerAndLogin(app, 'target-dup');
    await request(app.getHttpServer())
      .post(`/api/v1/matches/interests/${target.id}`)
      .set('Authorization', `Bearer ${fromUser.accessToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/matches/interests/${target.id}`)
      .set('Authorization', `Bearer ${fromUser.accessToken}`)
      .expect(409);
  });

  it('enforces the free-tier daily interest limit (5/day) and lifts it after upgrade', async () => {
    const limitUser = await registerAndLogin(app, 'limit-tester');
    const targets: TestUser[] = [];
    for (let i = 0; i < 6; i++) {
      targets.push(await registerAndLogin(app, `limit-target-${i}`));
    }

    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post(`/api/v1/matches/interests/${targets[i].id}`)
        .set('Authorization', `Bearer ${limitUser.accessToken}`)
        .expect(201);
    }

    const res = await request(app.getHttpServer())
      .post(`/api/v1/matches/interests/${targets[5].id}`)
      .set('Authorization', `Bearer ${limitUser.accessToken}`)
      .expect(403);
    expect(res.body.message).toContain('Daily interest limit reached');
  });

  it('lets the recipient accept an interest, and rejects a second response', async () => {
    const sender = await registerAndLogin(app, 'accept-sender');
    const recipient = await registerAndLogin(app, 'accept-recipient');
    const sent = await request(app.getHttpServer())
      .post(`/api/v1/matches/interests/${recipient.id}`)
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/matches/interests/${sent.body._id}/accept`)
      .set('Authorization', `Bearer ${recipient.accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/matches/interests/${sent.body._id}/accept`)
      .set('Authorization', `Bearer ${recipient.accessToken}`)
      .expect(409);
  });

  it('rejects the sender responding to their own sent interest', async () => {
    const sender = await registerAndLogin(app, 'self-respond-sender');
    const recipient = await registerAndLogin(app, 'self-respond-recipient');
    const sent = await request(app.getHttpServer())
      .post(`/api/v1/matches/interests/${recipient.id}`)
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/matches/interests/${sent.body._id}/accept`)
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .expect(403);
  });

  it('blocking stops new interests between the two users', async () => {
    const blocker = await registerAndLogin(app, 'blocker');
    const blocked = await registerAndLogin(app, 'blocked');

    await request(app.getHttpServer())
      .post(`/api/v1/matches/block/${blocked.id}`)
      .set('Authorization', `Bearer ${blocker.accessToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/matches/interests/${blocker.id}`)
      .set('Authorization', `Bearer ${blocked.accessToken}`)
      .expect(403);
  });
});
