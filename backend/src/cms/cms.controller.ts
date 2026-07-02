import { Controller, Get, Param, Query } from '@nestjs/common';
import { CmsService } from './cms.service';

// Public, unauthenticated — powers the landing page and any public
// marketing surfaces. Only ever returns published/active content.
@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('blog')
  listBlogPosts(@Query('page') page = '1', @Query('limit') limit = '10') {
    return this.cmsService.listPublishedBlogPosts(Number(page), Number(limit));
  }

  @Get('blog/:slug')
  getBlogPost(@Param('slug') slug: string) {
    return this.cmsService.getPublishedBlogPostBySlug(slug);
  }

  @Get('testimonials')
  listTestimonials() {
    return this.cmsService.listPublishedTestimonials();
  }

  @Get('faq')
  listFaqItems() {
    return this.cmsService.listPublishedFaqItems();
  }

  @Get('banners')
  listBanners() {
    return this.cmsService.listActiveBanners();
  }
}
