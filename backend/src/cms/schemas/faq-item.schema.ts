import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FaqItemDocument = HydratedDocument<FaqItem>;

@Schema({ timestamps: true })
export class FaqItem {
  @Prop({ required: true, trim: true })
  question: string;

  @Prop({ required: true })
  answer: string;

  @Prop({ trim: true, default: 'General' })
  category: string;

  @Prop({ default: false })
  published: boolean;

  @Prop({ type: Number, default: 0 })
  order: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const FaqItemSchema = SchemaFactory.createForClass(FaqItem);
FaqItemSchema.index({ published: 1, category: 1, order: 1 });
