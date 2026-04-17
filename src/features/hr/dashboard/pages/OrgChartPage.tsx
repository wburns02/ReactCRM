import { useState } from "react";

import { OrgChart } from "../components/OrgChart";
import {
  flattenNodes,
  NODE_STYLES,
  ORG_ROOT,
  type OrgNode,
} from "../orgChartData";


export function OrgChartPage() {
  const [active, setActive] = useState<OrgNode | null>(null);

  const totalNodes = flattenNodes().length;
  const vacancies = flattenNodes().filter((n) => n.vacancy).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Org Chart</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Current Mac Septic hierarchy — {totalNodes} roles,{" "}
            <span className="text-red-600 font-medium">
              {vacancies} open
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <Legend label="Executive" kind="executive" />
          <Legend label="Nashville" kind="office_nashville" />
          <Legend label="SC Midlands" kind="office_sc_midlands" />
          <Legend label="Rock Hill" kind="office_rock_hill" />
          <Legend label="San Marcos" kind="office_san_marcos" />
        </div>
      </div>

      <section className="mt-6 rounded-lg border border-border bg-bg-card p-6 shadow-sm overflow-x-auto">
        <OrgChart
          root={ORG_ROOT}
          activeId={active?.id ?? null}
          onNodeClick={(n) => setActive((cur) => (cur?.id === n.id ? null : n))}
        />
      </section>

      {active && (
        <aside className="mt-6 rounded-lg border border-border bg-bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-neutral-500">
                {active.title}
              </div>
              <h2 className="text-xl font-semibold mt-1">
                {active.name}
                {active.vacancy && (
                  <span className="ml-2 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                    OPEN
                  </span>
                )}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setActive(null)}
              className="text-sm text-neutral-500 hover:text-neutral-900"
            >
              Close
            </button>
          </div>

          <dl className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {active.reports_to && (
              <Row label="Reports to">{active.reports_to}</Row>
            )}
            {active.location && <Row label="Location">{active.location}</Row>}
            {active.department && (
              <Row label="Department">{active.department}</Row>
            )}
            {active.email && <Row label="Email">{active.email}</Row>}
            {active.phone && <Row label="Phone">{active.phone}</Row>}
            <Row label="Direct reports">
              {active.children && active.children.length > 0
                ? active.children.length
                : "—"}
            </Row>
          </dl>

          {active.children && active.children.length > 0 && (
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
                Direct reports
              </div>
              <ul className="flex flex-wrap gap-2">
                {active.children.map((c) => (
                  <li
                    key={c.id}
                    className="text-xs bg-neutral-100 rounded-full px-3 py-1"
                  >
                    {c.title}: {c.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {active.vacancy && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 text-sm text-red-900">
              This role is currently vacant.  Open a requisition from the
              Recruiting hub to start hiring.
            </div>
          )}
        </aside>
      )}
    </div>
  );
}


function Legend({ label, kind }: { label: string; kind: keyof typeof NODE_STYLES }) {
  const s = NODE_STYLES[kind];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-block w-3 h-3 rounded-sm border-2 ${s.border} ${s.bg}`}
        aria-hidden="true"
      />
      <span className="text-neutral-600">{label}</span>
    </span>
  );
}


function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium text-right">{children}</dd>
    </div>
  );
}
