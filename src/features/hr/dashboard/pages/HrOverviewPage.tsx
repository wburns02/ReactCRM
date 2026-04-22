import { Link } from "react-router-dom";
import {
  Users,
  UserPlus,
  ClipboardList,
  ShieldCheck,
  Timer,
  Banknote,
  Briefcase,
  Inbox,
  Zap,
  UserMinus,
  ArrowRight,
  Rss,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import { KpiCard } from "@/features/hr/shared/KpiCard";

import { useHrOverview } from "../api";


export function HrOverviewPage() {
  const q = useHrOverview();

  if (q.isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto text-sm text-text-muted">
        Loading HR overview…
      </div>
    );
  }
  if (q.error) {
    return (
      <div className="p-6 max-w-7xl mx-auto text-sm text-rose-600">
        Error loading HR overview: {q.error.message}
      </div>
    );
  }
  if (!q.data) return null;

  const s = q.data;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome Banner — matches DashboardPage pattern */}
      <div className="mb-6 rounded-xl bg-gradient-to-r from-[#0c1929] via-[#132a4a] to-[#1a3a6a] p-6 text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H0V20z' fill='%23fff' fill-rule='evenodd'/%3E%3C/svg%3E\")",
          }}
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">HR</h1>
            <p className="text-white/60 mt-1 text-sm">
              Everything about your people in one place
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-sm text-white/80">
                <Briefcase className="w-3.5 h-3.5 text-[#2aabe1]" />
                {s.open_requisitions} open req{s.open_requisitions === 1 ? "" : "s"}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-sm text-white/80">
                <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                {s.applicants_last_7d} applicant
                {s.applicants_last_7d === 1 ? "" : "s"} (7d)
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-sm text-white/80">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                {s.active_onboardings} onboarding
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/hr/requisitions/new"
              className="px-4 py-2 text-sm bg-white text-neutral-900 rounded-lg hover:bg-white/90 font-medium"
            >
              New requisition
            </Link>
            <Link
              to="/hr/inbox"
              className="px-4 py-2 text-sm bg-white/10 text-white rounded-lg hover:bg-white/20 border border-white/20"
            >
              Applicant inbox
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <KpiCard
          label="Open requisitions"
          value={s.open_requisitions}
          to="/hr/recruiting/open-headcount"
          icon={Briefcase}
          accent="blue"
        />
        <KpiCard
          label="Applicants (7d)"
          value={s.applicants_last_7d}
          hint="Across all requisitions"
          to="/hr/recruiting/candidates"
          icon={UserPlus}
          accent="violet"
        />
        <KpiCard
          label="Onboarding in progress"
          value={s.active_onboardings}
          to="/hr/onboarding"
          icon={Zap}
          accent="emerald"
        />
        <KpiCard
          label="Offboarding in progress"
          value={s.active_offboardings}
          to="/hr/offboarding"
          icon={UserMinus}
          accent="rose"
        />
        <KpiCard
          label="Certs expiring (30d)"
          value={s.expiring_certs_30d}
          hint="TCEQ / CDL / DOT medical"
          to="/compliance"
          icon={ShieldCheck}
          accent="amber"
        />
      </section>

      {/* Shortcuts */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <ShortcutCard
          to="/hr/org-chart"
          icon={Users}
          title="Org Chart"
          hint="Company hierarchy"
          accent="indigo"
        />
        <ShortcutCard
          to="/hr/recruiting"
          icon={UserPlus}
          title="Recruiting"
          hint="Pipeline + jobs"
          accent="violet"
        />
        <ShortcutCard
          to="/hr/recruiting/requisitions"
          icon={ClipboardList}
          title="Requisitions"
          hint="Open roles"
          accent="blue"
        />
        <ShortcutCard
          to="/hr/employees"
          icon={Briefcase}
          title="Employees"
          hint="All staff roster"
          accent="emerald"
        />
        <ShortcutCard
          to="/compliance"
          icon={ShieldCheck}
          title="Compliance"
          hint="Certs & docs"
          accent="amber"
        />
        <ShortcutCard
          to="/timesheets"
          icon={Timer}
          title="Timesheets"
          hint="Hours & payroll"
          accent="rose"
        />
        <ShortcutCard
          to="/hr/settings/indeed"
          icon={Rss}
          title="Indeed"
          hint="Feed + Apply webhook"
          accent="blue"
        />
      </section>

      {/* Panels */}
      <section className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary">
              Active applications by stage
            </h3>
            <Link
              to="/hr/recruiting"
              className="text-xs text-indigo-600 hover:underline"
            >
              Recruiting hub →
            </Link>
          </div>
          {Object.keys(s.active_applications_by_stage).length === 0 ? (
            <p className="text-sm text-text-muted">
              No active applications. Seed a requisition to start hiring.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {Object.entries(s.active_applications_by_stage).map(
                ([stage, n]) => (
                  <li key={stage}>
                    <Link
                      to={`/hr/recruiting/candidates?stage=${stage}`}
                      className="flex items-center justify-between py-2 text-sm hover:text-indigo-600"
                    >
                      <span className="capitalize text-text-primary">
                        {stage.replace("_", " ")}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <span className="font-medium text-text-primary">
                          {n}
                        </span>
                        <ArrowRight className="w-3 h-3 text-text-muted" />
                      </span>
                    </Link>
                  </li>
                ),
              )}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary">
              HR action items
            </h3>
            <Link
              to="/hr/inbox"
              className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1"
            >
              <Inbox className="w-3 h-3" /> Inbox
            </Link>
          </div>
          {s.pending_hr_tasks.length === 0 ? (
            <p className="text-sm text-text-muted">
              No outstanding HR tasks. Nice.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {s.pending_hr_tasks.map((t) => (
                <li
                  key={t.id}
                  className="flex justify-between gap-3 py-2 text-sm"
                >
                  <Link
                    to={`/hr/onboarding/${t.instance_id}`}
                    className="truncate text-text-primary hover:underline"
                  >
                    {t.name}
                  </Link>
                  <span className="text-xs text-text-muted shrink-0">
                    {t.due_at
                      ? new Date(t.due_at).toLocaleDateString()
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* Related tools */}
      <Card className="bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-950/20 dark:to-transparent">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-text-primary">Related tools</div>
            <p className="text-sm text-text-secondary mt-1">
              Pieces of the people lifecycle live elsewhere in the CRM.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <Link
                to="/payroll"
                className="px-3 py-1.5 border border-border rounded-lg hover:border-indigo-400 text-text-primary bg-bg-card"
              >
                Payroll →
              </Link>
              <Link
                to="/portal/time-clock"
                className="px-3 py-1.5 border border-border rounded-lg hover:border-indigo-400 text-text-primary bg-bg-card"
              >
                Time Clock →
              </Link>
              <Link
                to="/coaching"
                className="px-3 py-1.5 border border-border rounded-lg hover:border-indigo-400 text-text-primary bg-bg-card"
              >
                AI Coaching →
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}


const SHORTCUT_ACCENTS = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-500" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-500" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-500" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-500" },
  indigo: { bg: "bg-indigo-500/10", text: "text-indigo-500" },
} as const;


function ShortcutCard({
  to,
  icon: Icon,
  title,
  hint,
  accent,
}: {
  to: string;
  icon: typeof Users;
  title: string;
  hint: string;
  accent: keyof typeof SHORTCUT_ACCENTS;
}) {
  const a = SHORTCUT_ACCENTS[accent];
  return (
    <Link to={to} className="block">
      <Card className="stat-card cursor-pointer hover:border-indigo-400 p-4">
        <div className="flex flex-col gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.bg}`}
          >
            <Icon className={`w-5 h-5 ${a.text}`} />
          </div>
          <div>
            <div className="text-sm font-semibold text-text-primary">
              {title}
            </div>
            <div className="text-xs text-text-muted mt-0.5">{hint}</div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
