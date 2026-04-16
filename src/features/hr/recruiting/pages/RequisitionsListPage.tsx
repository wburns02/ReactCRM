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
              <span className="text-sm shrink-0">
                {r.compensation_display ?? ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
