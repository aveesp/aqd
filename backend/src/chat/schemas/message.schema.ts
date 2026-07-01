import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Chat', required: true })
  chatId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  // Only text is supported for now — image/voice/document attachments need
  // S3 upload, which isn't wired up yet.
  @Prop({ required: true, trim: true, maxlength: 5000 })
  content: string;

  @Prop({ type: Date, default: null })
  readAt: Date | null;

  // Populated by { timestamps: true } below; declared here only so TS knows
  // about them (no @Prop — Mongoose adds these automatically).
  createdAt?: Date;
  updatedAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ chatId: 1, createdAt: -1 });
