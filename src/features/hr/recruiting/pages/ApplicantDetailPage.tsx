import { Link, useParams } from "react-router-dom";

import { useApplicant } from "../api-applicants";


export function ApplicantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const a = useApplicant(id);

  if (a.isLoading) return <div className="p-6">Loading applicant…</div>;
  if (a.error) return <div className="p-6 text-red-600">{a.error.message}</div>;
  if (!a.data) return null;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link to="/hr/requisitions" className="text-sm text-neutral-500 hover:underline">
        ← Back to requisitions
      </Link>
      <h1 className="text-2xl font-semibold mt-3">
        {a.data.first_name} {a.data.last_name}
      </h1>
      <div className="mt-2 space-y-1 text-sm">
        <div>
          <span className="text-neutral-500">Email:</span>{" "}
          <a className="underline" href={`mailto:${a.data.email}`}>
            {a.data.email}
          </a>
        </div>
        {a.data.phone && (
          <div>
            <span className="text-neutral-500">Phone:</span>{" "}
            <a className="underline" href={`tel:${a.data.phone}`}>
              {a.data.phone}
            </a>
          </div>
        )}
        <div>
          <span className="text-neutral-500">Source:</span> {a.data.source}
        </div>
        <div>
          <span className="text-neutral-500">SMS consent:</span>{" "}
          {a.data.sms_consent_given ? "Yes" : "No"}
        </div>
        <div>
          <span className="text-neutral-500">Applied at:</span>{" "}
          {new Date(a.data.created_at).toLocaleString()}
        </div>
      </div>

      {a.data.resume_storage_key ? (
        <div className="mt-6 p-4 border rounded-lg">
          <div className="text-sm text-neutral-500">Resume on file</div>
          <div className="text-xs text-neutral-400 font-mono mt-1 break-all">
            {a.data.resume_storage_key}
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-neutral-500">No resume uploaded.</p>
      )}
    </div>
  );
}
