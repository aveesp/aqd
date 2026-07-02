import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BlogPost, BlogPostDocument } from './schemas/blog-post.schema';
import { Testimonial, TestimonialDocument } from './schemas/testimonial.schema';
import { FaqItem, FaqItemDocument } from './schemas/faq-item.schema';
import { Banner, BannerDocument } from './schemas/banner.schema';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { CreateFaqItemDto } from './dto/create-faq-item.dto';
import { UpdateFaqItemDto } from './dto/update-faq-item.dto';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

@Injectable()
export class CmsService {
  constructor(
    @InjectModel(BlogPost.name)
    private readonly blogPostModel: Model<BlogPostDocument>,
    @InjectModel(Testimonial.name)
    private readonly testimonialModel: Model<TestimonialDocument>,
    @InjectModel(FaqItem.name)
    private readonly faqItemModel: Model<FaqItemDocument>,
    @InjectModel(Banner.name)
    private readonly bannerModel: Model<BannerDocument>,
  ) {}

  // --- Blog ---

  async listPublishedBlogPosts(
    page: number,
    limit: number,
  ): Promise<{
    posts: BlogPostDocument[];
    page: number;
    limit: number;
    total: number;
  }> {
    const filter = { published: true };
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      this.blogPostModel
        .find(filter)
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.blogPostModel.countDocuments(filter).exec(),
    ]);
    return { posts, page, limit, total };
  }

  async getPublishedBlogPostBySlug(slug: string): Promise<BlogPostDocument> {
    const post = await this.blogPostModel
      .findOne({ slug, published: true })
      .exec();
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }
    return post;
  }

  async listAllBlogPosts(
    page: number,
    limit: number,
  ): Promise<{
    posts: BlogPostDocument[];
    page: number;
    limit: number;
    total: number;
  }> {
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      this.blogPostModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.blogPostModel.countDocuments().exec(),
    ]);
    return { posts, page, limit, total };
  }

  async createBlogPost(dto: CreateBlogPostDto): Promise<BlogPostDocument> {
    const existing = await this.blogPostModel
      .findOne({ slug: dto.slug })
      .exec();
    if (existing) {
      throw new ConflictException('A blog post with this slug already exists');
    }
    return this.blogPostModel.create({
      ...dto,
      publishedAt: dto.published ? new Date() : null,
    });
  }

  async updateBlogPost(
    id: string,
    dto: UpdateBlogPostDto,
  ): Promise<BlogPostDocument> {
    const post = await this.blogPostModel.findById(id).exec();
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }
    if (dto.slug && dto.slug !== post.slug) {
      const existing = await this.blogPostModel
        .findOne({ slug: dto.slug })
        .exec();
      if (existing) {
        throw new ConflictException(
          'A blog post with this slug already exists',
        );
      }
    }
    Object.assign(post, dto);
    if (dto.published && !post.publishedAt) {
      post.publishedAt = new Date();
    }
    if (dto.published === false) {
      post.publishedAt = null;
    }
    await post.save();
    return post;
  }

  async deleteBlogPost(id: string): Promise<void> {
    const res = await this.blogPostModel.deleteOne({ _id: id }).exec();
    if (res.deletedCount === 0) {
      throw new NotFoundException('Blog post not found');
    }
  }

  // --- Testimonials ---

  async listPublishedTestimonials(): Promise<TestimonialDocument[]> {
    return this.testimonialModel
      .find({ published: true })
      .sort({ order: 1 })
      .exec();
  }

  async listAllTestimonials(): Promise<TestimonialDocument[]> {
    return this.testimonialModel.find().sort({ order: 1 }).exec();
  }

  async createTestimonial(
    dto: CreateTestimonialDto,
  ): Promise<TestimonialDocument> {
    return this.testimonialModel.create(dto);
  }

  async updateTestimonial(
    id: string,
    dto: UpdateTestimonialDto,
  ): Promise<TestimonialDocument> {
    const testimonial = await this.testimonialModel
      .findByIdAndUpdate(id, dto, { returnDocument: 'after' })
      .exec();
    if (!testimonial) {
      throw new NotFoundException('Testimonial not found');
    }
    return testimonial;
  }

  async deleteTestimonial(id: string): Promise<void> {
    const res = await this.testimonialModel.deleteOne({ _id: id }).exec();
    if (res.deletedCount === 0) {
      throw new NotFoundException('Testimonial not found');
    }
  }

  // --- FAQ ---

  async listPublishedFaqItems(): Promise<FaqItemDocument[]> {
    return this.faqItemModel
      .find({ published: true })
      .sort({ category: 1, order: 1 })
      .exec();
  }

  async listAllFaqItems(): Promise<FaqItemDocument[]> {
    return this.faqItemModel.find().sort({ category: 1, order: 1 }).exec();
  }

  async createFaqItem(dto: CreateFaqItemDto): Promise<FaqItemDocument> {
    return this.faqItemModel.create(dto);
  }

  async updateFaqItem(
    id: string,
    dto: UpdateFaqItemDto,
  ): Promise<FaqItemDocument> {
    const item = await this.faqItemModel
      .findByIdAndUpdate(id, dto, { returnDocument: 'after' })
      .exec();
    if (!item) {
      throw new NotFoundException('FAQ item not found');
    }
    return item;
  }

  async deleteFaqItem(id: string): Promise<void> {
    const res = await this.faqItemModel.deleteOne({ _id: id }).exec();
    if (res.deletedCount === 0) {
      throw new NotFoundException('FAQ item not found');
    }
  }

  // --- Banners ---

  async listActiveBanners(): Promise<BannerDocument[]> {
    return this.bannerModel.find({ active: true }).sort({ order: 1 }).exec();
  }

  async listAllBanners(): Promise<BannerDocument[]> {
    return this.bannerModel.find().sort({ order: 1 }).exec();
  }

  async createBanner(dto: CreateBannerDto): Promise<BannerDocument> {
    return this.bannerModel.create(dto);
  }

  async updateBanner(
    id: string,
    dto: UpdateBannerDto,
  ): Promise<BannerDocument> {
    const banner = await this.bannerModel
      .findByIdAndUpdate(id, dto, { returnDocument: 'after' })
      .exec();
    if (!banner) {
      throw new NotFoundException('Banner not found');
    }
    return banner;
  }

  async deleteBanner(id: string): Promise<void> {
    const res = await this.bannerModel.deleteOne({ _id: id }).exec();
    if (res.deletedCount === 0) {
      throw new NotFoundException('Banner not found');
    }
  }
}
