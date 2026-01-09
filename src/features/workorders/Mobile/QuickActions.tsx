/**
 * QuickActions - Swipe actions for work order list items
 *
 * Features:
 * - Swipe right: Mark en route
 * - Swipe left: View details
 * - Hold: Quick status menu
 * - Visual feedback animations
 * - Works at 375px width minimum
 * - Large touch targets (44px min)
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { WorkOrder, WorkOrderStatus } from '@/api/types/workOrder';
import {
  WORK_ORDER_STATUS_LABELS,
  STATUS_COLORS,
} from '@/api/types/workOrder';

// ============================================
// Types
// ============================================

interface QuickActionsProps {
  workOrder: WorkOrder;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  onLongPress?: () => void;
  onStatusChange?: (status: WorkOrderStatus) => void;
  children: React.ReactNode;
  swipeRightLabel?: string;
  swipeLeftLabel?: string;
  disabled?: boolean;
}

interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  isDragging: boolean;
  direction: 'left' | 'right' | null;
}

// ============================================
// Constants
// ============================================

const SWIPE_THRESHOLD = 80; // Minimum distance to trigger action
const SWIPE_MAX = 120; // Maximum swipe distance
const LONG_PRESS_DURATION = 500; // ms for long press

// ============================================
// Icons
// ============================================

const Icons = {
  enroute: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  details: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  menu: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
  ),
};

// ============================================
// Quick Status Menu Component
// ============================================

interface QuickStatusMenuProps {
  currentStatus: WorkOrderStatus;
  onSelect: (status: WorkOrderStatus) => void;
  onClose: () => void;
}

function QuickStatusMenu({ currentStatus, onSelect, onClose }: QuickStatusMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: Event) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  const statusOptions: WorkOrderStatus[] = [
    'scheduled',
    'confirmed',
    'enroute',
    'on_site',
    'in_progress',
    'completed',
    'requires_followup',
  ];

  return (
    <div
      ref={menuRef}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-bg-card rounded-xl shadow-xl border border-border p-2 min-w-[200px]"
      role="menu"
      aria-label="Quick status change"
    >
      <div className="text-sm font-medium text-text-secondary px-3 py-2 border-b border-border mb-1">
        Change Status
      </div>
      {statusOptions.map((status) => (
        <button
          key={status}
          onClick={() => {
            onSelect(status);
            onClose();
          }}
          disabled={status === currentStatus}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left min-h-[48px] touch-manipulation transition-colors',
            status === currentStatus
              ? 'bg-bg-muted text-text-secondary cursor-not-allowed'
              : 'hover:bg-bg-hover active:bg-bg-muted'
          )}
          role="menuitem"
        >
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: STATUS_COLORS[status] }}
          />
          <span className="font-medium">{WORK_ORDER_STATUS_LABELS[status]}</span>
          {status === currentStatus && (
            <span className="ml-auto text-xs text-text-secondary">Current</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function QuickActions({
  workOrder,
  onSwipeRight,
  onSwipeLeft,
  onLongPress,
  onStatusChange,
  children,
  swipeRightLabel = 'En Route',
  swipeLeftLabel = 'Details',
  disabled = false,
}: QuickActionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [swipeState, setSwipeState] = useState<SwipeState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    isDragging: false,
    direction: null,
  });
  const [showMenu, setShowMenu] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Calculate swipe offset (clamped)
  const swipeOffset = Math.max(
    -SWIPE_MAX,
    Math.min(SWIPE_MAX, swipeState.currentX - swipeState.startX)
  );

  // Determine if swipe will trigger action
  const willTriggerRight = swipeOffset >= SWIPE_THRESHOLD;
  const willTriggerLeft = swipeOffset <= -SWIPE_THRESHOLD;

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;

      const touch = e.touches[0];
      setSwipeState({
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        isDragging: true,
        direction: null,
      });

      // Start long press timer
      longPressTimer.current = setTimeout(() => {
        setShowMenu(true);
        setSwipeState((prev) => ({ ...prev, isDragging: false }));
        onLongPress?.();
      }, LONG_PRESS_DURATION);
    },
    [disabled, onLongPress]
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || !swipeState.isDragging) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - swipeState.startX;
      const deltaY = touch.clientY - swipeState.startY;

      // Cancel long press if moving
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }

      // Determine if horizontal swipe (prevent vertical scroll interference)
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        e.preventDefault();
        setSwipeState((prev) => ({
          ...prev,
          currentX: touch.clientX,
          direction: deltaX > 0 ? 'right' : 'left',
        }));
      }
    },
    [disabled, swipeState.isDragging, swipeState.startX, swipeState.startY]
  );

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    if (disabled) return;

    // Cancel long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Check if swipe triggered action
    if (willTriggerRight && onSwipeRight) {
      setIsAnimating(true);
      onSwipeRight();
      // Animate back after delay
      setTimeout(() => {
        setIsAnimating(false);
        setSwipeState({
          startX: 0,
          startY: 0,
          currentX: 0,
          isDragging: false,
          direction: null,
        });
      }, 300);
    } else if (willTriggerLeft && onSwipeLeft) {
      setIsAnimating(true);
      onSwipeLeft();
      setTimeout(() => {
        setIsAnimating(false);
        setSwipeState({
          startX: 0,
          startY: 0,
          currentX: 0,
          isDragging: false,
          direction: null,
        });
      }, 300);
    } else {
      // Reset without action
      setSwipeState({
        startX: 0,
        startY: 0,
        currentX: 0,
        isDragging: false,
        direction: null,
      });
    }
  }, [disabled, willTriggerRight, willTriggerLeft, onSwipeRight, onSwipeLeft]);

  // Handle status change from menu
  const handleStatusChange = useCallback(
    (status: WorkOrderStatus) => {
      onStatusChange?.(status);
      setShowMenu(false);
    },
    [onStatusChange]
  );

  // Calculate background color intensity based on swipe distance
  const rightBgOpacity = Math.min(1, Math.abs(swipeOffset) / SWIPE_THRESHOLD);
  const leftBgOpacity = Math.min(1, Math.abs(swipeOffset) / SWIPE_THRESHOLD);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Right swipe background (En Route) */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 flex items-center justify-start pl-4 transition-opacity',
          swipeState.direction === 'right' ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          width: SWIPE_MAX,
          backgroundColor: willTriggerRight
            ? '#22c55e'
            : `rgba(34, 197, 94, ${rightBgOpacity * 0.8})`,
        }}
      >
        <div className="text-white flex items-center gap-2">
          {Icons.enroute}
          <span className="font-medium text-sm">{swipeRightLabel}</span>
        </div>
      </div>

      {/* Left swipe background (Details) */}
      <div
        className={cn(
          'absolute inset-y-0 right-0 flex items-center justify-end pr-4 transition-opacity',
          swipeState.direction === 'left' ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          width: SWIPE_MAX,
          backgroundColor: willTriggerLeft
            ? '#3b82f6'
            : `rgba(59, 130, 246, ${leftBgOpacity * 0.8})`,
        }}
      >
        <div className="text-white flex items-center gap-2">
          <span className="font-medium text-sm">{swipeLeftLabel}</span>
          {Icons.details}
        </div>
      </div>

      {/* Main content */}
      <div
        className={cn(
          'relative bg-bg-card',
          isAnimating && 'transition-transform duration-300'
        )}
        style={{
          transform: swipeState.isDragging
            ? `translateX(${swipeOffset}px)`
            : isAnimating
            ? `translateX(${willTriggerRight ? SWIPE_MAX : willTriggerLeft ? -SWIPE_MAX : 0}px)`
            : 'translateX(0)',
        }}
      >
        {children}
      </div>

      {/* Quick Status Menu Overlay */}
      {showMenu && (
        <div className="fixed inset-0 bg-black/50 z-40" aria-hidden="true">
          <QuickStatusMenu
            currentStatus={workOrder.status}
            onSelect={handleStatusChange}
            onClose={() => setShowMenu(false)}
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// Swipeable Work Order Card Component
// ============================================

interface SwipeableWorkOrderCardProps {
  workOrder: WorkOrder;
  onMarkEnRoute?: () => void;
  onViewDetails?: () => void;
  onStatusChange?: (status: WorkOrderStatus) => void;
  children: React.ReactNode;
}

export function SwipeableWorkOrderCard({
  workOrder,
  onMarkEnRoute,
  onViewDetails,
  onStatusChange,
  children,
}: SwipeableWorkOrderCardProps) {
  return (
    <QuickActions
      workOrder={workOrder}
      onSwipeRight={onMarkEnRoute}
      onSwipeLeft={onViewDetails}
      onStatusChange={onStatusChange}
      swipeRightLabel="En Route"
      swipeLeftLabel="Details"
    >
      {children}
    </QuickActions>
  );
}

export default QuickActions;
