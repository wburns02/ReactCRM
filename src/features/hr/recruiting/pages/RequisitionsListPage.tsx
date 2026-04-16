import { Link } from "react-router-dom";

import { useRequisitions } from "../api";


export function RequisitionsListPage() {
  const { data, isLoading, error } = useRequisitions();

  if (isLoading) {
    return <div className="p-6">Loading…</div>;
  }
  if (error) {
    return (
      <div className="p-6 text-red-600">
        Error loading requisitions: {error.message}
      </div>
    );
  }

  const rows = data ?? [];
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Requisitions</h1>
        <Link
          to="/hr/requisitions/new"
          className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
        >
          New
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-neutral-500">
          No requisitions yet. Click <em>New</em> to create one.
        </p>
      ) : (
        <ul className="mt-6 divide-y border rounded-lg">
          {rows.map((r) => (
            <li key={r.id} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <Link
                  to={`/hr/requisitions/${r.id}`}
                  className="font-medium hover:underline"
                >
                  {r.title}
                </Link>
                <div className="text-sm text-neutral-500">
                  {r.slug} — {r.status}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {typeof r.applicant_count === "number" && r.applicant_count > 0 && (
                  <span className="text-xs bg-indigo-100 text-indigo-800 rounded-full px-2 py-0.5">
                    {r.applicant_count} applicant
                    {r.applicant_count === 1 ? "" : "s"}
                  </span>
                )}
                <span className="text-sm">
                  {r.compensation_display ?? ""}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
