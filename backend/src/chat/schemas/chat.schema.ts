import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ChatDocument = HydratedDocument<Chat>;

@Schema({ timestamps: true })
export class Chat {
  @Prop({ type: [Types.ObjectId], ref: 'User', required: true })
  participantIds: Types.ObjectId[];

  @Prop({ type: Date, default: null })
  lastMessageAt: Date | null;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
ChatSchema.index({ participantIds: 1 });
