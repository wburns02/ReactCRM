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
} from "lucide-react";

import { KpiCard } from "@/features/hr/shared/KpiCard";

import { useHrOverview } from "../api";


export function HrOverviewPage() {
  const q = useHrOverview();

  if (q.isLoading) return <div className="p-6">Loading…</div>;
  if (q.error)
    return (
      <div className="p-6 text-red-600">Error loading HR overview: {q.error.message}</div>
    );
  if (!q.data) return null;

  const s = q.data;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">HR</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Everything about your people in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/hr/requisitions/new"
            className="px-4 py-2 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
          >
            New requisition
          </Link>
          <Link
            to="/hr/inbox"
            className="px-4 py-2 text-sm border rounded-lg hover:border-neutral-400"
          >
            Applicant inbox
          </Link>
        </div>
      </div>

      <section className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Open requisitions"
          value={s.open_requisitions}
          to="/hr/recruiting/open-headcount"
        />
        <KpiCard
          label="Applicants (7d)"
          value={s.applicants_last_7d}
          hint="Across all requisitions"
          to="/hr/recruiting/candidates"
        />
        <KpiCard
          label="Onboarding in progress"
          value={s.active_onboardings}
          to="/hr/inbox"
        />
        <KpiCard
          label="Offboarding in progress"
          value={s.active_offboardings}
          to="/hr/inbox"
        />
        <KpiCard
          label="Certs expiring (30d)"
          value={s.expiring_certs_30d}
          hint="TCEQ / CDL / DOT medical"
          to="/compliance"
        />
      </section>

      <section className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <ShortcutCard
          to="/hr/org-chart"
          icon={Users}
          title="Org Chart"
          hint="Company hierarchy"
        />
        <ShortcutCard
          to="/hr/recruiting"
          icon={UserPlus}
          title="Recruiting"
          hint="Pipeline + jobs"
        />
        <ShortcutCard
          to="/hr/recruiting/requisitions"
          icon={ClipboardList}
          title="Requisitions"
          hint="Open roles"
        />
        <ShortcutCard
          to="/technicians"
          icon={Briefcase}
          title="Employees"
          hint="Team roster"
        />
        <ShortcutCard
          to="/compliance"
          icon={ShieldCheck}
          title="Compliance"
          hint="Certs & docs"
        />
        <ShortcutCard
          to="/timesheets"
          icon={Timer}
          title="Timesheets"
          hint="Hours & payroll"
        />
      </section>

      <section className="mt-8 grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Active applications by stage</h3>
            <Link
              to="/hr/recruiting"
              className="text-xs text-indigo-600 hover:underline"
            >
              Recruiting hub →
            </Link>
          </div>
          {Object.keys(s.active_applications_by_stage).length === 0 ? (
            <p className="text-sm text-neutral-500">
              No active applications. Seed a requisition to start hiring.
            </p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(s.active_applications_by_stage).map(([stage, n]) => (
                <li key={stage}>
                  <Link
                    to={`/hr/recruiting/candidates?stage=${stage}`}
                    className="flex justify-between text-sm hover:text-indigo-600"
                  >
                    <span className="capitalize">{stage.replace("_", " ")}</span>
                    <span className="font-medium">{n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">HR action items</h3>
            <Link
              to="/hr/inbox"
              className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1"
            >
              <Inbox className="w-3 h-3" /> Inbox
            </Link>
          </div>
          {s.pending_hr_tasks.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No outstanding HR tasks. Nice.
            </p>
          ) : (
            <ul className="space-y-2">
              {s.pending_hr_tasks.map((t) => (
                <li
                  key={t.id}
                  className="text-sm flex justify-between gap-3"
                >
                  <Link
                    to={`/hr/onboarding/${t.instance_id}`}
                    className="truncate hover:underline"
                  >
                    {t.name}
                  </Link>
                  <span className="text-xs text-neutral-500 shrink-0">
                    {t.due_at
                      ? new Date(t.due_at).toLocaleDateString()
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-xl border bg-gradient-to-r from-indigo-50 to-white p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="font-semibold">Related tools</div>
            <p className="text-sm text-neutral-600 mt-1">
              Pieces of the people lifecycle live elsewhere in the CRM.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <Link
                to="/payroll"
                className="px-3 py-1.5 border rounded-lg hover:border-indigo-400"
              >
                Payroll →
              </Link>
              <Link
                to="/portal/time-clock"
                className="px-3 py-1.5 border rounded-lg hover:border-indigo-400"
              >
                Time Clock →
              </Link>
              <Link
                to="/coaching"
                className="px-3 py-1.5 border rounded-lg hover:border-indigo-400"
              >
                AI Coaching →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


function ShortcutCard({
  to,
  icon: Icon,
  title,
  hint,
}: {
  to: string;
  icon: typeof Users;
  title: string;
  hint: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-xl border p-4 bg-white hover:border-indigo-400 hover:-translate-y-0.5 transition flex flex-col gap-2"
    >
      <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-neutral-500 mt-0.5">{hint}</div>
      </div>
    </Link>
  );
}
