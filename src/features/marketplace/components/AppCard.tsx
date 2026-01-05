/**
 * App Card Component
 * Display card for marketplace apps
 */
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { MarketplaceApp } from '../types';

interface AppCardProps {
  app: MarketplaceApp;
  featured?: boolean;
}

export function AppCard({ app, featured }: AppCardProps) {
  const pricingLabel = {
    free: 'Free',
    freemium: 'Free tier available',
    paid: app.pricing.price ? `$${app.pricing.price}/${app.pricing.billingPeriod === 'yearly' ? 'yr' : 'mo'}` : 'Paid',
    contact: 'Contact for pricing',
  }[app.pricing.type];

  const statusBadge = {
    active: null,
    beta: { variant: 'warning' as const, label: 'Beta' },
    coming_soon: { variant: 'secondary' as const, label: 'Coming Soon' },
    deprecated: { variant: 'danger' as const, label: 'Deprecated' },
  }[app.status];

  return (
    <Link to={`/marketplace/${app.slug}`}>
      <Card className={cn(
        'h-full hover:shadow-md transition-shadow cursor-pointer',
        featured && 'ring-2 ring-primary/20'
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <img
              src={app.iconUrl}
              alt={app.name}
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-text-primary truncate">{app.name}</h3>
                {app.developer.verified && (
                  <svg className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {statusBadge && (
                  <Badge variant={statusBadge.variant} size="sm">
                    {statusBadge.label}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-text-muted mt-0.5">{app.developer.name}</p>
            </div>
          </div>

          <p className="text-sm text-text-secondary mt-3 line-clamp-2">
            {app.shortDescription}
          </p>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              {/* Rating */}
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm font-medium">{app.rating.toFixed(1)}</span>
                <span className="text-xs text-text-muted">({app.reviewCount})</span>
              </div>

              {/* Install Count */}
              <span className="text-xs text-text-muted">
                {app.installCount >= 1000
                  ? `${(app.installCount / 1000).toFixed(1)}k installs`
                  : `${app.installCount} installs`}
              </span>
            </div>

            {/* Price */}
            <Badge variant={app.pricing.type === 'free' ? 'success' : 'secondary'} size="sm">
              {pricingLabel}
            </Badge>
          </div>

          {/* Tags */}
          {app.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {app.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-xs bg-bg-muted px-2 py-0.5 rounded">
                  {tag}
                </span>
              ))}
              {app.tags.length > 3 && (
                <span className="text-xs text-text-muted">+{app.tags.length - 3}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
