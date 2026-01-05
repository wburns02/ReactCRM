/**
 * Marketplace Types
 * Third-party integration directory and partner ecosystem
 */

// ============================================
// App/Integration Types
// ============================================

export type AppCategory =
  | 'accounting'
  | 'communication'
  | 'marketing'
  | 'payments'
  | 'scheduling'
  | 'analytics'
  | 'inventory'
  | 'field_service'
  | 'crm'
  | 'documents'
  | 'hr'
  | 'utilities';

export type AppStatus = 'active' | 'beta' | 'coming_soon' | 'deprecated';

export type InstallStatus = 'not_installed' | 'installing' | 'installed' | 'needs_update' | 'error';

export interface AppDeveloper {
  id: string;
  name: string;
  website?: string;
  supportEmail?: string;
  verified: boolean;
  partnerTier?: 'standard' | 'certified' | 'premier';
}

export interface AppPricing {
  type: 'free' | 'freemium' | 'paid' | 'contact';
  price?: number;
  currency?: string;
  billingPeriod?: 'monthly' | 'yearly' | 'one_time';
  trialDays?: number;
  features?: string[];
}

export interface AppPermission {
  scope: string;
  description: string;
  required: boolean;
}

export interface MarketplaceApp {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  category: AppCategory;
  tags: string[];
  status: AppStatus;
  version: string;
  developer: AppDeveloper;
  pricing: AppPricing;
  permissions: AppPermission[];
  iconUrl: string;
  screenshotUrls: string[];
  rating: number;
  reviewCount: number;
  installCount: number;
  lastUpdated: string;
  createdAt: string;
  features: string[];
  integrations?: string[]; // Other apps this integrates with
  documentation?: string;
  changelog?: string;
}

export interface InstalledApp {
  appId: string;
  app: MarketplaceApp;
  installStatus: InstallStatus;
  installedAt: string;
  installedBy: string;
  version: string;
  settings: Record<string, unknown>;
  lastSync?: string;
  errorMessage?: string;
}

// ============================================
// Review Types
// ============================================

export interface AppReview {
  id: string;
  appId: string;
  userId: string;
  userName: string;
  userCompany?: string;
  rating: number;
  title: string;
  body: string;
  helpfulCount: number;
  createdAt: string;
  updatedAt?: string;
  developerResponse?: {
    body: string;
    respondedAt: string;
  };
}

// ============================================
// API Types
// ============================================

export interface MarketplaceFilters {
  category?: AppCategory;
  status?: AppStatus;
  pricing?: AppPricing['type'];
  search?: string;
  sort?: 'popular' | 'rating' | 'recent' | 'name';
  page?: number;
  pageSize?: number;
}

export interface MarketplaceResponse {
  apps: MarketplaceApp[];
  total: number;
  page: number;
  pageSize: number;
  categories: Array<{ category: AppCategory; count: number }>;
}

export interface AppInstallRequest {
  appId: string;
  acceptedPermissions: string[];
  settings?: Record<string, unknown>;
}

export interface AppInstallResponse {
  success: boolean;
  installedApp?: InstalledApp;
  error?: string;
  oauthUrl?: string; // For OAuth-based integrations
}

// ============================================
// Category Metadata
// ============================================

export const CATEGORY_INFO: Record<AppCategory, { label: string; icon: string; description: string }> = {
  accounting: {
    label: 'Accounting',
    icon: 'calculator',
    description: 'QuickBooks, Xero, FreshBooks integrations',
  },
  communication: {
    label: 'Communication',
    icon: 'message-circle',
    description: 'SMS, Email, Chat, VoIP integrations',
  },
  marketing: {
    label: 'Marketing',
    icon: 'megaphone',
    description: 'Email marketing, social media, advertising',
  },
  payments: {
    label: 'Payments',
    icon: 'credit-card',
    description: 'Payment processing and financing',
  },
  scheduling: {
    label: 'Scheduling',
    icon: 'calendar',
    description: 'Calendars and scheduling tools',
  },
  analytics: {
    label: 'Analytics',
    icon: 'bar-chart',
    description: 'Business intelligence and reporting',
  },
  inventory: {
    label: 'Inventory',
    icon: 'box',
    description: 'Parts and inventory management',
  },
  field_service: {
    label: 'Field Service',
    icon: 'truck',
    description: 'Field operations and fleet management',
  },
  crm: {
    label: 'CRM',
    icon: 'users',
    description: 'Customer relationship tools',
  },
  documents: {
    label: 'Documents',
    icon: 'file-text',
    description: 'Document management and e-signatures',
  },
  hr: {
    label: 'HR & Payroll',
    icon: 'briefcase',
    description: 'Human resources and payroll',
  },
  utilities: {
    label: 'Utilities',
    icon: 'settings',
    description: 'Tools and utilities',
  },
};
