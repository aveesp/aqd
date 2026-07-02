import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './app-test-bootstrap';
import { startInMemoryMongo, stopInMemoryMongo } from './mongo-test-helper';
import { registerAndLogin, TestUser } from './test-helpers';

describe('Profiles (e2e)', () => {
  let app: INestApplication<App>;
  let owner: TestUser;
  let other: TestUser;
  let profileId: string;

  beforeAll(async () => {
    await startInMemoryMongo();
    app = await createTestApp();
    owner = await registerAndLogin(app, 'owner');
    other = await registerAndLogin(app, 'other');
  });

  afterAll(async () => {
    await app.close();
    await stopInMemoryMongo();
  });

  it('creates a profile', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/profiles/me')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        personal: {
          firstName: 'Amina',
          lastName: 'Khan',
          dob: '1995-03-10',
          gender: 'female',
        },
        religion: { sect: 'Sunni', maslak: 'Hanafi' },
        location: { city: 'Pune' },
      })
      .expect(201);
    profileId = res.body._id;
    expect(res.body.personal.firstName).toBe('Amina');
    expect(res.body.religion.sect).toBe('Sunni');
  });

  it('rejects a second profile for the same user', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/profiles/me')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        personal: {
          firstName: 'Amina',
          lastName: 'Khan',
          dob: '1995-03-10',
          gender: 'female',
        },
      })
      .expect(409);
  });

  it('partially updates one section without clobbering sibling fields in another', async () => {
    // Set religion.maslak first, then update only religion.sect — maslak
    // must survive (this is the exact bug fixed in phase 7.6/7.8: a naive
    // full-object PATCH would wipe siblings the caller didn't intend to touch).
    await request(app.getHttpServer())
      .patch('/api/v1/profiles/me')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ religion: { sect: 'Sunni', maslak: 'Hanafi' } })
      .expect(200);

    const res = await request(app.getHttpServer())
      .patch('/api/v1/profiles/me')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ religion: { sect: 'Shia' } })
      .expect(200);

    expect(res.body.religion.sect).toBe('Shia');
    expect(res.body.religion.maslak).toBe('Hanafi');
  });

  it('gives the owner the full document including privacy and assignedStaffId', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/profiles/${profileId}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    expect(res.body.privacy).toBeDefined();
    expect(res.body).toHaveProperty('assignedStaffId');
  });

  it('redacts privacy/assignedStaffId/verificationDocuments for another viewer', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/profiles/${profileId}`)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .expect(200);
    expect(res.body.privacy).toBeUndefined();
    expect(res.body.assignedStaffId).toBeUndefined();
    expect(res.body.verificationDocuments).toBeUndefined();
    // Non-sensitive fields still visible.
    expect(res.body.personal.firstName).toBe('Amina');
  });

  it('empties photos for other viewers once hidePhotos is enabled', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/profiles/me/privacy')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ hidePhotos: true })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/profiles/${profileId}`)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .expect(200);
    expect(res.body.photos).toEqual([]);
  });

  it('404s for a nonexistent profile id', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/profiles/000000000000000000000000')
      .set('Authorization', `Bearer ${other.accessToken}`)
      .expect(404);
  });
});
