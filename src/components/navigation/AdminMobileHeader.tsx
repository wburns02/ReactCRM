import { NotificationCenter } from "@/features/notifications/index.ts";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";

interface AdminMobileHeaderProps {
  onMenuOpen: () => void;
}

/**
 * Slim mobile header bar for admin views.
 * Shows on screens < 768px (md breakpoint). Hidden on desktop via parent.
 *
 * Contains: Hamburger menu + Logo + notification bell + connection status
 * Height: 56px (comfortable touch target for hamburger)
 */
export function AdminMobileHeader({ onMenuOpen }: AdminMobileHeaderProps) {
  return (
    <header className="h-14 flex items-center justify-between px-3 bg-bg-card border-b border-border flex-shrink-0">
      {/* Left: Hamburger + Logo */}
      <div className="flex items-center gap-2">
        <button
          onClick={onMenuOpen}
          className="p-2 -ml-1 rounded-lg text-text-primary hover:bg-bg-hover transition-colors touch-manipulation"
          aria-label="Open navigation menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
        <span className="text-lg">🚽</span>
        <span className="text-sm font-bold text-mac-dark-blue">MAC Septic</span>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        <ConnectionStatus showTooltip size="sm" />
        <NotificationCenter />
      </div>
    </header>
  );
}
