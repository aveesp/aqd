import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { Role } from '../auth/roles.enum';
import { AuditService } from '../audit/audit.service';
import { CmsService } from './cms.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { CreateFaqItemDto } from './dto/create-faq-item.dto';
import { UpdateFaqItemDto } from './dto/update-faq-item.dto';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

// Content management (blog/testimonials/FAQ/banners) — site-wide marketing
// content, not user-support work, so scoped to admin/super_admin only
// (unlike the verification queue, which support_staff/matchmaking_staff
// also handle).
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.Admin, Role.SuperAdmin)
@Controller('admin/cms')
export class AdminCmsController {
  constructor(
    private readonly cmsService: CmsService,
    private readonly auditService: AuditService,
  ) {}

  // --- Blog ---

  @Get('blog')
  listBlogPosts(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.cmsService.listAllBlogPosts(Number(page), Number(limit));
  }

  @Post('blog')
  async createBlogPost(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: CreateBlogPostDto,
  ) {
    const post = await this.cmsService.createBlogPost(dto);
    await this.auditService.log({
      actorId: actor.sub,
      action: 'cms.blog.create',
      targetType: 'blog_post',
      targetId: post.id,
      after: { title: post.title, slug: post.slug, published: post.published },
    });
    return post;
  }

  @Patch('blog/:id')
  async updateBlogPost(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBlogPostDto,
  ) {
    const post = await this.cmsService.updateBlogPost(id, dto);
    await this.auditService.log({
      actorId: actor.sub,
      action: 'cms.blog.update',
      targetType: 'blog_post',
      targetId: id,
      after: { title: post.title, slug: post.slug, published: post.published },
    });
    return post;
  }

  @Delete('blog/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBlogPost(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
  ) {
    await this.cmsService.deleteBlogPost(id);
    await this.auditService.log({
      actorId: actor.sub,
      action: 'cms.blog.delete',
      targetType: 'blog_post',
      targetId: id,
    });
  }

  // --- Testimonials ---

  @Get('testimonials')
  listTestimonials() {
    return this.cmsService.listAllTestimonials();
  }

  @Post('testimonials')
  async createTestimonial(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: CreateTestimonialDto,
  ) {
    const testimonial = await this.cmsService.createTestimonial(dto);
    await this.auditService.log({
      actorId: actor.sub,
      action: 'cms.testimonial.create',
      targetType: 'testimonial',
      targetId: testimonial.id,
    });
    return testimonial;
  }

  @Patch('testimonials/:id')
  async updateTestimonial(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTestimonialDto,
  ) {
    const testimonial = await this.cmsService.updateTestimonial(id, dto);
    await this.auditService.log({
      actorId: actor.sub,
      action: 'cms.testimonial.update',
      targetType: 'testimonial',
      targetId: id,
    });
    return testimonial;
  }

  @Delete('testimonials/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTestimonial(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
  ) {
    await this.cmsService.deleteTestimonial(id);
    await this.auditService.log({
      actorId: actor.sub,
      action: 'cms.testimonial.delete',
      targetType: 'testimonial',
      targetId: id,
    });
  }

  // --- FAQ ---

  @Get('faq')
  listFaqItems() {
    return this.cmsService.listAllFaqItems();
  }

  @Post('faq')
  async createFaqItem(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: CreateFaqItemDto,
  ) {
    const item = await this.cmsService.createFaqItem(dto);
    await this.auditService.log({
      actorId: actor.sub,
      action: 'cms.faq.create',
      targetType: 'faq_item',
      targetId: item.id,
    });
    return item;
  }

  @Patch('faq/:id')
  async updateFaqItem(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateFaqItemDto,
  ) {
    const item = await this.cmsService.updateFaqItem(id, dto);
    await this.auditService.log({
      actorId: actor.sub,
      action: 'cms.faq.update',
      targetType: 'faq_item',
      targetId: id,
    });
    return item;
  }

  @Delete('faq/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFaqItem(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
  ) {
    await this.cmsService.deleteFaqItem(id);
    await this.auditService.log({
      actorId: actor.sub,
      action: 'cms.faq.delete',
      targetType: 'faq_item',
      targetId: id,
    });
  }

  // --- Banners ---

  @Get('banners')
  listBanners() {
    return this.cmsService.listAllBanners();
  }

  @Post('banners')
  async createBanner(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: CreateBannerDto,
  ) {
    const banner = await this.cmsService.createBanner(dto);
    await this.auditService.log({
      actorId: actor.sub,
      action: 'cms.banner.create',
      targetType: 'banner',
      targetId: banner.id,
    });
    return banner;
  }

  @Patch('banners/:id')
  async updateBanner(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBannerDto,
  ) {
    const banner = await this.cmsService.updateBanner(id, dto);
    await this.auditService.log({
      actorId: actor.sub,
      action: 'cms.banner.update',
      targetType: 'banner',
      targetId: id,
    });
    return banner;
  }

  @Delete('banners/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBanner(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
  ) {
    await this.cmsService.deleteBanner(id);
    await this.auditService.log({
      actorId: actor.sub,
      action: 'cms.banner.delete',
      targetType: 'banner',
      targetId: id,
    });
  }
}
