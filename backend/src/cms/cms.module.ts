import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CmsController } from './cms.controller';
import { AdminCmsController } from './admin-cms.controller';
import { CmsService } from './cms.service';
import { BlogPost, BlogPostSchema } from './schemas/blog-post.schema';
import { Testimonial, TestimonialSchema } from './schemas/testimonial.schema';
import { FaqItem, FaqItemSchema } from './schemas/faq-item.schema';
import { Banner, BannerSchema } from './schemas/banner.schema';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BlogPost.name, schema: BlogPostSchema },
      { name: Testimonial.name, schema: TestimonialSchema },
      { name: FaqItem.name, schema: FaqItemSchema },
      { name: Banner.name, schema: BannerSchema },
    ]),
    AuditModule,
  ],
  controllers: [CmsController, AdminCmsController],
  providers: [CmsService],
  exports: [CmsService],
})
export class CmsModule {}
