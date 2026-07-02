import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TestimonialDocument = HydratedDocument<Testimonial>;

@Schema({ timestamps: true })
export class Testimonial {
  @Prop({ required: true, trim: true })
  authorName: string;

  @Prop({ trim: true })
  authorLocation?: string;

  @Prop({ required: true, trim: true, maxlength: 1000 })
  quote: string;

  @Prop({ type: Number, min: 1, max: 5, default: 5 })
  rating: number;

  @Prop({ trim: true })
  photoUrl?: string;

  @Prop({ default: false })
  published: boolean;

  @Prop({ type: Number, default: 0 })
  order: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TestimonialSchema = SchemaFactory.createForClass(Testimonial);
TestimonialSchema.index({ published: 1, order: 1 });
