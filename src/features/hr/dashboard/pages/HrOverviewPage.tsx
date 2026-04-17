import { Link } from "react-router-dom";

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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">HR</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/hr/requisitions/new"
            className="px-4 py-2 text-sm bg-neutral-900 text-white rounded-lg"
          >
            New requisition
          </Link>
          <Link
            to="/hr/inbox"
            className="px-4 py-2 text-sm border rounded-lg"
          >
            Applicant inbox
          </Link>
        </div>
      </div>

      <section className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Open requisitions" value={s.open_requisitions} />
        <KpiCard
          label="Applicants (7d)"
          value={s.applicants_last_7d}
          hint="Across all requisitions"
        />
        <KpiCard label="Onboarding in progress" value={s.active_onboardings} />
        <KpiCard label="Offboarding in progress" value={s.active_offboardings} />
        <KpiCard
          label="Certs expiring (30d)"
          value={s.expiring_certs_30d}
          hint="TCEQ / CDL / DOT medical"
        />
      </section>

      <section className="mt-8 grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border p-4 bg-white">
          <h3 className="text-sm font-semibold mb-3">Active applications by stage</h3>
          {Object.keys(s.active_applications_by_stage).length === 0 ? (
            <p className="text-sm text-neutral-500">
              No active applications. Seed a requisition to start hiring.
            </p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(s.active_applications_by_stage).map(([stage, n]) => (
                <li key={stage} className="flex justify-between text-sm">
                  <span className="capitalize">{stage.replace("_", " ")}</span>
                  <span className="font-medium">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border p-4 bg-white">
          <h3 className="text-sm font-semibold mb-3">HR action items</h3>
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
    </div>
  );
}
