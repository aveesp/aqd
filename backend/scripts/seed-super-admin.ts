/**
 * One-time bootstrap for the first super_admin account. There is no REST
 * endpoint that can create a super_admin (POST /admin/staff deliberately
 * only allows support_staff/matchmaking_staff/admin), so a fresh deployment
 * needs this script to get an initial account capable of provisioning
 * everyone else.
 *
 * Usage:
 *   MONGODB_URI=... npx ts-node scripts/seed-super-admin.ts <email> <password>
 */
import * as bcrypt from 'bcrypt';
import mongoose from 'mongoose';

async function main() {
  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error('Usage: ts-node scripts/seed-super-admin.ts <email> <password>');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/aqd';
  await mongoose.connect(uri);

  const users = mongoose.connection.collection('users');
  const existing = await users.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.error(`An account with email ${email} already exists (role: ${existing.role}).`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();
  await users.insertOne({
    email: email.toLowerCase(),
    passwordHash,
    role: 'super_admin',
    status: 'active',
    emailVerifiedAt: now,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    refreshTokenHash: null,
    lastLoginAt: null,
    lastActiveAt: null,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`Created super_admin account: ${email}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
