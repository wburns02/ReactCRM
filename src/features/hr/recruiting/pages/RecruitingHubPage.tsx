import { NavLink, Outlet } from "react-router-dom";
import { Search } from "lucide-react";


const TABS = [
  { to: "overview", label: "Overview" },
  { to: "requisitions", label: "Job requisitions" },
  { to: "candidates", label: "Candidates" },
  { to: "open-headcount", label: "Open headcount" },
  { to: "templates", label: "Templates & defaults" },
];


export function RecruitingHubPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          Recruiting
          <span className="text-xs font-normal border rounded-full px-2 py-0.5 text-neutral-500">
            HR
          </span>
        </h1>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 border rounded-lg px-3 py-2 text-sm text-neutral-500">
            <Search className="w-4 h-4" />
            <span>Search candidates, jobs…</span>
          </div>
          <NavLink
            to="/hr/requisitions/new"
            className="px-4 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
          >
            New requisition
          </NavLink>
        </div>
      </div>

      <nav className="mt-6 border-b flex flex-wrap gap-2">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === "overview"}
            className={({ isActive }) =>
              [
                "px-4 py-2 text-sm border-b-2 -mb-px transition",
                isActive
                  ? "border-indigo-600 text-indigo-600 font-medium"
                  : "border-transparent text-neutral-500 hover:text-neutral-900",
              ].join(" ")
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <section className="mt-6 rounded-xl border border-neutral-200 bg-gradient-to-r from-indigo-50 to-white p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">Getting started</div>
          <p className="text-sm text-neutral-600 mt-1">
            Open a requisition, post it to the careers page, review applicants,
            and move candidates through the pipeline.  SMS goes out
            automatically on every stage change.
          </p>
        </div>
      </section>

      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}
