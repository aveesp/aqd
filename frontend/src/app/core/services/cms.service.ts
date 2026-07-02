import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Banner, BlogPost, BlogPostListResult, FaqItem, Testimonial } from '../models/cms.model';

@Injectable({ providedIn: 'root' })
export class CmsService {
  constructor(private readonly http: HttpClient) {}

  // --- Public ---

  listBlogPosts(page = 1, limit = 10): Observable<BlogPostListResult> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<BlogPostListResult>(`${API_BASE_URL}/cms/blog`, { params });
  }

  getBlogPost(slug: string): Observable<BlogPost> {
    return this.http.get<BlogPost>(`${API_BASE_URL}/cms/blog/${slug}`);
  }

  listTestimonials(): Observable<Testimonial[]> {
    return this.http.get<Testimonial[]>(`${API_BASE_URL}/cms/testimonials`);
  }

  listFaqItems(): Observable<FaqItem[]> {
    return this.http.get<FaqItem[]>(`${API_BASE_URL}/cms/faq`);
  }

  listBanners(): Observable<Banner[]> {
    return this.http.get<Banner[]>(`${API_BASE_URL}/cms/banners`);
  }

  // --- Admin ---

  adminListBlogPosts(page = 1, limit = 20): Observable<BlogPostListResult> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<BlogPostListResult>(`${API_BASE_URL}/admin/cms/blog`, { params });
  }

  adminCreateBlogPost(payload: Partial<BlogPost>): Observable<BlogPost> {
    return this.http.post<BlogPost>(`${API_BASE_URL}/admin/cms/blog`, payload);
  }

  adminUpdateBlogPost(id: string, payload: Partial<BlogPost>): Observable<BlogPost> {
    return this.http.patch<BlogPost>(`${API_BASE_URL}/admin/cms/blog/${id}`, payload);
  }

  adminDeleteBlogPost(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/admin/cms/blog/${id}`);
  }

  adminListTestimonials(): Observable<Testimonial[]> {
    return this.http.get<Testimonial[]>(`${API_BASE_URL}/admin/cms/testimonials`);
  }

  adminCreateTestimonial(payload: Partial<Testimonial>): Observable<Testimonial> {
    return this.http.post<Testimonial>(`${API_BASE_URL}/admin/cms/testimonials`, payload);
  }

  adminUpdateTestimonial(id: string, payload: Partial<Testimonial>): Observable<Testimonial> {
    return this.http.patch<Testimonial>(`${API_BASE_URL}/admin/cms/testimonials/${id}`, payload);
  }

  adminDeleteTestimonial(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/admin/cms/testimonials/${id}`);
  }

  adminListFaqItems(): Observable<FaqItem[]> {
    return this.http.get<FaqItem[]>(`${API_BASE_URL}/admin/cms/faq`);
  }

  adminCreateFaqItem(payload: Partial<FaqItem>): Observable<FaqItem> {
    return this.http.post<FaqItem>(`${API_BASE_URL}/admin/cms/faq`, payload);
  }

  adminUpdateFaqItem(id: string, payload: Partial<FaqItem>): Observable<FaqItem> {
    return this.http.patch<FaqItem>(`${API_BASE_URL}/admin/cms/faq/${id}`, payload);
  }

  adminDeleteFaqItem(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/admin/cms/faq/${id}`);
  }

  adminListBanners(): Observable<Banner[]> {
    return this.http.get<Banner[]>(`${API_BASE_URL}/admin/cms/banners`);
  }

  adminCreateBanner(payload: Partial<Banner>): Observable<Banner> {
    return this.http.post<Banner>(`${API_BASE_URL}/admin/cms/banners`, payload);
  }

  adminUpdateBanner(id: string, payload: Partial<Banner>): Observable<Banner> {
    return this.http.patch<Banner>(`${API_BASE_URL}/admin/cms/banners/${id}`, payload);
  }

  adminDeleteBanner(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/admin/cms/banners/${id}`);
  }
}
