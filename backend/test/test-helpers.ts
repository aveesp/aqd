import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export interface TestUser {
  id: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

let counter = 0;

export async function registerAndLogin(
  app: INestApplication,
  emailPrefix = 'user',
): Promise<TestUser> {
  const email = `${emailPrefix}-${Date.now()}-${counter++}@example.com`;
  const password = 'Password123!';
  const reg = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email, password })
    .expect(201);
  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);
  return {
    id: reg.body.id,
    email,
    accessToken: login.body.accessToken,
    refreshToken: login.body.refreshToken,
  };
}
