/**
 * Marketplace Page
 * Third-party integration directory
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs, TabList, TabTrigger, TabContent } from '@/components/ui/Tabs';
// cn utility available for conditional class names if needed
import {
  useMarketplaceApps,
  useFeaturedApps,
  useInstalledApps,
  useCategoryStats,
} from './useMarketplace';
import { AppCard } from './components/AppCard';
import { CategoryFilter } from './components/CategoryFilter';
import type { AppCategory, MarketplaceFilters } from './types';

export function MarketplacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [activeTab, setActiveTab] = useState<'browse' | 'installed'>('browse');

  // Get filters from URL
  const filters: MarketplaceFilters = {
    category: (searchParams.get('category') as AppCategory) || undefined,
    search: searchParams.get('search') || undefined,
    sort: (searchParams.get('sort') as MarketplaceFilters['sort']) || 'popular',
    page: Number(searchParams.get('page')) || 1,
    pageSize: 12,
  };

  // Queries
  const { data: appsData, isLoading: isLoadingApps } = useMarketplaceApps(filters);
  const { data: featuredApps, isLoading: isLoadingFeatured } = useFeaturedApps();
  const { data: installedApps, isLoading: isLoadingInstalled } = useInstalledApps();
  const { data: categoryStats } = useCategoryStats();

  // Update filters
  const updateFilter = (key: string, value: string | undefined) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    // Reset to page 1 on filter change
    if (key !== 'page') {
      newParams.delete('page');
    }
    setSearchParams(newParams);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('search', searchQuery || undefined);
  };

  const selectedCategory = filters.category;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Integration Marketplace</h1>
          <p className="text-text-secondary mt-1">
            Connect your favorite tools and extend your CRM
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'browse' | 'installed')}>
        <TabList>
          <TabTrigger value="browse">Browse Apps</TabTrigger>
          <TabTrigger value="installed">
            Installed
            {installedApps && installedApps.length > 0 && (
              <Badge variant="primary" className="ml-2">
                {installedApps.length}
              </Badge>
            )}
          </TabTrigger>
        </TabList>

        <TabContent value="browse" className="pt-6">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search integrations..."
                className="max-w-md"
              />
              <Button type="submit" variant="secondary">
                Search
              </Button>
              {filters.search && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSearchQuery('');
                    updateFilter('search', undefined);
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </form>

          {/* Featured Apps (only show when not filtering) */}
          {!selectedCategory && !filters.search && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Featured Integrations</h2>
              {isLoadingFeatured ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-48" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featuredApps?.slice(0, 3).map((app) => (
                    <AppCard key={app.id} app={app} featured />
                  ))}
                </div>
              )}
            </section>
          )}

          <div className="flex gap-6">
            {/* Category Sidebar */}
            <aside className="w-64 flex-shrink-0 hidden lg:block">
              <CategoryFilter
                categories={categoryStats || []}
                selected={selectedCategory}
                onSelect={(cat) => updateFilter('category', cat)}
              />
            </aside>

            {/* App Grid */}
            <div className="flex-1">
              {/* Sort Controls */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-text-muted">
                  {appsData?.total || 0} integrations
                  {selectedCategory && ` in ${selectedCategory.replace('_', ' ')}`}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-muted">Sort:</span>
                  <select
                    value={filters.sort || 'popular'}
                    onChange={(e) => updateFilter('sort', e.target.value)}
                    className="text-sm border border-border rounded-md px-2 py-1"
                  >
                    <option value="popular">Most Popular</option>
                    <option value="rating">Highest Rated</option>
                    <option value="recent">Recently Added</option>
                    <option value="name">Name A-Z</option>
                  </select>
                </div>
              </div>

              {/* Apps */}
              {isLoadingApps ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-48" />
                  ))}
                </div>
              ) : appsData?.apps.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-text-muted">No integrations found</p>
                    {filters.search && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setSearchQuery('');
                          updateFilter('search', undefined);
                        }}
                        className="mt-2"
                      >
                        Clear search
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {appsData?.apps.map((app) => (
                    <AppCard key={app.id} app={app} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {appsData && appsData.total > appsData.pageSize && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={appsData.page <= 1}
                    onClick={() => updateFilter('page', String(appsData.page - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-text-muted">
                    Page {appsData.page} of {Math.ceil(appsData.total / appsData.pageSize)}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={appsData.page >= Math.ceil(appsData.total / appsData.pageSize)}
                    onClick={() => updateFilter('page', String(appsData.page + 1))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabContent>

        <TabContent value="installed" className="pt-6">
          {isLoadingInstalled ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : installedApps?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-bg-muted flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-text-primary mb-2">No apps installed</h3>
                <p className="text-text-secondary mb-4">
                  Browse our marketplace to find integrations for your business
                </p>
                <Button onClick={() => setActiveTab('browse')}>Browse Apps</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {installedApps?.map((installed) => (
                <InstalledAppCard key={installed.appId} installed={installed} />
              ))}
            </div>
          )}
        </TabContent>
      </Tabs>
    </div>
  );
}

// ============================================
// Installed App Card Component
// ============================================

import type { InstalledApp } from './types';
import { useUninstallApp, useSyncApp } from './useMarketplace';
import { toastSuccess, toastError } from '@/components/ui/Toast';

function InstalledAppCard({ installed }: { installed: InstalledApp }) {
  const uninstall = useUninstallApp();
  const sync = useSyncApp();

  const handleUninstall = async () => {
    if (!confirm(`Are you sure you want to uninstall ${installed.app.name}?`)) {
      return;
    }

    try {
      await uninstall.mutateAsync(installed.appId);
      toastSuccess('App uninstalled successfully');
    } catch (error) {
      toastError('Failed to uninstall app');
    }
  };

  const handleSync = async () => {
    try {
      await sync.mutateAsync(installed.appId);
      toastSuccess('Sync completed');
    } catch (error) {
      toastError('Sync failed');
    }
  };

  const statusBadge = {
    installed: { variant: 'success' as const, label: 'Active' },
    needs_update: { variant: 'warning' as const, label: 'Update Available' },
    error: { variant: 'danger' as const, label: 'Error' },
    installing: { variant: 'info' as const, label: 'Installing' },
    not_installed: { variant: 'secondary' as const, label: 'Not Installed' },
  }[installed.installStatus];

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          <img
            src={installed.app.iconUrl}
            alt={installed.app.name}
            className="w-12 h-12 rounded-lg object-cover"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-text-primary">{installed.app.name}</h3>
              <Badge variant={statusBadge.variant}>
                {statusBadge.label}
              </Badge>
            </div>
            <p className="text-sm text-text-secondary">{installed.app.shortDescription}</p>
            <p className="text-xs text-text-muted mt-1">
              v{installed.version} • Installed {new Date(installed.installedAt).toLocaleDateString()}
              {installed.lastSync && (
                <> • Last synced {new Date(installed.lastSync).toLocaleString()}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSync}
              disabled={sync.isPending}
            >
              {sync.isPending ? 'Syncing...' : 'Sync'}
            </Button>
            <Button variant="secondary" size="sm">
              Settings
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUninstall}
              disabled={uninstall.isPending}
              className="text-danger hover:text-danger"
            >
              Uninstall
            </Button>
          </div>
        </div>
        {installed.errorMessage && (
          <div className="mt-3 p-2 bg-danger/10 rounded text-sm text-danger">
            {installed.errorMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
