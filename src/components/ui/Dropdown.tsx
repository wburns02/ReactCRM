import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

/**
 * Dropdown Context
 */
interface DropdownContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  menuRef: React.RefObject<HTMLDivElement | null>;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}

const DropdownContext = createContext<DropdownContextValue | undefined>(undefined);

function useDropdown() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error('Dropdown components must be used within a Dropdown');
  }
  return context;
}

/**
 * Dropdown Root
 */
interface DropdownProps {
  children: ReactNode;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
}

export function Dropdown({ children, open: controlledOpen, onOpenChange }: DropdownProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const setIsOpen = useCallback(
    (open: boolean) => {
      if (onOpenChange) {
        onOpenChange(open);
      } else {
        setInternalOpen(open);
      }
      if (!open) {
        setActiveIndex(-1);
      }
    },
    [onOpenChange]
  );

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setIsOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, setIsOpen]);

  return (
    <DropdownContext.Provider
      value={{ isOpen, setIsOpen, triggerRef, menuRef, activeIndex, setActiveIndex }}
    >
      <div className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  );
}

/**
 * Dropdown Trigger
 */
interface DropdownTriggerProps {
  children: ReactNode;
  className?: string;
}

export function DropdownTrigger({ children, className }: DropdownTriggerProps) {
  const { isOpen, setIsOpen, triggerRef, menuRef, setActiveIndex } = useDropdown();

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        e.preventDefault();
        setIsOpen(true);
        setActiveIndex(0);
        // Focus first item
        requestAnimationFrame(() => {
          const items = menuRef.current?.querySelectorAll('[role="menuitem"]');
          (items?.[0] as HTMLElement)?.focus();
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setIsOpen(true);
        // Focus last item
        requestAnimationFrame(() => {
          const items = menuRef.current?.querySelectorAll('[role="menuitem"]');
          if (items && items.length > 0) {
            setActiveIndex(items.length - 1);
            (items[items.length - 1] as HTMLElement)?.focus();
          }
        });
        break;
    }
  };

  return (
    <button
      ref={triggerRef}
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2',
        className
      )}
      onClick={() => setIsOpen(!isOpen)}
      onKeyDown={handleKeyDown}
      aria-haspopup="menu"
      aria-expanded={isOpen}
    >
      {children}
      <svg
        className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

/**
 * Dropdown Menu (Content)
 */
interface DropdownMenuProps {
  children: ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

export function DropdownMenu({ children, className, align = 'start' }: DropdownMenuProps) {
  const { isOpen, setIsOpen, triggerRef, menuRef, activeIndex, setActiveIndex } = useDropdown();
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Calculate position
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const trigger = triggerRef.current.getBoundingClientRect();
    let left = trigger.left;

    if (align === 'center') {
      left = trigger.left + trigger.width / 2;
    } else if (align === 'end') {
      left = trigger.right;
    }

    setPosition({
      top: trigger.bottom + 4,
      left,
    });
  }, [isOpen, align, triggerRef]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = menuRef.current?.querySelectorAll('[role="menuitem"]');
    if (!items || items.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
        setActiveIndex(nextIndex);
        (items[nextIndex] as HTMLElement)?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
        setActiveIndex(prevIndex);
        (items[prevIndex] as HTMLElement)?.focus();
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        (items[0] as HTMLElement)?.focus();
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(items.length - 1);
        (items[items.length - 1] as HTMLElement)?.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-orientation="vertical"
      className={cn(
        'fixed z-50 min-w-[180px] overflow-hidden rounded-md border border-border bg-bg-card shadow-lg',
        'animate-in fade-in-0 zoom-in-95 duration-100',
        className
      )}
      style={{
        top: position.top,
        left: position.left,
        transform: align === 'center' ? 'translateX(-50%)' : align === 'end' ? 'translateX(-100%)' : undefined,
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="py-1">{children}</div>
    </div>,
    document.body
  );
}

/**
 * Dropdown Menu Item
 */
interface DropdownItemProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

export function DropdownItem({
  children,
  className,
  onClick,
  disabled,
  destructive,
}: DropdownItemProps) {
  const { setIsOpen, triggerRef } = useDropdown();

  const handleClick = () => {
    if (disabled) return;
    onClick?.();
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
      className={cn(
        'relative flex cursor-pointer select-none items-center px-3 py-2 text-sm outline-none transition-colors',
        'focus:bg-bg-hover focus:text-text-primary',
        'hover:bg-bg-hover',
        disabled && 'pointer-events-none opacity-50',
        destructive && 'text-danger focus:text-danger',
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-disabled={disabled}
    >
      {children}
    </div>
  );
}

/**
 * Dropdown Separator
 */
export function DropdownSeparator({ className }: { className?: string }) {
  return <div className={cn('-mx-1 my-1 h-px bg-border', className)} role="separator" />;
}

/**
 * Dropdown Label (non-interactive)
 */
export function DropdownLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('px-3 py-1.5 text-xs font-semibold text-text-muted', className)}>
      {children}
    </div>
  );
}
