import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth.ts";

interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
}

const moreItems = [
  { path: "/portal/pay", label: "Pay & Performance", icon: "💰" },
  { path: "/field", label: "Field View", icon: "🗺️" },
  { path: "/portal/messages", label: "Messages", icon: "💬" },
  { path: "/portal/settings", label: "Settings", icon: "⚙️" },
];

/**
 * Slide-up bottom sheet for secondary technician nav items.
 * Triggered by the "More" button on MobileBottomNav.
 */
export function MoreSheet({ open, onClose }: MoreSheetProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on route change
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`fixed left-0 right-0 bottom-0 z-[70] bg-white rounded-t-2xl transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Nav items */}
        <nav className="px-4 pb-2">
          {moreItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-4 py-4 rounded-xl text-base font-medium transition-colors touch-manipulation ${
                isActive(item.path)
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 active:bg-gray-100"
              }`}
            >
              <span className="text-xl w-8 text-center">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Divider + User info + Sign out */}
        <div className="border-t border-gray-200 mx-4 pt-3 pb-4">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="h-10 w-10 rounded-full bg-mac-dark-blue text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              {user?.first_name?.charAt(0) || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full mt-2 px-4 py-3 text-sm text-red-600 font-medium text-left rounded-xl active:bg-red-50 transition-colors touch-manipulation"
          >
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
