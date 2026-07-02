import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | null = null;

// Each e2e spec file gets its own isolated in-memory MongoDB instance (Jest
// runs spec files in separate worker processes), so setting
// process.env.MONGODB_URI here is picked up by AppModule's
// MongooseModule.forRootAsync without needing to mock/override any provider.
export async function startInMemoryMongo(): Promise<void> {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
}

export async function stopInMemoryMongo(): Promise<void> {
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
}
