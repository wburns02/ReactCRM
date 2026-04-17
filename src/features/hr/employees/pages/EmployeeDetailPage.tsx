import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  useAccessGrants,
  useCertifications,
  useDocuments,
  useTruckAssignments,
} from "../api";
import { useInstancesForSubject, useSpawnOffboarding } from "../../onboarding/api";


type Tab = "overview" | "files" | "workflows" | "activity";


export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("overview");

  const certs = useCertifications(id);
  const docs = useDocuments(id);
  const trucks = useTruckAssignments(id);
  const grants = useAccessGrants(id);
  const workflows = useInstancesForSubject(id);
  const spawnOff = useSpawnOffboarding();

  async function startOffboarding() {
    if (!id) return;
    if (!window.confirm("Start offboarding for this employee?")) return;
    await spawnOff.mutateAsync({ subject_id: id });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link
        to="/hr"
        className="text-sm text-neutral-500 hover:underline"
      >
        ← HR
      </Link>
      <div className="flex items-start justify-between mt-3 gap-4">
        <h1 className="text-2xl font-semibold">Employee {id?.slice(0, 8)}…</h1>
        <button
          type="button"
          onClick={startOffboarding}
          disabled={spawnOff.isPending}
          className="px-4 py-2 text-sm border rounded-lg hover:bg-neutral-50 disabled:opacity-50"
        >
          Start offboarding
        </button>
      </div>

      <nav className="mt-6 flex gap-2 border-b">
        {(["overview", "files", "workflows", "activity"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              tab === t
                ? "px-4 py-2 text-sm border-b-2 border-indigo-600 text-indigo-600"
                : "px-4 py-2 text-sm text-neutral-500 hover:text-neutral-900"
            }
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <Card title="Certifications">
            {certs.data && certs.data.length > 0 ? (
              <ul className="space-y-1">
                {certs.data.map((c) => (
                  <li key={c.id} className="text-sm">
                    <b>{c.kind}</b>
                    {c.number && <span> — {c.number}</span>}
                    {c.expires_at && (
                      <span className="text-neutral-500">
                        {" "}
                        (expires {c.expires_at})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">None on file.</p>
            )}
          </Card>
          <Card title="Open truck assignments">
            {trucks.data && trucks.data.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {trucks.data.map((t) => (
                  <li key={t.id} className="font-mono">
                    {t.truck_id.slice(0, 8)}…
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">No truck assigned.</p>
            )}
          </Card>
          <Card title="Access grants">
            {grants.data && grants.data.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {grants.data.map((g) => (
                  <li key={g.id}>
                    <b>{g.system}</b>
                    {g.identifier && <span> — {g.identifier}</span>}
                    {g.revoked_at && (
                      <span className="text-red-600"> (revoked)</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">No access granted.</p>
            )}
          </Card>
          <Card title="Documents">
            {docs.data && docs.data.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {docs.data.map((d) => (
                  <li key={d.id}>
                    <b>{d.kind}</b>
                    <span className="text-neutral-500 ml-2">
                      {new Date(d.uploaded_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">No documents uploaded.</p>
            )}
          </Card>
        </section>
      )}

      {tab === "files" && (
        <section className="mt-6">
          {docs.data && docs.data.length > 0 ? (
            <ul className="divide-y border rounded-lg">
              {docs.data.map((d) => (
                <li key={d.id} className="p-3 flex justify-between gap-4">
                  <span className="font-medium">{d.kind}</span>
                  <span className="text-xs text-neutral-500 font-mono break-all">
                    {d.storage_key}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">No files on this employee.</p>
          )}
        </section>
      )}

      {tab === "workflows" && (
        <section className="mt-6">
          {workflows.data && workflows.data.length > 0 ? (
            <ul className="divide-y border rounded-lg">
              {workflows.data.map((w) => (
                <li key={w.id} className="p-3 flex justify-between gap-4">
                  <div>
                    <Link
                      to={`/hr/onboarding/${w.id}`}
                      className="font-medium hover:underline"
                    >
                      Instance {w.id.slice(0, 8)}…
                    </Link>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {new Date(w.started_at).toLocaleString()} · {w.status}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">
              No workflow instances for this employee yet.
            </p>
          )}
        </section>
      )}

      {tab === "activity" && (
        <section className="mt-6 text-sm text-neutral-500">
          Activity feed lands in Plan 4.
        </section>
      )}
    </div>
  );
}


function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="text-sm font-semibold mb-2">{title}</h3>
      {children}
    </div>
  );
}
