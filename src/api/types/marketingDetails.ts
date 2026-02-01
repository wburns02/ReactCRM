/**
 * Marketing Details Types
 *
 * Types for drill-down detail data in the Marketing Tasks dashboard.
 * These types represent the detailed data shown when clicking metric cards.
 */

export interface KeywordDetail {
  id: number;
  keyword: string;
  position: number | null;
  impressions: number;
  clicks: number;
  ctr: number;
  county?: string;
  category?: string;
  recordedAt: string;
}

export interface PageDetail {
  id: number;
  url: string;
  indexed: boolean;
  lastCrawled: string | null;
  statusCode: number | null;
  createdAt: string;
}

export interface ContentDetail {
  id: number;
  contentType: "blog" | "faq" | "service_description" | "gbp_post";
  title: string;
  topic?: string;
  content: string;
  keywordsUsed: string[];
  published: boolean;
  publishedUrl: string | null;
  createdAt: string;
}

export interface ReviewDetail {
  id: number;
  platform: string;
  author: string;
  rating: number;
  reviewText: string;
  responseText: string | null;
  respondedAt: string | null;
  reviewDate: string;
  createdAt: string;
}

export interface VitalDetail {
  id: number;
  url: string;
  lcpMs: number;
  inpMs: number;
  cls: number;
  fcpMs: number;
  ttfbMs: number;
  performanceScore: number;
  accessibilityScore: number;
  seoScore: number;
  bestPracticesScore: number;
  recordedAt: string;
}

// API Response types
export interface KeywordsResponse {
  success: boolean;
  keywords: KeywordDetail[];
  total: number;
}

export interface PagesResponse {
  success: boolean;
  pages: PageDetail[];
  total: number;
  indexed: number;
  notIndexed: number;
}

export interface ContentResponse {
  success: boolean;
  content: ContentDetail[];
  total: number;
}

export interface ReviewsResponse {
  success: boolean;
  reviews: ReviewDetail[];
  total: number;
  averageRating: number;
  pendingResponses: number;
}

export interface VitalsResponse {
  success: boolean;
  vitals: VitalDetail[];
  latest: VitalDetail | null;
}

// Drawer state type
export type DrawerType = "keywords" | "pages" | "content" | "reviews" | "vitals" | null;

export interface DrawerState {
  isOpen: boolean;
  type: DrawerType;
}
