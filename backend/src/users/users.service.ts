import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserStatus } from './schemas/user.schema';
import { Role } from '../auth/roles.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(data: {
    email: string;
    passwordHash: string;
    role?: Role;
  }): Promise<UserDocument> {
    return this.userModel.create(data);
  }

  async findByEmail(
    email: string,
    withSecrets = false,
  ): Promise<UserDocument | null> {
    const query = this.userModel.findOne({ email: email.toLowerCase() });
    if (withSecrets) {
      query.select('+passwordHash +refreshTokenHash');
    }
    return query.exec();
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async setRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.userModel
      .updateOne({ _id: userId }, { refreshTokenHash })
      .exec();
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: userId },
        {
          emailVerifiedAt: new Date(),
          status: 'active',
          emailVerificationOtpHash: null,
          emailVerificationOtpExpiresAt: null,
          emailVerificationAttempts: 0,
        },
      )
      .exec();
  }

  async setEmailVerificationOtp(
    userId: string,
    otpHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: userId },
        {
          emailVerificationOtpHash: otpHash,
          emailVerificationOtpExpiresAt: expiresAt,
          emailVerificationAttempts: 0,
        },
      )
      .exec();
  }

  async findByEmailWithOtp(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select(
        '+emailVerificationOtpHash +emailVerificationOtpExpiresAt +emailVerificationAttempts',
      )
      .exec();
  }

  async incrementVerificationAttempts(userId: string): Promise<void> {
    await this.userModel
      .updateOne({ _id: userId }, { $inc: { emailVerificationAttempts: 1 } })
      .exec();
  }

  async touchLastLogin(userId: string): Promise<void> {
    await this.userModel
      .updateOne({ _id: userId }, { lastLoginAt: new Date() })
      .exec();
  }

  async findByIdWithRefreshHash(userId: string): Promise<UserDocument | null> {
    return this.userModel.findById(userId).select('+refreshTokenHash').exec();
  }

  async list(
    filter: { role?: Role; status?: UserStatus } = {},
    page = 1,
    limit = 20,
  ): Promise<{
    users: UserDocument[];
    page: number;
    limit: number;
    total: number;
  }> {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);
    return { users, page, limit, total };
  }

  async setStatus(userId: string, status: UserStatus): Promise<UserDocument> {
    const user = await this.findById(userId);
    user.status = status;
    await user.save();
    return user;
  }

  // Secret is stored as soon as setup begins but `twoFactorEnabled` stays
  // false until the caller proves possession of the authenticator app by
  // submitting one valid code (see AuthService.confirmTwoFactorSetup) —
  // otherwise a setup call that's never completed would silently start
  // requiring a code nobody has.
  async setPendingTwoFactorSecret(
    userId: string,
    secret: string,
  ): Promise<void> {
    await this.userModel
      .updateOne({ _id: userId }, { twoFactorSecret: secret })
      .exec();
  }

  async setTwoFactorEnabled(userId: string, enabled: boolean): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: userId },
        {
          twoFactorEnabled: enabled,
          ...(enabled ? {} : { twoFactorSecret: null }),
        },
      )
      .exec();
  }

  async findByIdWithTwoFactorSecret(
    userId: string,
  ): Promise<UserDocument | null> {
    return this.userModel.findById(userId).select('+twoFactorSecret').exec();
  }
}
