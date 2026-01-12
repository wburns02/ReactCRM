import { useRef, type ReactNode, type CSSProperties } from "react";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

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
  /** Accessible label for the list */
  "aria-label"?: string;
  /** Role for list items (default: listitem) */
  itemRole?: "listitem" | "option" | "row";
}

export function VirtualList<T>({
  items,
  estimatedItemHeight,
  renderItem,
  overscan = 5,
  height = "100%",
  className,
  emptyState,
  getItemKey,
  "aria-label": ariaLabel,
  itemRole = "listitem",
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

  // Determine container role based on item role
  const containerRole = itemRole === "option" ? "listbox" : "list";

  return (
    <div
      ref={parentRef}
      className={cn("overflow-auto", className)}
      style={{ height }}
      role={containerRole}
      aria-label={ariaLabel}
      aria-busy={false}
      tabIndex={0}
    >
      {/* Screen reader announcement for virtualized content */}
      <div className="sr-only" aria-live="polite">
        {items.length} items in list
      </div>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualItem: VirtualItem) => {
          const item = items[virtualItem.index];
          const style: CSSProperties = {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: `${virtualItem.size}px`,
            transform: `translateY(${virtualItem.start}px)`,
          };

          return (
            <div
              key={virtualItem.key}
              style={style}
              role={itemRole}
              aria-posinset={virtualItem.index + 1}
              aria-setsize={items.length}
            >
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
  /** Accessible label for the table */
  "aria-label"?: string;
  /** Caption for the table */
  caption?: string;
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
  "aria-label": ariaLabel,
  caption,
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
    <div
      className={cn(
        "overflow-hidden border border-border rounded-lg",
        className,
      )}
      role="table"
      aria-label={ariaLabel}
      aria-rowcount={items.length + 1} // +1 for header row
      aria-colcount={headers.length}
    >
      {/* Accessible caption */}
      {caption && (
        <div className="sr-only" role="caption">
          {caption}
        </div>
      )}

      {/* Fixed header */}
      <div className="bg-bg-muted border-b border-border" role="rowgroup">
        <div className="flex" role="row" aria-rowindex={1}>
          {headers.map((header, colIndex) => (
            <div
              key={header.key}
              role="columnheader"
              aria-colindex={colIndex + 1}
              className="px-4 py-3 text-left text-sm font-medium text-text-primary"
              style={{
                width: header.width || "auto",
                flex: header.width ? "none" : 1,
              }}
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
        role="rowgroup"
        tabIndex={0}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualRows.map((virtualRow: VirtualItem) => {
            const item = items[virtualRow.index];
            const rowIndex = virtualRow.index + 2; // +2 because header is row 1
            return (
              <div
                key={virtualRow.key}
                role="row"
                aria-rowindex={rowIndex}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(
                  "flex border-b border-border last:border-b-0",
                  onRowClick &&
                    "cursor-pointer hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset",
                  virtualRow.index % 2 === 0 ? "bg-bg-card" : "bg-bg-body",
                )}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onRowClick?.(item, virtualRow.index)}
                onKeyDown={(e) => {
                  if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onRowClick(item, virtualRow.index);
                  }
                }}
              >
                {headers.map((header, colIndex) => (
                  <div
                    key={header.key}
                    role="cell"
                    aria-colindex={colIndex + 1}
                    className="px-4 py-3 text-sm text-text-secondary truncate"
                    style={{
                      width: header.width || "auto",
                      flex: header.width ? "none" : 1,
                    }}
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
