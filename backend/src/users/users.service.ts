import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Role } from '../auth/roles.enum';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async create(data: { email: string; passwordHash: string; role?: Role }): Promise<UserDocument> {
    return this.userModel.create(data);
  }

  async findByEmail(email: string, withSecrets = false): Promise<UserDocument | null> {
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

  async setRefreshTokenHash(userId: string, refreshTokenHash: string | null): Promise<void> {
    await this.userModel.updateOne({ _id: userId }, { refreshTokenHash }).exec();
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.userModel
      .updateOne({ _id: userId }, { emailVerifiedAt: new Date(), status: 'active' })
      .exec();
  }

  async touchLastLogin(userId: string): Promise<void> {
    await this.userModel.updateOne({ _id: userId }, { lastLoginAt: new Date() }).exec();
  }

  async findByIdWithRefreshHash(userId: string): Promise<UserDocument | null> {
    return this.userModel.findById(userId).select('+refreshTokenHash').exec();
  }
}
