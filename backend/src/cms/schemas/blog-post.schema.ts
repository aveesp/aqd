import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BlogPostDocument = HydratedDocument<BlogPost>;

@Schema({ timestamps: true })
export class BlogPost {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  slug: string;

  @Prop({ trim: true, maxlength: 300 })
  excerpt?: string;

  @Prop({ required: true })
  content: string;

  @Prop({ trim: true })
  coverImageUrl?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: false })
  published: boolean;

  @Prop({ type: Date, default: null })
  publishedAt: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const BlogPostSchema = SchemaFactory.createForClass(BlogPost);
BlogPostSchema.index({ published: 1, publishedAt: -1 });
