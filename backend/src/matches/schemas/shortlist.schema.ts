import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ShortlistDocument = HydratedDocument<Shortlist>;

@Schema({ timestamps: true })
export class Shortlist {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  targetUserId: Types.ObjectId;
}

export const ShortlistSchema = SchemaFactory.createForClass(Shortlist);
ShortlistSchema.index({ userId: 1, targetUserId: 1 }, { unique: true });
