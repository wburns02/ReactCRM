import { useState } from "react";
import { NotificationCenter } from "@/features/notifications/index.ts";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { SmartSearchBar } from "@/components/ai/SmartSearchBar";

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
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
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
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-lg text-text-secondary hover:bg-bg-hover transition-colors touch-manipulation"
            aria-label="Search"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>
          <ConnectionStatus showTooltip size="sm" />
          <NotificationCenter />
        </div>
      </header>
      {searchOpen && <SmartSearchBar forceOpen onClose={() => setSearchOpen(false)} />}
    </>
  );
}
