import { useRef, type ReactNode, type CSSProperties } from 'react';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

/**
 * VirtualList - Efficient rendering of large lists
 *
 * Uses TanStack Virtual for windowing - only renders visible items.
 * Essential for lists with 100+ items to maintain smooth scrolling.
 */

interface VirtualListProps<T> {
  /** Data items to render */
  items: T[];
  /** Height of each row in pixels */
  estimatedItemHeight: number;
  /** Render function for each item */
  renderItem: (item: T, index: number, style: CSSProperties) => ReactNode;
  /** Number of items to render above/below visible area */
  overscan?: number;
  /** Container height (default: 100%) */
  height?: number | string;
  /** Container class */
  className?: string;
  /** Empty state */
  emptyState?: ReactNode;
  /** Key extractor for items */
  getItemKey?: (item: T, index: number) => string | number;
}

export function VirtualList<T>({
  items,
  estimatedItemHeight,
  renderItem,
  overscan = 5,
  height = '100%',
  className,
  emptyState,
  getItemKey,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedItemHeight,
    overscan,
    getItemKey: getItemKey
      ? (index) => getItemKey(items[index], index)
      : undefined,
  });

  if (items.length === 0) {
    return emptyState ? <>{emptyState}</> : null;
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', className)}
      style={{ height }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem: VirtualItem) => {
          const item = items[virtualItem.index];
          const style: CSSProperties = {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: `${virtualItem.size}px`,
            transform: `translateY(${virtualItem.start}px)`,
          };

          return (
            <div key={virtualItem.key} style={style}>
              {renderItem(item, virtualItem.index, style)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * VirtualTable - Virtual scrolling for tables
 */
interface VirtualTableProps<T> {
  /** Data items to render */
  items: T[];
  /** Row height in pixels */
  rowHeight: number;
  /** Table headers */
  headers: { key: string; label: string; width?: string }[];
  /** Render function for each cell */
  renderCell: (item: T, columnKey: string, index: number) => ReactNode;
  /** Number of rows to render above/below visible area */
  overscan?: number;
  /** Container height */
  height?: number | string;
  /** Container class */
  className?: string;
  /** Empty state */
  emptyState?: ReactNode;
  /** On row click */
  onRowClick?: (item: T, index: number) => void;
  /** Key extractor */
  getRowKey?: (item: T, index: number) => string | number;
}

export function VirtualTable<T>({
  items,
  rowHeight,
  headers,
  renderCell,
  overscan = 10,
  height = 400,
  className,
  emptyState,
  onRowClick,
  getRowKey,
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
    getItemKey: getRowKey
      ? (index) => getRowKey(items[index], index)
      : undefined,
  });

  if (items.length === 0) {
    return emptyState ? <>{emptyState}</> : null;
  }

  const virtualRows = virtualizer.getVirtualItems();

  return (
    <div className={cn('overflow-hidden border border-border rounded-lg', className)}>
      {/* Fixed header */}
      <div className="bg-bg-muted border-b border-border">
        <div className="flex">
          {headers.map((header) => (
            <div
              key={header.key}
              className="px-4 py-3 text-left text-sm font-medium text-text-primary"
              style={{ width: header.width || 'auto', flex: header.width ? 'none' : 1 }}
            >
              {header.label}
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable body */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualRows.map((virtualRow: VirtualItem) => {
            const item = items[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                className={cn(
                  'flex border-b border-border last:border-b-0',
                  onRowClick && 'cursor-pointer hover:bg-bg-hover',
                  virtualRow.index % 2 === 0 ? 'bg-bg-card' : 'bg-bg-body'
                )}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onRowClick?.(item, virtualRow.index)}
              >
                {headers.map((header) => (
                  <div
                    key={header.key}
                    className="px-4 py-3 text-sm text-text-secondary truncate"
                    style={{ width: header.width || 'auto', flex: header.width ? 'none' : 1 }}
                  >
                    {renderCell(item, header.key, virtualRow.index)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * useVirtualScroll - Hook for custom virtual scrolling implementations
 */
export function useVirtualScroll<T>(options: {
  items: T[];
  estimatedItemHeight: number;
  containerRef: React.RefObject<HTMLElement>;
  overscan?: number;
}) {
  const { items, estimatedItemHeight, containerRef, overscan = 5 } = options;

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => estimatedItemHeight,
    overscan,
  });

  return {
    virtualItems: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
    scrollToIndex: virtualizer.scrollToIndex,
    measureElement: virtualizer.measureElement,
  };
}
