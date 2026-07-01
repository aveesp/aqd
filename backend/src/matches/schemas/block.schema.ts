import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BlockDocument = HydratedDocument<Block>;

@Schema({ timestamps: true })
export class Block {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  blockerUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  blockedUserId: Types.ObjectId;
}

export const BlockSchema = SchemaFactory.createForClass(Block);
BlockSchema.index({ blockerUserId: 1, blockedUserId: 1 }, { unique: true });
