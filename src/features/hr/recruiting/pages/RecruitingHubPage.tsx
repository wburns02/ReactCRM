import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Search } from "lucide-react";


export function RecruitingHubPage() {
  const location = useLocation();
  const isOverview =
    location.pathname === "/hr/recruiting" ||
    location.pathname === "/hr/recruiting/" ||
    location.pathname === "/hr/recruiting/overview";

  const title = isOverview
    ? "Recruiting Overview"
    : location.pathname.endsWith("/requisitions")
      ? "Job requisitions"
      : location.pathname.endsWith("/candidates")
        ? "Candidates"
        : location.pathname.endsWith("/open-headcount")
          ? "Open headcount"
          : location.pathname.endsWith("/templates")
            ? "Templates & defaults"
            : "Recruiting";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 border border-border rounded-lg px-3 py-2 text-sm text-text-muted bg-bg-card">
            <Search className="w-4 h-4" />
            <span>Search candidates, jobs…</span>
          </div>
          <NavLink
            to="/hr/requisitions/new"
            className="px-4 py-2 text-sm bg-[#059669] text-white rounded-lg hover:bg-[#047857]"
          >
            New requisition
          </NavLink>
        </div>
      </div>

      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}
