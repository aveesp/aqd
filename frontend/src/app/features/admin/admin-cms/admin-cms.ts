import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CmsService } from '../../../core/services/cms.service';
import { Banner, BlogPost, FaqItem, Testimonial } from '../../../core/models/cms.model';
import { AdminNavBar } from '../../../shared/components/admin-nav-bar/admin-nav-bar';

type Tab = 'blog' | 'testimonials' | 'faq' | 'banners';

@Component({
  selector: 'app-admin-cms',
  imports: [ReactiveFormsModule, AdminNavBar],
  templateUrl: './admin-cms.html',
  styleUrl: './admin-cms.scss',
})
export class AdminCms implements OnInit {
  private readonly cmsService = inject(CmsService);
  private readonly fb = inject(FormBuilder);

  readonly tab = signal<Tab>('blog');
  readonly errorMessage = signal<string | null>(null);
  readonly saving = signal(false);

  readonly blogPosts = signal<BlogPost[]>([]);
  readonly testimonials = signal<Testimonial[]>([]);
  readonly faqItems = signal<FaqItem[]>([]);
  readonly banners = signal<Banner[]>([]);

  readonly blogForm = this.fb.nonNullable.group({
    title: [''],
    slug: [''],
    excerpt: [''],
    content: [''],
    coverImageUrl: [''],
    tags: [''],
    published: [false],
  });

  readonly testimonialForm = this.fb.nonNullable.group({
    authorName: [''],
    authorLocation: [''],
    quote: [''],
    rating: [5],
    photoUrl: [''],
    published: [false],
    order: [0],
  });

  readonly faqForm = this.fb.nonNullable.group({
    question: [''],
    answer: [''],
    category: ['General'],
    published: [false],
    order: [0],
  });

  readonly bannerForm = this.fb.nonNullable.group({
    title: [''],
    imageUrl: [''],
    linkUrl: [''],
    active: [true],
    order: [0],
  });

  ngOnInit(): void {
    this.loadAll();
  }

  private loadAll(): void {
    this.cmsService.adminListBlogPosts(1, 50).subscribe((res) => this.blogPosts.set(res.posts));
    this.cmsService.adminListTestimonials().subscribe((items) => this.testimonials.set(items));
    this.cmsService.adminListFaqItems().subscribe((items) => this.faqItems.set(items));
    this.cmsService.adminListBanners().subscribe((items) => this.banners.set(items));
  }

  selectTab(tab: Tab): void {
    this.tab.set(tab);
    this.errorMessage.set(null);
  }

  createBlogPost(): void {
    const raw = this.blogForm.getRawValue();
    this.saving.set(true);
    this.cmsService
      .adminCreateBlogPost({
        title: raw.title,
        slug: raw.slug,
        excerpt: raw.excerpt || undefined,
        content: raw.content,
        coverImageUrl: raw.coverImageUrl || undefined,
        tags: raw.tags ? raw.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        published: raw.published,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.blogForm.reset({ published: false });
          this.loadAll();
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.errorMessage.set(err.error?.message ?? 'Could not create blog post.');
        },
      });
  }

  togglePublishBlogPost(post: BlogPost): void {
    this.cmsService.adminUpdateBlogPost(post._id, { published: !post.published }).subscribe(() => this.loadAll());
  }

  deleteBlogPost(id: string): void {
    this.cmsService.adminDeleteBlogPost(id).subscribe(() => this.loadAll());
  }

  createTestimonial(): void {
    const raw = this.testimonialForm.getRawValue();
    this.saving.set(true);
    this.cmsService
      .adminCreateTestimonial({
        authorName: raw.authorName,
        authorLocation: raw.authorLocation || undefined,
        quote: raw.quote,
        rating: Number(raw.rating),
        photoUrl: raw.photoUrl || undefined,
        published: raw.published,
        order: Number(raw.order),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.testimonialForm.reset({ published: false, rating: 5, order: 0 });
          this.loadAll();
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.errorMessage.set(err.error?.message ?? 'Could not create testimonial.');
        },
      });
  }

  togglePublishTestimonial(item: Testimonial): void {
    this.cmsService.adminUpdateTestimonial(item._id, { published: !item.published }).subscribe(() => this.loadAll());
  }

  deleteTestimonial(id: string): void {
    this.cmsService.adminDeleteTestimonial(id).subscribe(() => this.loadAll());
  }

  createFaqItem(): void {
    const raw = this.faqForm.getRawValue();
    this.saving.set(true);
    this.cmsService
      .adminCreateFaqItem({
        question: raw.question,
        answer: raw.answer,
        category: raw.category || 'General',
        published: raw.published,
        order: Number(raw.order),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.faqForm.reset({ published: false, category: 'General', order: 0 });
          this.loadAll();
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.errorMessage.set(err.error?.message ?? 'Could not create FAQ item.');
        },
      });
  }

  togglePublishFaqItem(item: FaqItem): void {
    this.cmsService.adminUpdateFaqItem(item._id, { published: !item.published }).subscribe(() => this.loadAll());
  }

  deleteFaqItem(id: string): void {
    this.cmsService.adminDeleteFaqItem(id).subscribe(() => this.loadAll());
  }

  createBanner(): void {
    const raw = this.bannerForm.getRawValue();
    this.saving.set(true);
    this.cmsService
      .adminCreateBanner({
        title: raw.title,
        imageUrl: raw.imageUrl,
        linkUrl: raw.linkUrl || undefined,
        active: raw.active,
        order: Number(raw.order),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.bannerForm.reset({ active: true, order: 0 });
          this.loadAll();
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.errorMessage.set(err.error?.message ?? 'Could not create banner.');
        },
      });
  }

  toggleActiveBanner(banner: Banner): void {
    this.cmsService.adminUpdateBanner(banner._id, { active: !banner.active }).subscribe(() => this.loadAll());
  }

  deleteBanner(id: string): void {
    this.cmsService.adminDeleteBanner(id).subscribe(() => this.loadAll());
  }
}
