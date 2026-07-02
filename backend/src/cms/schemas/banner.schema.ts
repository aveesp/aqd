import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BannerDocument = HydratedDocument<Banner>;

@Schema({ timestamps: true })
export class Banner {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  imageUrl: string;

  @Prop({ trim: true })
  linkUrl?: string;

  @Prop({ default: true })
  active: boolean;

  @Prop({ type: Number, default: 0 })
  order: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);
BannerSchema.index({ active: 1, order: 1 });
