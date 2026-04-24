import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, ExternalLink, Filter, Search, Archive } from "lucide-react";

import { Card } from "@/components/ui/Card";

import {
  useBenefitEvents,
  useBenefitHistory,
  useEnrollments,
  useEoiRequests,
  type Enrollment,
  type BenefitEvent,
  type EoiRequest,
  type HistoryRow,
} from "../api";


type TabKey = "details" | "history" | "events" | "eoi";


const TABS: { key: TabKey; label: string }[] = [
  { key: "details", label: "Employee details" },
  { key: "history", label: "Enrollment history" },
  { key: "events", label: "Upcoming events" },
  { key: "eoi", label: "EOI" },
];


const BENEFIT_TYPES = [
  { value: "medical", label: "Medical" },
  { value: "dental", label: "Dental" },
  { value: "vision", label: "Vision" },
  { value: "life", label: "Life" },
  { value: "fsa", label: "FSA" },
  { value: "hsa", label: "HSA" },
  { value: "std", label: "Short-term disability" },
  { value: "ltd", label: "Long-term disability" },
];


export function EnrollmentsPage() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<TabKey>(
    (params.get("tab") as TabKey) || "details",
  );

  const switchTab = (next: TabKey) => {
    setTab(next);
    const p = new URLSearchParams(params);
    p.set("tab", next);
    setParams(p, { replace: true });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold text-text-primary">Enrollments</h1>

      <nav className="mt-6 border-b border-border flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className={[
                "px-4 py-2 text-sm border-b-2 -mb-px transition",
                active
                  ? "border-[#c77dff] text-[#7b2cbf] font-medium"
                  : "border-transparent text-text-secondary hover:text-text-primary",
              ].join(" ")}
              aria-selected={active}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-6">
        {tab === "details" && <EmployeeDetailsTab />}
        {tab === "history" && <HistoryTab />}
        {tab === "events" && <UpcomingEventsTab />}
        {tab === "eoi" && <EoiTab />}
      </div>
    </div>
  );
}


// ─── helpers ────────────────────────────────────────────────

function fmtMoney(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}


function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}


function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .filter((c) => c && /[A-Za-z]/.test(c))
    .slice(0, 2)
    .join("");
}


function downloadCsv(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = r[h];
          const s = v === null || v === undefined ? "" : String(v);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}


function Avatar({ name, highlight }: { name: string; highlight?: boolean }) {
  return (
    <div
      className={
        "w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium shrink-0 " +
        (highlight
          ? "bg-violet-500/10 text-violet-600"
          : "bg-neutral-500/10 text-text-secondary")
      }
    >
      {initials(name) || "?"}
    </div>
  );
}


function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-600",
    waived: "bg-neutral-500/10 text-neutral-600",
    terminated: "bg-rose-500/10 text-rose-600",
    pending: "bg-amber-500/10 text-amber-600",
    completed: "bg-emerald-500/10 text-emerald-600",
    approved: "bg-emerald-500/10 text-emerald-600",
    denied: "bg-rose-500/10 text-rose-600",
    withdrawn: "bg-neutral-500/10 text-neutral-600",
  };
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full " +
        (map[status] ?? "bg-neutral-500/10 text-neutral-600")
      }
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}


// ─── Employee Details tab ───────────────────────────────────

