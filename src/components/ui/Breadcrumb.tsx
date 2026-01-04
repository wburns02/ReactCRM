import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Breadcrumb item definition
 */
export interface BreadcrumbItem {
  /** Display label for the breadcrumb */
  label: string;
  /** Link href (if omitted, renders as text - typically for current page) */
  href?: string;
}

/**
 * Props for the Breadcrumb component
 */
export interface BreadcrumbProps {
  /** Array of breadcrumb items */
  items: BreadcrumbItem[];
  /** Additional CSS class */
  className?: string;
  /** Show home icon for first item */
  showHomeIcon?: boolean;
  /** Custom separator element */
  separator?: ReactNode;
  /** Maximum items to show on mobile (shows first and last, with ellipsis) */
  maxMobileItems?: number;
}

/**
 * Home Icon
 */
function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

/**
 * Chevron Right Separator Icon
 */
function ChevronSeparator({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/**
 * Breadcrumb Link component - renders as React Router Link or span
 */
function BreadcrumbLink({
  item,
  isLast,
  showHomeIcon,
  isFirst,
}: {
  item: BreadcrumbItem;
  isLast: boolean;
  showHomeIcon: boolean;
  isFirst: boolean;
}) {
  const content = (
    <>
      {showHomeIcon && isFirst && (
        <HomeIcon className="mr-1.5 flex-shrink-0" />
      )}
      <span className={cn(showHomeIcon && isFirst && 'sr-only sm:not-sr-only')}>
        {item.label}
      </span>
    </>
  );

  // Last item is always text (current page)
  if (isLast || !item.href) {
    return (
      <span
        className={cn(
          'inline-flex items-center text-sm font-medium',
          isLast
            ? 'text-text-primary'
            : 'text-text-muted'
        )}
        aria-current={isLast ? 'page' : undefined}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      to={item.href}
      className={cn(
        'inline-flex items-center text-sm font-medium transition-colors',
        'text-text-muted hover:text-text-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded'
      )}
    >
      {content}
    </Link>
  );
}

/**
 * Breadcrumb component - accessible navigation breadcrumb trail
 *
 * Features:
 * - Optional home icon for first item
 * - Last item rendered as current page (not a link)
 * - Custom separator support
 * - Responsive collapse on mobile (shows first, ellipsis, last)
 * - Full accessibility with nav landmark and aria-current
 * - Keyboard navigable links
 */
export function Breadcrumb({
  items,
  className,
  showHomeIcon = false,
  separator,
  maxMobileItems = 2,
}: BreadcrumbProps) {
  if (!items || items.length === 0) {
    return null;
  }

  const separatorElement = separator || (
    <ChevronSeparator className="text-text-muted mx-2 flex-shrink-0" />
  );

  // Determine which items to show on mobile
  const shouldCollapse = items.length > maxMobileItems;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center', className)}
    >
      <ol className="flex items-center flex-wrap">
        {items.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === items.length - 1;
          const isMiddle = !isFirst && !isLast;

          // Mobile visibility classes
          const mobileClasses = shouldCollapse && isMiddle
            ? 'hidden sm:flex'
            : 'flex';

          return (
            <Fragment key={`${item.label}-${index}`}>
              <li className={cn('items-center', mobileClasses)}>
                <BreadcrumbLink
                  item={item}
                  isLast={isLast}
                  showHomeIcon={showHomeIcon}
                  isFirst={isFirst}
                />
              </li>

              {/* Separator (not after last item) */}
              {!isLast && (
                <li
                  role="presentation"
                  className={cn(
                    'items-center',
                    // Hide separator before middle items on mobile
                    shouldCollapse && isMiddle ? 'hidden sm:flex' : 'flex',
                    // Also hide separator after first item if next is middle (hidden)
                    shouldCollapse && isFirst && items.length > 2 ? 'hidden sm:flex' : ''
                  )}
                  aria-hidden="true"
                >
                  {separatorElement}
                </li>
              )}
            </Fragment>
          );
        })}

        {/* Mobile ellipsis indicator */}
        {shouldCollapse && (
          <li className="flex items-center sm:hidden" aria-hidden="true">
            <span className="text-sm text-text-muted mx-1">...</span>
            {separatorElement}
          </li>
        )}
      </ol>
    </nav>
  );
}

/**
 * BreadcrumbSeparator - standalone separator for custom compositions
 */
export function BreadcrumbSeparator({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span
      role="presentation"
      aria-hidden="true"
      className={cn('mx-2 text-text-muted', className)}
    >
      {children || <ChevronSeparator />}
    </span>
  );
}
