import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import { Role } from '../../auth/roles.enum';

export type UserDocument = HydratedDocument<User>;

export enum UserStatus {
  PendingVerification = 'pending_verification',
  Active = 'active',
  Suspended = 'suspended',
  Deleted = 'deleted',
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ unique: true, sparse: true })
  phone?: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ type: String, enum: Role, default: Role.User })
  role: Role;

  @Prop({ type: String, enum: UserStatus, default: UserStatus.PendingVerification })
  status: UserStatus;

  @Prop({ type: Date, default: null })
  emailVerifiedAt: Date | null;

  @Prop({ default: false })
  twoFactorEnabled: boolean;

  @Prop({ type: String, default: null, select: false })
  twoFactorSecret: string | null;

  @Prop({ type: String, default: null, select: false })
  refreshTokenHash: string | null;

  @Prop({ type: Date, default: null })
  lastLoginAt: Date | null;

  @Prop({ type: Date, default: null })
  lastActiveAt: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ role: 1, status: 1 });
