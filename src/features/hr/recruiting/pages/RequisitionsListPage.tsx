import { Link } from "react-router-dom";

import { Card } from "@/components/ui/Card";

import { useRequisitions } from "../api";


export function RequisitionsListPage() {
  const { data, isLoading, error } = useRequisitions();

  if (isLoading) {
    return (
      <Card>
        <div className="p-6 text-sm text-text-muted">Loading…</div>
      </Card>
    );
  }
  if (error) {
    return (
      <Card>
        <div className="p-6 text-sm text-rose-600">
          Error loading requisitions: {error.message}
        </div>
      </Card>
    );
  }

  const rows = data ?? [];
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary">
          Job requisitions
        </h2>
        <Link
          to="/hr/requisitions/new"
          className="px-3 py-1.5 text-sm bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
        >
          + New
        </Link>
      </div>

      {rows.length === 0 ? (
        <Card>
          <div className="text-sm text-text-muted">
            No requisitions yet. Click <em>New</em> to create one.
          </div>
        </Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li
                key={r.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-bg-muted transition"
              >
                <div className="min-w-0">
                  <Link
                    to={`/hr/requisitions/${r.id}`}
                    className="font-medium text-text-primary hover:underline"
                  >
                    {r.title}
                  </Link>
                  <div className="text-sm text-text-muted">
                    {r.slug} · {r.status}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {typeof r.applicant_count === "number" &&
                    r.applicant_count > 0 && (
                      <span className="text-xs bg-indigo-500/10 text-indigo-600 rounded-full px-2 py-0.5">
                        {r.applicant_count} applicant
                        {r.applicant_count === 1 ? "" : "s"}
                      </span>
                    )}
                  <span className="text-sm text-text-secondary">
                    {r.compensation_display ?? ""}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
