import { Link } from "react-router-dom";
import { Briefcase } from "lucide-react";

import { Card } from "@/components/ui/Card";

import { useRequisitions } from "../api";


export function OpenHeadcountTab() {
  const q = useRequisitions("open");

  if (q.isLoading)
    return (
      <Card>
        <div className="text-sm text-text-muted">Loading…</div>
      </Card>
    );
  if (q.error)
    return (
      <Card>
        <div className="text-sm text-rose-600">{q.error.message}</div>
      </Card>
    );

  const rows = q.data ?? [];

  return (
    <Card className="p-0">
      <header className="px-5 py-3 border-b border-border">
        <div className="text-sm font-semibold text-text-primary">
          Open headcount
        </div>
        <div className="text-xs text-text-muted">
          {rows.length} open position{rows.length === 1 ? "" : "s"}
        </div>
      </header>
      {rows.length === 0 ? (
        <div className="p-10 text-center text-sm text-text-muted">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-indigo-500/10 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-indigo-500" />
          </div>
          No open positions.{" "}
          <Link
            to="/hr/requisitions/new"
            className="text-indigo-600 hover:underline"
          >
            Open one now
          </Link>
          .
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li
              key={r.id}
              className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-bg-muted transition"
            >
              <div className="min-w-0">
                <Link
                  to={`/hr/requisitions/${r.id}`}
                  className="font-medium text-text-primary hover:underline"
                >
                  {r.title}
                </Link>
                <div className="text-xs text-text-muted truncate">
                  {r.location_city ?? "—"}
                  {r.location_state && ", " + r.location_state}
                  {" · "}
                  {r.employment_type.replace("_", " ")}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {typeof r.applicant_count === "number" &&
                r.applicant_count > 0 ? (
                  <span className="text-xs bg-indigo-500/10 text-indigo-600 rounded-full px-2 py-0.5">
                    {r.applicant_count} applicant
                    {r.applicant_count === 1 ? "" : "s"}
                  </span>
                ) : (
                  <span className="text-xs text-text-muted">No applicants</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
