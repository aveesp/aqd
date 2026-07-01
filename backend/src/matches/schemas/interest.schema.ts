import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InterestDocument = HydratedDocument<Interest>;

export enum InterestStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Declined = 'declined',
}

@Schema({ timestamps: true })
export class Interest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  fromUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  toUserId: Types.ObjectId;

  @Prop({ type: String, enum: InterestStatus, default: InterestStatus.Pending })
  status: InterestStatus;

  @Prop({ type: Date, default: null })
  respondedAt: Date | null;
}

export const InterestSchema = SchemaFactory.createForClass(Interest);
InterestSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });
InterestSchema.index({ toUserId: 1, status: 1 });
