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

describe('CMS (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let regularUser: TestUser;

  beforeAll(async () => {
    await startInMemoryMongo();
    app = await createTestApp();
    const connection = app.get<Connection>(getConnectionToken());
    await seedAdmin(connection, 'cms-admin@example.com', 'AdminPass123!');
    const login = await request(app.getHttpServer())
      .post('/api/v1/admin/login')
      .send({ email: 'cms-admin@example.com', password: 'AdminPass123!' })
      .expect(200);
    adminToken = login.body.accessToken;
    regularUser = await registerAndLogin(app, 'cms-user');
  });

  afterAll(async () => {
    await app.close();
    await stopInMemoryMongo();
  });

  it('rejects a regular user managing CMS content', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/cms/blog')
      .set('Authorization', `Bearer ${regularUser.accessToken}`)
      .send({ title: 'Hack', slug: 'hack', content: 'nope' })
      .expect(403);
  });

  let blogPostId: string;

  it('creates a draft blog post as admin', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/cms/blog')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Our Story',
        slug: 'our-story',
        content: 'Full content here.',
      })
      .expect(201);
    expect(res.body.published).toBe(false);
    blogPostId = res.body._id;
  });

  it('does not show an unpublished post on the public endpoint', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/cms/blog/our-story')
      .expect(404);
    expect(res.body).toBeDefined();
  });

  it('rejects creating a second post with the same slug', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/cms/blog')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Duplicate', slug: 'our-story', content: 'x' })
      .expect(409);
  });

  it('publishes the post and sets publishedAt', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/admin/cms/blog/${blogPostId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ published: true })
      .expect(200);
    expect(res.body.published).toBe(true);
    expect(res.body.publishedAt).toBeDefined();
  });

  it('now shows the published post on the public endpoint', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/cms/blog/our-story')
      .expect(200);
    expect(res.body.title).toBe('Our Story');
  });

  it('lists the published post in the public blog index', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/cms/blog')
      .expect(200);
    expect(res.body.posts).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it('creates and publishes a testimonial, faq item, and banner', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/cms/testimonials')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        authorName: 'Amina',
        quote: 'Found my match here.',
        published: true,
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/admin/cms/faq')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ question: 'Is it halal?', answer: 'Yes.', published: true })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/admin/cms/banners')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Ramadan offer',
        imageUrl: 'https://example.com/banner.png',
      })
      .expect(201);

    const [testimonials, faq, banners] = await Promise.all([
      request(app.getHttpServer()).get('/api/v1/cms/testimonials').expect(200),
      request(app.getHttpServer()).get('/api/v1/cms/faq').expect(200),
      request(app.getHttpServer()).get('/api/v1/cms/banners').expect(200),
    ]);
    expect(testimonials.body).toHaveLength(1);
    expect(faq.body).toHaveLength(1);
    expect(banners.body).toHaveLength(1);
  });

  it('deletes the blog post and it disappears from both admin and public listings', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/admin/cms/blog/${blogPostId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);
    await request(app.getHttpServer())
      .get('/api/v1/cms/blog/our-story')
      .expect(404);
  });
});
