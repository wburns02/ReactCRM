/**
 * Marketplace Module
 * Third-party integration directory and partner ecosystem
 */

// Main page
export { MarketplacePage } from "./MarketplacePage";

// Components
export { AppCard } from "./components/AppCard";
export { CategoryFilter } from "./components/CategoryFilter";

// Hooks
export {
  useMarketplaceApps,
  useMarketplaceApp,
  useFeaturedApps,
  useInstalledApps,
  useCategoryStats,
  useAppReviews,
  useInstallApp,
  useUninstallApp,
  useUpdateAppSettings,
  useSubmitReview,
  useSyncApp,
  marketplaceKeys,
} from "./useMarketplace";

// Types
export type {
  AppCategory,
  AppStatus,
  InstallStatus,
  AppDeveloper,
  AppPricing,
  AppPermission,
  MarketplaceApp,
  InstalledApp,
  AppReview,
  MarketplaceFilters,
  MarketplaceResponse,
  AppInstallRequest,
  AppInstallResponse,
} from "./types";

export { CATEGORY_INFO } from "./types";
