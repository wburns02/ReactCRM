import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth.ts";
import { RCStatusIndicator } from "@/features/phone/index.ts";
import { NotificationCenter } from "@/features/notifications/index.ts";
import { ConnectionStatus } from "@/components/ui/ConnectionStatus";
import { EmailComposeProvider } from "@/context/EmailComposeContext";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { MobileHeader } from "@/components/navigation/MobileHeader";
import { AdminMobileHeader } from "@/components/navigation/AdminMobileHeader";
import { AdminMobileDrawer } from "@/components/navigation/AdminMobileDrawer";
import { AdminMobileBottomNav } from "@/components/navigation/AdminMobileBottomNav";
import { useTheme } from "@/hooks/useTheme";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { usePageTracker } from "@/hooks/usePageTracker";
import { useIncomingCall } from "@/hooks/useIncomingCall";
import { IncomingCallModal } from "@/features/calls/components/IncomingCallModal";
import { Sidebar } from "./Sidebar";
import { SmartSearchBar } from "@/components/ai/SmartSearchBar";
import { Sun, Moon } from "lucide-react";

export function AppLayout() {
  const { user, logout, isTechnician } = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();
  useRealtimeNotifications();
  usePageTracker();
  const { incomingCall, isOpen: callModalOpen, dismiss: dismissCall } = useIncomingCall();
  const [adminDrawerOpen, setAdminDrawerOpen] = useState(false);

  return (
    <EmailComposeProvider>
    <div className="flex h-screen bg-bg-body">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        Skip to main content
      </a>

      <Sidebar
        user={user}
        isTechnician={isTechnician}
        isDark={isDark}
        toggleTheme={toggleTheme}
        logout={logout}
      />

      {/* Admin mobile drawer */}
      {!isTechnician && (
        <AdminMobileDrawer
          open={adminDrawerOpen}
          onClose={() => setAdminDrawerOpen(false)}
        />
      )}

      {/* Main content */}
      <main
        id="main-content"
        className="flex-1 overflow-auto flex flex-col min-w-0"
        tabIndex={-1}
      >
        {/* Mobile header for technicians */}
        {isTechnician && (
          <div className="md:hidden">
            <MobileHeader />
          </div>
        )}

        {/* Mobile header for admins */}
        {!isTechnician && (
          <div className="md:hidden">
            <AdminMobileHeader onMenuOpen={() => setAdminDrawerOpen(true)} />
          </div>
        )}

        {/* Desktop top bar */}
        <div className="h-12 border-b border-border bg-bg-card px-6 hidden md:flex items-center justify-between gap-4">
          <SmartSearchBar />
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <ConnectionStatus showTooltip size="sm" />
            <NotificationCenter />
            <RCStatusIndicator />
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-auto pb-20 md:pb-0">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav — technicians */}
      {isTechnician && (
        <div className="md:hidden">
          <MobileBottomNav />
        </div>
      )}

      {/* Mobile bottom nav — admins */}
      {!isTechnician && (
        <div className="md:hidden">
          <AdminMobileBottomNav />
        </div>
      )}

      <IncomingCallModal call={incomingCall} open={callModalOpen} onDismiss={dismissCall} />
    </div>
    </EmailComposeProvider>
  );
}
