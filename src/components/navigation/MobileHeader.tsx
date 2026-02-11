import { Link } from "react-router-dom";
import { NotificationCenter } from "@/features/notifications/index.ts";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";

/**
 * Slim mobile header bar.
 * Shows on screens < 768px (md breakpoint). Hidden on desktop via parent.
 *
 * Contains: Logo + notification bell + connection status
 * Height: 48px (compact for mobile)
 */
export function MobileHeader() {
  return (
    <header className="h-12 flex items-center justify-between px-4 bg-white border-b border-gray-200 flex-shrink-0">
      {/* Logo */}
      <Link
        to="/my-dashboard"
        className="flex items-center gap-2 text-mac-dark-blue font-semibold"
      >
        <span className="text-xl">🚽</span>
        <span className="text-sm font-bold">MAC Septic</span>
      </Link>

      {/* Right side actions */}
      <div className="flex items-center gap-3">
        <ConnectionStatus showTooltip size="sm" />
        <NotificationCenter />
      </div>
    </header>
  );
}
