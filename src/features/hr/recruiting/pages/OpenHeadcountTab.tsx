import { Link } from "react-router-dom";

import { useRequisitions } from "../api";


/**
 * "Open headcount" is the approved-but-not-yet-filled positions — in
 * our data model that's the set of open requisitions that have 0 active
 * applications in the hired stage yet.  Until we wire a dedicated
 * headcount plan service, we surface open requisitions here as a proxy.
 */
export function OpenHeadcountTab() {
  const q = useRequisitions("open");

  if (q.isLoading) return <div className="p-6 text-sm">Loading…</div>;
  if (q.error) return <div className="p-6 text-sm text-red-600">{q.error.message}</div>;

  const rows = q.data ?? [];

  return (
    <div className="rounded-xl border bg-white">
      <header className="px-5 py-3 border-b">
        <div className="text-sm font-semibold">Open headcount</div>
        <div className="text-xs text-neutral-500">
          {rows.length} open position{rows.length === 1 ? "" : "s"}
        </div>
      </header>
      {rows.length === 0 ? (
        <div className="p-10 text-center text-sm text-neutral-500">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-neutral-100 flex items-center justify-center">
            <span className="text-2xl">🪑</span>
          </div>
          No open positions.{" "}
          <Link to="/hr/requisitions/new" className="text-indigo-600 underline">
            Open one now
          </Link>
          .
        </div>
      ) : (
        <ul className="divide-y">
          {rows.map((r) => (
            <li
              key={r.id}
              className="px-5 py-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <Link
                  to={`/hr/requisitions/${r.id}`}
                  className="font-medium hover:underline"
                >
                  {r.title}
                </Link>
                <div className="text-xs text-neutral-500 truncate">
                  {r.location_city ?? "—"}
                  {r.location_state && ", " + r.location_state}
                  {" · "}
                  {r.employment_type.replace("_", " ")}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {typeof r.applicant_count === "number" && r.applicant_count > 0 ? (
                  <span className="text-xs bg-indigo-100 text-indigo-800 rounded-full px-2 py-0.5">
                    {r.applicant_count} applicant
                    {r.applicant_count === 1 ? "" : "s"}
                  </span>
                ) : (
                  <span className="text-xs text-neutral-500">No applicants</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