function EmployeeDetailsTab() {
  const [params] = useSearchParams();
  const [benefitType, setBenefitType] = useState(
    params.get("benefit_type") ?? "medical",
  );
  const [search, setSearch] = useState("");

  const q = useEnrollments({
    benefit_type: benefitType,
    q: search.trim() || undefined,
  });
  const rows = q.data ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={benefitType}
          onChange={(e) => setBenefitType(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-bg-card text-text-primary font-medium"
        >
          {BENEFIT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <div className="inline-flex rounded-lg border border-border p-0.5 bg-bg-card">
          <button className="px-3 py-1 text-sm rounded-md bg-bg-muted text-text-primary font-medium">
            Current {BENEFIT_TYPES.find((t) => t.value === benefitType)?.label} enrollments
          </button>
          <button
            className="px-3 py-1 text-sm rounded-md text-text-secondary hover:text-text-primary"
            disabled
            title="Coming soon"
          >
            Recent updates
          </button>
          <button
            className="px-3 py-1 text-sm rounded-md text-text-secondary hover:text-text-primary"
            disabled
            title="Coming soon"
          >
            Court-ordered dependents
          </button>
        </div>
      </div>

      <Card className="p-0">
        <header className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-text-primary">
              Current {BENEFIT_TYPES.find((t) => t.value === benefitType)?.label} enrollments · {rows.length}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                downloadCsv(
                  rows.map((r) => ({
                    employee: r.employee_name,
                    title: r.employee_title ?? "",
                    plan: r.plan_name ?? "",
                    carrier: r.carrier ?? "",
                    effective_date: r.effective_date ?? "",
                    monthly_cost: r.monthly_cost ?? "",
                    monthly_deduction: r.monthly_deduction ?? "",
                    status: r.status,
                  })),
                  `enrollments-${benefitType}-${Date.now()}.csv`,
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:border-[#c77dff] text-text-primary bg-bg-card"
            >
              <Download className="w-3.5 h-3.5" />
              Download enrollments
            </button>
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg text-text-secondary hover:text-text-primary disabled:opacity-50"
              disabled
              title="Fullscreen coming soon"
              aria-label="Expand"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        <div className="px-5 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-bg-card text-text-primary"
            />
          </div>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg text-text-secondary hover:text-text-primary">
            <Filter className="w-3.5 h-3.5" />
            Filter
          </button>
        </div>

        {q.isLoading ? (
          <div className="p-10 text-center text-sm text-text-muted">Loading enrollments…</div>
        ) : q.error ? (
          <div className="p-10 text-center text-sm text-rose-600">{q.error.message}</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-text-muted">
            No {BENEFIT_TYPES.find((t) => t.value === benefitType)?.label.toLowerCase()} enrollments yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Employee</th>
                  <th className="text-left font-medium px-5 py-3">Plan</th>
                  <th className="text-left font-medium px-5 py-3">Carrier</th>
                  <th className="text-left font-medium px-5 py-3">Effective date</th>
                  <th className="text-right font-medium px-5 py-3">Monthly cost</th>
                  <th className="text-right font-medium px-5 py-3">Monthly deductions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: Enrollment) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/60 hover:bg-bg-muted transition"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={r.employee_name} highlight />
                        <div className="min-w-0">
                          <div className="font-medium text-text-primary truncate">
                            {r.employee_name}
                          </div>
                          {r.employee_title && (
                            <div className="text-xs text-text-muted truncate">
                              {r.employee_title}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-text-primary">
                      {r.plan_name ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-text-secondary">
                      {r.carrier ?? "N/A"}
                    </td>
                    <td className="px-5 py-3 text-text-secondary">
                      {fmtDate(r.effective_date)}
                    </td>
                    <td className="px-5 py-3 text-right text-text-primary font-medium">
                      {fmtMoney(r.monthly_cost)}
                    </td>
                    <td className="px-5 py-3 text-right text-text-primary font-medium">
                      {fmtMoney(r.monthly_deduction)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}


// ─── Enrollment History tab ─────────────────────────────────

function HistoryTab() {
  const [search, setSearch] = useState("");
  const q = useBenefitHistory({ q: search.trim() || undefined });
  const rows = q.data ?? [];

  return (
    <div>
      <div className="mb-4 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
          i
        </div>
        <p className="text-sm text-text-primary">
          The history displayed here defaults to enrollments that were completed
          in the last 30 days. Update the Completed Date range below to see your
          desired time range.
        </p>
      </div>

      <Card className="p-0">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="text-sm font-semibold text-text-primary">
            Enrollment change report · {rows.length}
          </div>
          <button
            onClick={() =>
              downloadCsv(
                rows.map((r) => ({
                  employee: r.employee_name,
                  change_type: r.change_type,
                  affected_lines: r.affected_lines,
                  completed_date: r.completed_date ?? "",
                  effective_date: r.effective_date ?? "",
                  changed_by: r.changed_by ?? "N/A",
                  terminated: r.is_terminated ? "Yes" : "No",
                })),
                `enrollment-history-${Date.now()}.csv`,
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:border-[#c77dff] text-text-primary bg-bg-card"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV
          </button>
        </header>

        <div className="px-5 py-3 border-b border-border flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-bg-card text-text-primary"
            />
          </div>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg text-text-secondary">
            <Filter className="w-3.5 h-3.5" />
            Filter
          </button>
        </div>

        {q.isLoading ? (
          <div className="p-10 text-center text-sm text-text-muted">Loading history…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-text-muted">
            No enrollment changes recorded in this window.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Employee name</th>
                  <th className="text-left font-medium px-5 py-3">Change type</th>
                  <th className="text-left font-medium px-5 py-3">Affected lines</th>
                  <th className="text-left font-medium px-5 py-3">Completed date</th>
                  <th className="text-left font-medium px-5 py-3">Effective date of change</th>
                  <th className="text-left font-medium px-5 py-3">Changed by</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: HistoryRow) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/60 hover:bg-bg-muted transition"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={r.employee_name} highlight />
                        <div className="min-w-0">
                          <div className="font-medium text-text-primary truncate">
                            {r.employee_name}
                          </div>
                          {r.is_terminated && (
                            <div className="text-xs text-rose-600">Terminated</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-text-primary">{r.change_type}</td>
                    <td className="px-5 py-3">
                      <span className="text-[#7b2cbf] underline-offset-2 hover:underline cursor-default">
                        {r.affected_lines}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-text-secondary">
                      {fmtDate(r.completed_date)}
                    </td>
                    <td className="px-5 py-3 text-text-secondary">
                      {fmtDate(r.effective_date)}
                    </td>
                    <td className="px-5 py-3 text-text-secondary">
                      {r.changed_by ?? "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}


// ─── Upcoming Events tab ────────────────────────────────────

function UpcomingEventsTab() {
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState<string>("");
  const q = useBenefitEvents({
    event_type: eventType || undefined,
    q: search.trim() || undefined,
  });
  const rows = q.data ?? [];

  return (
    <Card className="p-0">
      <header className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="text-sm font-semibold text-text-primary">Upcoming events</div>
        <button
          onClick={() =>
            downloadCsv(
              rows.map((r) => ({
                effective_date: r.effective_date ?? "",
                employee: r.employee_name,
                title: r.employee_title ?? "",
                event_type: r.event_type,
                status: r.status,
                completion_date: r.completion_date ?? "",
              })),
              `upcoming-events-${Date.now()}.csv`,
            )
          }
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:border-[#c77dff] text-text-primary bg-bg-card"
        >
          <Download className="w-3.5 h-3.5" />
          Download CSV
        </button>
      </header>

      <div className="px-5 py-3 border-b border-border flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-bg-card text-text-primary"
          />
        </div>
        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-bg-card text-text-primary"
        >
          <option value="">All events</option>
          <option value="New Hire">New Hire</option>
          <option value="Demographic Change">Demographic Change</option>
          <option value="Termination">Termination</option>
          <option value="COBRA Enrollment">COBRA Enrollment</option>
          <option value="Qualified Life Event (QLE)">Qualified Life Event (QLE)</option>
        </select>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg text-text-secondary">
          <Filter className="w-3.5 h-3.5" />
          Filter
        </button>
      </div>

      {q.isLoading ? (
        <div className="p-10 text-center text-sm text-text-muted">Loading events…</div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center text-sm text-text-muted">
          No upcoming events.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="text-left font-medium px-5 py-3">Effective Date</th>
                <th className="text-left font-medium px-5 py-3">Employee</th>
                <th className="text-left font-medium px-5 py-3">Event Type</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
                <th className="text-left font-medium px-5 py-3">Completion date</th>
                <th className="text-left font-medium px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: BenefitEvent) => (
                <tr
                  key={r.id}
                  className="border-b border-border/60 hover:bg-bg-muted transition"
                >
                  <td className="px-5 py-3 text-text-primary">{fmtDate(r.effective_date)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={r.employee_name} highlight />
                      <div className="min-w-0">
                        <div className="font-medium text-text-primary truncate">
                          {r.employee_name}
                        </div>
                        {r.employee_title && (
                          <div className="text-xs text-text-muted truncate">
                            {r.employee_title}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-text-primary">{r.event_type}</td>
                  <td className="px-5 py-3">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-5 py-3 text-text-secondary">
                    {fmtDate(r.completion_date)}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      disabled={r.status !== "completed"}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-border rounded-md text-text-primary bg-bg-card hover:border-[#c77dff] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Archive className="w-3 h-3" />
                      Archive
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}


// ─── EOI tab ────────────────────────────────────────────────

function EoiTab() {
  const [benefitType, setBenefitType] = useState("");
  const [status, setStatus] = useState("pending");
  const [search, setSearch] = useState("");
  const q = useEoiRequests({
    benefit_type: benefitType || undefined,
    status: status || undefined,
    q: search.trim() || undefined,
  });
  const rows = useMemo(() => q.data ?? [], [q.data]);

  return (
    <Card className="p-0">
      <header className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="text-sm font-semibold text-text-primary">
          EOI requests · {rows.length}
        </div>
        <button
          onClick={() =>
            downloadCsv(
              rows.map((r) => ({
                employee: r.employee_name,
                status: r.status,
                member_name: r.member_name,
                member_type: r.member_type,
                benefit_type: r.benefit_type,
                plan_name: r.plan_name ?? "",
                enrollment_created_at: r.enrollment_created_at ?? "",
                enrollment_ends_at: r.enrollment_ends_at ?? "",
              })),
              `eoi-requests-${Date.now()}.csv`,
            )
          }
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:border-[#c77dff] text-text-primary bg-bg-card"
        >
          <Download className="w-3.5 h-3.5" />
          Download CSV
        </button>
      </header>

      <div className="px-5 py-3 border-b border-border flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-bg-card text-text-primary"
          />
        </div>
        <select
          value={benefitType}
          onChange={(e) => setBenefitType(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-bg-card text-text-primary"
        >
          <option value="">All benefit types</option>
          {BENEFIT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-bg-card text-text-primary"
        >
          <option value="pending">All pending requests</option>
          <option value="approved">Approved</option>
          <option value="denied">Denied</option>
          <option value="withdrawn">Withdrawn</option>
          <option value="">All statuses</option>
        </select>
      </div>

      {q.isLoading ? (
        <div className="p-10 text-center text-sm text-text-muted">Loading EOI requests…</div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center text-sm text-text-muted">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-neutral-500/10 flex items-center justify-center">
            <Filter className="w-5 h-5 text-text-muted" />
          </div>
          There is no data to show here currently.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="text-left font-medium px-5 py-3">Employee</th>
                <th className="text-left font-medium px-5 py-3">EOI status</th>
                <th className="text-left font-medium px-5 py-3">Member name</th>
                <th className="text-left font-medium px-5 py-3">Member type</th>
                <th className="text-left font-medium px-5 py-3">Benefit type</th>
                <th className="text-left font-medium px-5 py-3">Plan name</th>
                <th className="text-left font-medium px-5 py-3">Enrollment created</th>
                <th className="text-left font-medium px-5 py-3">Enrollment ends</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: EoiRequest) => (
                <tr
                  key={r.id}
                  className="border-b border-border/60 hover:bg-bg-muted transition"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={r.employee_name} highlight />
                      <div className="font-medium text-text-primary truncate">
                        {r.employee_name}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-5 py-3 text-text-primary">{r.member_name}</td>
                  <td className="px-5 py-3 capitalize text-text-secondary">
                    {r.member_type}
                  </td>
                  <td className="px-5 py-3 capitalize text-text-primary">
                    {r.benefit_type}
                  </td>
                  <td className="px-5 py-3 text-text-primary">
                    {r.plan_name ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-text-secondary">
                    {fmtDate(r.enrollment_created_at)}
                  </td>
                  <td className="px-5 py-3 text-text-secondary">
                    {fmtDate(r.enrollment_ends_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
