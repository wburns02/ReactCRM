import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, UserPlus, Zap, ShieldCheck, Target } from "lucide-react";

import { apiClient } from "@/api/client";
import { validateResponse } from "@/api/validateResponse";
import { Card } from "@/components/ui/Card";
import { KpiCard } from "@/features/hr/shared/KpiCard";
import { applicationWithApplicantSchema } from "../api-applications";
import { useHrOverview } from "@/features/hr/dashboard/api";
import { useRequisitions } from "../api";


type AppWithApplicant = z.infer<typeof applicationWithApplicantSchema>;


type PillKey =
  | "applied"
  | "screen"
  | "ride_along"
  | "offer"
  | "hired";


const PILL_LABELS: Record<PillKey, string> = {
  applied: "New applications",
  screen: "Screening",
  ride_along: "Ride-along",
  offer: "In offer stage",
  hired: "Hired (all time)",
};


function useAllApplicationsByStage() {
  // Fetch applications grouped by the pill stages.  We iterate requisitions
  // and fan out /hr/applications?requisition_id=... per req; this keeps the
  // server contract unchanged.
  const reqs = useRequisitions();
  return useQuery({
    enabled: !!reqs.data,
    queryKey: ["hr", "recruiting", "hub-overview-applications", reqs.data?.length ?? 0],
    queryFn: async () => {
      const rows: AppWithApplicant[] = [];
      for (const r of reqs.data ?? []) {
        try {
          const { data } = await apiClient.get("/hr/applications", {
            params: { requisition_id: r.id },
          });
          rows.push(
            ...validateResponse(
              z.array(applicationWithApplicantSchema),
              data,
              "hub overview applications",
            ),
          );
        } catch {
          // Ignore per-req failures so one bad requisition doesn't hide the rest.
        }
      }
      return rows;
    },
    staleTime: 30_000,
  });
}


export function RecruitingOverviewTab() {
  const [active, setActive] = useState<PillKey>("applied");
  const overview = useHrOverview();
  const apps = useAllApplicationsByStage();

  const byStage = useMemo(() => {
    const m: Record<PillKey, AppWithApplicant[]> = {
      applied: [],
      screen: [],
      ride_along: [],
      offer: [],
      hired: [],
    };
    for (const a of apps.data ?? []) {
      if (a.stage in m) m[a.stage as PillKey].push(a);
    }
    return m;
  }, [apps.data]);

  const counts: Record<PillKey, number> = {
    applied: byStage.applied.length,
    screen: byStage.screen.length,
    ride_along: byStage.ride_along.length,
    offer: byStage.offer.length,
    hired: byStage.hired.length,
  };

  const activeRows = byStage[active];

  return (
    <div>
      <section className="flex flex-wrap gap-2">
        {(Object.keys(PILL_LABELS) as PillKey[]).map((k) => {
          const isActive = k === active;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setActive(k)}
              className={[
                "px-4 py-2 rounded-lg border text-sm transition",
                isActive
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400",
              ].join(" ")}
              aria-pressed={isActive}
            >
              <span>{PILL_LABELS[k]}</span>
              <span
                className={[
                  "ml-2 inline-block px-1.5 py-0.5 rounded-full text-xs",
                  isActive ? "bg-white/20 text-white" : "bg-neutral-100",
                ].join(" ")}
              >
                {counts[k]}
              </span>
            </button>
          );
        })}
      </section>

      <section className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Open requisitions"
          value={overview.data?.open_requisitions ?? 0}
          to="/hr/recruiting/requisitions"
          icon={Briefcase}
          accent="blue"
        />
        <KpiCard
          label="Applicants (7d)"
          value={overview.data?.applicants_last_7d ?? 0}
          to="/hr/recruiting/candidates"
          icon={UserPlus}
          accent="violet"
        />
        <KpiCard
          label="Active onboardings"
          value={overview.data?.active_onboardings ?? 0}
          to="/hr/onboarding"
          hint="Lifecycle workflows"
          icon={Zap}
          accent="emerald"
        />
        <KpiCard
          label="Certs expiring 30d"
          value={overview.data?.expiring_certs_30d ?? 0}
          to="/compliance"
          icon={ShieldCheck}
          accent="amber"
        />
      </section>

      <Card className="mt-6 p-0">
        <header className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-text-primary">
              {PILL_LABELS[active]}
            </div>
            <div className="text-xs text-text-muted">
              {activeRows.length} application{activeRows.length === 1 ? "" : "s"}
            </div>
          </div>
        </header>
        {apps.isLoading ? (
          <div className="p-6 text-sm text-text-muted">Loading…</div>
        ) : apps.error ? (
          <div className="p-6 text-sm text-rose-600">{apps.error.message}</div>
        ) : activeRows.length === 0 ? (
          <div className="p-10 text-center text-sm text-text-muted">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-indigo-500/10 flex items-center justify-center">
              <Target className="w-6 h-6 text-indigo-500" />
            </div>
            Nothing in this stage yet. When candidates move here, they'll
            show up.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {activeRows.map((a) => (
              <li
                key={a.id}
                className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-bg-muted transition"
              >
                <div className="min-w-0">
                  <Link
                    to={`/hr/applicants/${a.applicant.id}`}
                    className="font-medium text-text-primary hover:underline"
                  >
                    {a.applicant.first_name} {a.applicant.last_name}
                  </Link>
                  <div className="text-xs text-text-muted truncate">
                    {a.applicant.email}
                    {a.applicant.phone && " · " + a.applicant.phone}
                  </div>
                </div>
                <Link
                  to={`/hr/requisitions/${a.requisition_id}`}
                  className="text-xs text-text-secondary hover:text-text-primary shrink-0"
                >
                  View pipeline →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
