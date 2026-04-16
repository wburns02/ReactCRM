import { Link } from "react-router-dom";

import { useApplicants } from "../api-applicants";


export function ApplicantsListPage() {
  const { data, isLoading, error } = useApplicants();

  if (isLoading) return <div className="p-6">Loading…</div>;
  if (error)
    return (
      <div className="p-6 text-red-600">
        Error loading applicants: {error.message}
      </div>
    );

  const rows = data ?? [];
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold">Applicants</h1>

      {rows.length === 0 ? (
        <p className="mt-6 text-neutral-500">
          No applicants yet. When someone submits the form on a public
          requisition they'll appear here.
        </p>
      ) : (
        <ul className="mt-6 divide-y border rounded-lg">
          {rows.map((a) => (
            <li
              key={a.id}
              className="p-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <Link
                  to={`/hr/applicants/${a.id}`}
                  className="font-medium hover:underline"
                >
                  {a.first_name} {a.last_name}
                </Link>
                <div className="text-sm text-neutral-500">
                  {a.email}
                  {a.phone && " · " + a.phone}
                </div>
              </div>
              <div className="text-xs shrink-0 text-neutral-500">
                {a.source} ·{" "}
                {new Date(a.created_at).toLocaleDateString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
