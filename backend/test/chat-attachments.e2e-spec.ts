import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './app-test-bootstrap';
import { startInMemoryMongo, stopInMemoryMongo } from './mongo-test-helper';
import { registerAndLogin, TestUser } from './test-helpers';

// A tiny valid JPEG (1x1 pixel), matching the pattern used to verify
// profile photo uploads.
const TINY_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

async function makeMutualInterest(
  app: INestApplication,
  a: TestUser,
  b: TestUser,
): Promise<void> {
  const sent = await request(app.getHttpServer())
    .post(`/api/v1/matches/interests/${b.id}`)
    .set('Authorization', `Bearer ${a.accessToken}`)
    .expect(201);
  await request(app.getHttpServer())
    .patch(`/api/v1/matches/interests/${sent.body._id}/accept`)
    .set('Authorization', `Bearer ${b.accessToken}`)
    .expect(200);
}

async function verifyEmail(
  app: INestApplication,
  email: string,
): Promise<void> {
  // Registration is already followed by verify-email in other suites via a
  // mocked mailer; here we just flip the DB flag directly since the
  // mailer isn't mocked in this spec and we only care about the gate being
  // open, not re-testing OTP delivery (covered by email-verification.e2e-spec).
  const connection = app.get(getConnectionToken());
  await connection
    .collection('users')
    .updateOne(
      { email },
      { $set: { emailVerifiedAt: new Date(), status: 'active' } },
    );
}

describe('Chat attachments (e2e)', () => {
  let app: INestApplication<App>;
  let sender: TestUser;
  let recipient: TestUser;

  beforeAll(async () => {
    await startInMemoryMongo();
    app = await createTestApp();
    sender = await registerAndLogin(app, 'attach-sender');
    recipient = await registerAndLogin(app, 'attach-recipient');
    await verifyEmail(app, sender.email);
    await verifyEmail(app, recipient.email);
    await makeMutualInterest(app, sender, recipient);
  });

  afterAll(async () => {
    await app.close();
    await stopInMemoryMongo();
  });

  it('rejects an unsupported file type', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/chat/messages/${recipient.id}/attachment`)
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .attach('file', Buffer.from('not a real file'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });

  let messageId: string;

  it('sends an image attachment with a caption', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/chat/messages/${recipient.id}/attachment`)
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .field('caption', 'Check this out')
      .attach('file', Buffer.from(TINY_JPEG_BASE64, 'base64'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    expect(res.body.attachment.kind).toBe('image');
    expect(res.body.content).toBe('Check this out');
    messageId = res.body._id;
  });

  it('lets the sender fetch the attachment file', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/chat/attachments/${messageId}/file`)
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .expect(200);
    expect(res.headers['content-type']).toContain('image/jpeg');
  });

  it('lets the recipient fetch the same attachment', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/chat/attachments/${messageId}/file`)
      .set('Authorization', `Bearer ${recipient.accessToken}`)
      .expect(200);
  });

  it('rejects a non-participant fetching the attachment', async () => {
    const outsider = await registerAndLogin(app, 'attach-outsider');
    await request(app.getHttpServer())
      .get(`/api/v1/chat/attachments/${messageId}/file`)
      .set('Authorization', `Bearer ${outsider.accessToken}`)
      .expect(403);
  });

  it('shows the attachment in the conversation history', async () => {
    const conversations = await request(app.getHttpServer())
      .get('/api/v1/chat/conversations')
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .expect(200);
    const chatId = conversations.body[0].chatId;
    const history = await request(app.getHttpServer())
      .get(`/api/v1/chat/conversations/${chatId}/messages`)
      .set('Authorization', `Bearer ${sender.accessToken}`)
      .expect(200);
    expect(
      history.body.messages.some(
        (m: { attachment?: { kind: string } }) =>
          m.attachment?.kind === 'image',
      ),
    ).toBe(true);
  });
});
