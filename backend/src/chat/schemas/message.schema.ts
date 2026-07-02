import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

export const ATTACHMENT_KINDS = ['image', 'voice', 'document'] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

// No public `url` — attachments are private between the two chat
// participants, served only through an authenticated, participancy-checked
// endpoint (see ChatController/ChatService), same reasoning as
// verification documents on Profile.
@Schema({ _id: false })
export class Attachment {
  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ type: String, enum: ATTACHMENT_KINDS, required: true })
  kind: AttachmentKind;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  sizeBytes: number;
}
const AttachmentSchema = SchemaFactory.createForClass(Attachment);

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Chat', required: true })
  chatId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  // Optional when an attachment carries the message instead (e.g. a photo
  // sent with no caption) — enforced in ChatService, not here, since "at
  // least one of content/attachment" isn't expressible as a single-field
  // schema constraint.
  @Prop({ trim: true, maxlength: 5000 })
  content?: string;

  @Prop({ type: AttachmentSchema, default: null })
  attachment: Attachment | null;

  @Prop({ type: Date, default: null })
  readAt: Date | null;

  // Populated by { timestamps: true } below; declared here only so TS knows
  // about them (no @Prop — Mongoose adds these automatically).
  createdAt?: Date;
  updatedAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ chatId: 1, createdAt: -1 });
