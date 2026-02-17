import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { MoreSheet } from "./MoreSheet";

/**
 * Mobile bottom tab navigation for technician views.
 * Shows on screens < 768px (md breakpoint). Hidden on desktop via parent.
 *
 * 5 tabs: Dashboard, Jobs, Schedule, Clock, More
 * "More" opens a slide-up sheet with secondary nav items.
 */
export function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  const tabs = [
    {
      path: "/my-dashboard",
      label: "Home",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
        </svg>
      ),
    },
    {
      path: "/portal/jobs",
      label: "Jobs",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
        </svg>
      ),
    },
    {
      path: "/portal/schedule",
      label: "Schedule",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
    },
    {
      path: "/portal/time-clock",
      label: "Clock",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  // Check if "More" sheet items are currently active
  const moreRoutes = ["/portal/pay", "/field", "/portal/messages", "/portal/settings"];
  const isMoreActive = moreRoutes.some(
    (r) => location.pathname === r || location.pathname.startsWith(r + "/"),
  );

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-bg-card border-t border-border select-none"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-stretch justify-around h-16">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 min-w-0 py-1 transition-colors touch-manipulation ${
                  isActive
                    ? "text-primary"
                    : "text-gray-500 active:text-gray-700"
                }`
              }
            >
              {tab.icon}
              <span className="text-xs mt-0.5 font-medium leading-tight">{tab.label}</span>
            </NavLink>
          ))}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center flex-1 min-w-0 py-1 transition-colors touch-manipulation ${
              isMoreActive ? "text-primary" : "text-gray-500 active:text-gray-700"
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <span className="text-xs mt-0.5 font-medium leading-tight">More</span>
          </button>
        </div>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
