export interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  coverImageUrl?: string;
  tags: string[];
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export interface Testimonial {
  _id: string;
  authorName: string;
  authorLocation?: string;
  quote: string;
  rating: number;
  photoUrl?: string;
  published: boolean;
  order: number;
}

export interface FaqItem {
  _id: string;
  question: string;
  answer: string;
  category: string;
  published: boolean;
  order: number;
}

export interface Banner {
  _id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  active: boolean;
  order: number;
}

export interface BlogPostListResult {
  posts: BlogPost[];
  page: number;
  limit: number;
  total: number;
}
