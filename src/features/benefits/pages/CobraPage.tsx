import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Download, Search, Filter, Plus, Send, RotateCcw, MailPlus,
  ExternalLink, Trash2, Landmark, AlertTriangle, Pencil,
} from "lucide-react";

import { Card } from "@/components/ui/Card";

import {
  useAddCobraEnrollment,
  useAddCobraPrePlan,
  useCobraEnrollments,
  useCobraNotices,
  useCobraPayments,
  useCobraPrePlans,
  useCobraSettings,
  useDeleteCobraPrePlan,
  usePatchCobraSettings,
  useSendCobraNotice,
  type CobraEnrollment,
  type CobraNotice,
  type CobraPayment,
  type CobraPrePlan,
} from "../cobraApi";


type TabKey = "enrollments" | "payments" | "notices" | "settings";
type SubBucket = "current" | "upcoming" | "pending" | "past";

const TABS: { key: TabKey; label: string }[] = [
  { key: "enrollments", label: "Enrollments" },
  { key: "payments", label: "Payments" },
  { key: "notices", label: "Notices" },
  { key: "settings", label: "Settings" },
];


function toNum(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isNaN(n) ? 0 : n;
}


function fmtMoney(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === "") return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 2,
  }).format(toNum(v));
}


function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", {
    year: "numeric", month: "2-digit", day: "2-digit",
  });
}


function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/).map((n) => n[0]).filter((c) => c && /[A-Za-z]/.test(c))
    .slice(0, 2).join("");
  return (
    <div className="w-9 h-9 rounded-full bg-violet-500/10 text-violet-600 flex items-center justify-center text-xs font-medium shrink-0">
      {initials || "?"}
    </div>
  );
}


function StatusPill({ status }: { status: string }) {
  const norm = status.toLowerCase().replace(/_/g, " ");
  const cls =
    norm.includes("enrolled") || norm === "paid" || norm === "delivered"
      ? "bg-emerald-500/10 text-emerald-600"
      : norm.includes("pending")
        ? "bg-amber-500/10 text-amber-600"
        : norm.includes("declined") || norm.includes("denied") || norm === "failed"
          ? "bg-rose-500/10 text-rose-600"
          : "bg-blue-500/10 text-blue-600";
  const label = norm.charAt(0).toUpperCase() + norm.slice(1);
  return (
    <span className={"inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full " + cls}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}


function downloadCsv(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => {
        const v = r[h];
        const s = v === null || v === undefined ? "" : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}


const inputCls =
  "w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg-card text-text-primary";


export function CobraPage() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<TabKey>(
    (params.get("tab") as TabKey) || "enrollments",
  );
  const switchTab = (next: TabKey) => {
    setTab(next);
    const p = new URLSearchParams(params);
    p.set("tab", next);
    setParams(p, { replace: true });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="text-xs text-text-muted">All benefits ›</div>
      <h1 className="text-2xl font-semibold text-text-primary">COBRA</h1>

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
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-6">
        {tab === "enrollments" && <EnrollmentsTab />}
        {tab === "payments" && <PaymentsTab />}
        {tab === "notices" && <NoticesTab />}
        {tab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}


// ─── Enrollments tab ────────────────────────────────────────

function EnrollmentsTab() {
  const [bucket, setBucket] = useState<SubBucket>("current");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const q = useCobraEnrollments({
    bucket,
    q: search.trim() || undefined,
  });
  const rows = q.data ?? [];

  const add = useAddCobraEnrollment();
  const send = useSendCobraNotice();

  return (
    <div>
      <div className="inline-flex rounded-lg border border-border p-0.5 bg-bg-card mb-6">
        {(["current", "upcoming", "pending", "past"] as SubBucket[]).map((b) => (
          <button
            key={b}
            onClick={() => setBucket(b)}
            className={[
              "px-3 py-1 text-sm rounded-md capitalize",
              bucket === b
                ? "bg-bg-muted text-text-primary font-medium"
                : "text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            {b}
          </button>
        ))}
      </div>

      {bucket === "pending" ? (
        <PendingTasksPanel rows={rows} />
      ) : bucket === "past" ? (
        <ArchivedPanel rows={rows} />
      ) : (
        <Card className="p-0">
          <header className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-text-primary">
              {bucket === "current"
                ? `COBRA enrollments · ${rows.length}`
                : `Upcoming · ${rows.length}`}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  downloadCsv(
                    rows.map((r) => ({
                      employee: r.employee_name,
                      beneficiary: r.beneficiary_name,
                      status: r.status,
                      qualifying_event: r.qualifying_event ?? "",
                      eligibility_date: r.eligibility_date ?? "",
                      exhaustion_date: r.exhaustion_date ?? "",
                    })),
                    `cobra-${bucket}-${Date.now()}.csv`,
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:border-[#c77dff] text-text-primary bg-bg-card"
              >
                <Download className="w-3.5 h-3.5" />
                Export as CSV
              </button>
              <button
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[#7b2cbf] text-white hover:bg-[#5a189a]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add employee
              </button>
            </div>
          </header>

          <div className="px-5 py-3 border-b border-border">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employee by name"
                className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-bg-card text-text-primary"
              />
            </div>
          </div>

          {q.isLoading ? (
            <div className="p-10 text-center text-sm text-text-muted">Loading…</div>
          ) : rows.length === 0 ? (
            <EmptyBucket bucket={bucket} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="text-left font-medium px-5 py-3">Employee</th>
                    <th className="text-left font-medium px-5 py-3">Beneficiary</th>
                    <th className="text-left font-medium px-5 py-3">Status</th>
                    <th className="text-left font-medium px-5 py-3">Qualifying event</th>
                    <th className="text-left font-medium px-5 py-3">Eligibility date</th>
                    <th className="text-left font-medium px-5 py-3">Exhaustion date</th>
                    <th className="text-right font-medium px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <EnrollmentRow
                      key={r.id}
                      row={r}
                      onSendNotice={() => send.mutate(r.id)}
                      sending={send.isPending}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {showAdd && (
        <AddEnrollmentModal
          onCancel={() => setShowAdd(false)}
          onSave={async (payload) => {
            await add.mutateAsync({ ...payload, bucket });
            setShowAdd(false);
          }}
          pending={add.isPending}
        />
      )}
    </div>
  );
}


function EnrollmentRow({
  row, onSendNotice, sending,
}: { row: CobraEnrollment; onSendNotice: () => void; sending: boolean }) {
  const hasNotice = row.notice_sent_at !== null;
  const needsNotice = row.status === "pending_election";
  const needsInvite = row.status === "pending_onboarding";
  return (
    <tr className="border-b border-border/60 hover:bg-bg-muted transition">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={row.employee_name} />
          <div className="min-w-0">
            <div className="font-medium text-text-primary truncate">
              {row.employee_name}
            </div>
            {row.employee_label && (
              <div className="text-xs text-amber-600">{row.employee_label}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-5 py-3 text-text-primary">{row.beneficiary_name}</td>
      <td className="px-5 py-3"><StatusPill status={row.status} /></td>
      <td className="px-5 py-3 text-text-primary">{row.qualifying_event ?? "—"}</td>
      <td className="px-5 py-3 text-text-secondary">{fmtDate(row.eligibility_date)}</td>
      <td className="px-5 py-3 text-text-secondary">{fmtDate(row.exhaustion_date)}</td>
      <td className="px-5 py-3 text-right">
        {needsNotice && (
          <button
            onClick={onSendNotice}
            disabled={sending}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs border border-border rounded-md text-text-primary bg-bg-card hover:border-[#c77dff] disabled:opacity-50"
          >
            {hasNotice ? (
              <>
                <RotateCcw className="w-3 h-3" />
                Resend Notice
              </>
            ) : (
              <>
                <Send className="w-3 h-3" />
                Send Notice
              </>
            )}
          </button>
        )}
        {needsInvite && (
          <button className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs border border-border rounded-md text-text-primary bg-bg-card hover:border-[#c77dff]">
            <MailPlus className="w-3 h-3" />
            Invite
          </button>
        )}
      </td>
    </tr>
  );
}


function AddEnrollmentModal({
  onCancel, onSave, pending,
}: {
  onCancel: () => void;
  onSave: (p: {
    employee_name: string;
    beneficiary_name: string;
    qualifying_event?: string;
    eligibility_date?: string;
    exhaustion_date?: string;
  }) => Promise<void>;
  pending: boolean;
}) {
  const [emp, setEmp] = useState("");
  const [bene, setBene] = useState("");
  const [qe, setQe] = useState("Termination");
  const [elig, setElig] = useState("");
  const [exh, setExh] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="text-base font-semibold text-text-primary">
            Add COBRA employee
          </div>
          <button
            onClick={onCancel}
            className="text-text-muted hover:text-text-primary"
          >
            ×
          </button>
        </div>
        <div className="space-y-3">
          <Labeled label="Employee name">
            <input value={emp} onChange={(e) => setEmp(e.target.value)} className={inputCls} placeholder="Jane Doe" />
          </Labeled>
          <Labeled label="Beneficiary">
            <input value={bene} onChange={(e) => setBene(e.target.value)} className={inputCls} placeholder="Jane Doe" />
          </Labeled>
          <Labeled label="Qualifying event">
            <select value={qe} onChange={(e) => setQe(e.target.value)} className={inputCls}>
              <option>Termination</option>
              <option>Reduction in hours</option>
              <option>Loss of dependent child status</option>
              <option>Divorce or legal separation</option>
              <option>Death of employee</option>
            </select>
          </Labeled>
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Eligibility date">
              <input type="date" value={elig} onChange={(e) => setElig(e.target.value)} className={inputCls} />
            </Labeled>
            <Labeled label="Exhaustion date">
              <input type="date" value={exh} onChange={(e) => setExh(e.target.value)} className={inputCls} />
            </Labeled>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm border border-border rounded-lg text-text-secondary hover:text-text-primary">
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                employee_name: emp,
                beneficiary_name: bene || emp,
                qualifying_event: qe,
                eligibility_date: elig || undefined,
                exhaustion_date: exh || undefined,
              })
            }
            disabled={!emp || pending}
            className="px-3 py-1.5 text-sm rounded-lg bg-[#7b2cbf] text-white hover:bg-[#5a189a] disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </Card>
    </div>
  );
}


function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-text-muted block mb-1">{label}</span>
      {children}
    </label>
  );
}


function PendingTasksPanel({ rows }: { rows: CobraEnrollment[] }) {
  const pending = rows.filter((r) => r.status.startsWith("pending"));
  return (
    <Card className="p-0">
      <header className="px-5 py-4 border-b border-border">
        <div className="text-sm font-semibold text-text-primary">Pending tasks</div>
      </header>
      {pending.length === 0 ? (
        <div className="p-10 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-neutral-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-text-muted" />
          </div>
          <div className="text-sm text-text-muted">There is no data to show here currently.</div>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {pending.map((r) => (
            <li key={r.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={r.employee_name} />
                <div className="min-w-0">
                  <div className="font-medium text-text-primary truncate">{r.employee_name}</div>
                  <div className="text-xs text-text-muted">
                    {r.qualifying_event ?? "—"} · eligibility {fmtDate(r.eligibility_date)}
                  </div>
                </div>
              </div>
              <StatusPill status={r.status} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}


function ArchivedPanel({ rows }: { rows: CobraEnrollment[] }) {
  return (
    <Card className="p-0">
      <header className="px-5 py-4 border-b border-border">
        <div className="text-sm font-semibold text-text-primary">Archived</div>
      </header>
      {rows.length === 0 ? (
        <div className="p-10 text-center text-sm text-text-muted">
          There is no data to show here currently.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="text-left font-medium px-5 py-3">Employee</th>
                <th className="text-left font-medium px-5 py-3">Beneficiary</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
                <th className="text-left font-medium px-5 py-3">Qualifying event</th>
                <th className="text-left font-medium px-5 py-3">Eligibility date</th>
                <th className="text-left font-medium px-5 py-3">Exhaustion date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60">
                  <td className="px-5 py-3 text-text-primary">{r.employee_name}</td>
                  <td className="px-5 py-3 text-text-primary">{r.beneficiary_name}</td>
                  <td className="px-5 py-3"><StatusPill status={r.status} /></td>
                  <td className="px-5 py-3 text-text-primary">{r.qualifying_event ?? "—"}</td>
                  <td className="px-5 py-3 text-text-secondary">{fmtDate(r.eligibility_date)}</td>
                  <td className="px-5 py-3 text-text-secondary">{fmtDate(r.exhaustion_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}


function EmptyBucket({ bucket }: { bucket: SubBucket }) {
  return (
    <div className="p-10 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-neutral-500/10 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-text-muted" />
      </div>
      <div className="text-sm text-text-muted">
        No {bucket} COBRA enrollments.
      </div>
    </div>
  );
}


// ─── Payments tab ───────────────────────────────────────────

function PaymentsTab() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const q = useCobraPayments({
    q: search.trim() || undefined,
    status: status || undefined,
  });
  const rows = q.data ?? [];

  return (
    <Card className="p-0">
      <header className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="text-sm font-semibold text-text-primary">
          Payment details · {rows.length}
        </div>
        <button
          onClick={() =>
            downloadCsv(
              rows.map((r) => ({
                employee: r.employee_name,
                beneficiary: r.beneficiary_name,
                month: r.month,
                employee_charge_date: r.employee_charge_date ?? "",
                charged_amount: r.charged_amount ?? "",
                company_reimbursement_date: r.company_reimbursement_date ?? "",
                reimbursement_amount: r.reimbursement_amount ?? "",
                status: r.status,
              })),
              `cobra-payments-${Date.now()}.csv`,
            )
          }
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:border-[#c77dff] text-text-primary bg-bg-card"
        >
          <Download className="w-3.5 h-3.5" />
          Export as CSV
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
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputCls} max-w-[160px]`}>
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg text-text-secondary">
          <Filter className="w-3.5 h-3.5" />
          Filter
        </button>
      </div>

      {q.isLoading ? (
        <div className="p-10 text-center text-sm text-text-muted">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-neutral-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-text-muted" />
          </div>
          <div className="text-sm text-text-muted">There is no data to show here currently.</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="text-left font-medium px-5 py-3">Employee</th>
                <th className="text-left font-medium px-5 py-3">Beneficiary</th>
                <th className="text-left font-medium px-5 py-3">Month</th>
                <th className="text-left font-medium px-5 py-3">Employee charge date</th>
                <th className="text-right font-medium px-5 py-3">Charged amount</th>
                <th className="text-left font-medium px-5 py-3">Reimbursement date</th>
                <th className="text-right font-medium px-5 py-3">Reimbursement amount</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: CobraPayment) => (
                <tr key={r.id} className="border-b border-border/60 hover:bg-bg-muted transition">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.employee_name} />
                      <div className="font-medium text-text-primary">{r.employee_name}</div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-text-primary">{r.beneficiary_name}</td>
                  <td className="px-5 py-3 text-text-secondary">{r.month}</td>
                  <td className="px-5 py-3 text-text-secondary">{fmtDate(r.employee_charge_date)}</td>
                  <td className="px-5 py-3 text-right text-text-primary">{fmtMoney(r.charged_amount)}</td>
                  <td className="px-5 py-3 text-text-secondary">{fmtDate(r.company_reimbursement_date)}</td>
                  <td className="px-5 py-3 text-right text-text-primary">{fmtMoney(r.reimbursement_amount)}</td>
                  <td className="px-5 py-3"><StatusPill status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}


// ─── Notices tab ────────────────────────────────────────────

function NoticesTab() {
  const [search, setSearch] = useState("");
  const q = useCobraNotices(search.trim() || undefined);
  const rows = q.data ?? [];

  return (
    <Card className="p-0">
      <header className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="text-sm font-semibold text-text-primary">
          Notices · {rows.length}
        </div>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg text-text-secondary hover:text-text-primary">
          <Filter className="w-3.5 h-3.5" />
          Filter
        </button>
      </header>

      <div className="px-5 py-3 border-b border-border">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-bg-card text-text-primary"
          />
        </div>
      </div>

      {q.isLoading ? (
        <div className="p-10 text-center text-sm text-text-muted">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center text-sm text-text-muted">
          No notices yet. Send one from the Enrollments tab.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="text-left font-medium px-5 py-3">Employee</th>
                <th className="text-left font-medium px-5 py-3">Beneficiary</th>
                <th className="text-left font-medium px-5 py-3">Type of notice</th>
                <th className="text-left font-medium px-5 py-3">Addressed to</th>
                <th className="text-left font-medium px-5 py-3">View notice</th>
                <th className="text-left font-medium px-5 py-3">Tracking status</th>
                <th className="text-left font-medium px-5 py-3">Updated on</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: CobraNotice) => (
                <tr key={r.id} className="border-b border-border/60 hover:bg-bg-muted transition">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.employee_name} />
                      <div className="font-medium text-text-primary">{r.employee_name}</div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-text-primary">{r.beneficiary_name}</td>
                  <td className="px-5 py-3 text-text-primary">{r.type_of_notice}</td>
                  <td className="px-5 py-3 text-text-secondary">{r.addressed_to ?? "—"}</td>
                  <td className="px-5 py-3">
                    {r.notice_url ? (
                      <a
                        href={r.notice_url}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-1 text-[#2563eb] hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Link to notice
                      </a>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3"><StatusPill status={r.tracking_status} /></td>
                  <td className="px-5 py-3 text-text-secondary">{fmtDate(r.updated_on)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}


// ─── Settings tab ───────────────────────────────────────────

function SettingsTab() {
  const [sub, setSub] = useState<"bank" | "plans">("bank");
  return (
    <div>
      <div className="inline-flex rounded-lg border border-border p-0.5 bg-bg-card mb-6">
        <button
          onClick={() => setSub("bank")}
          className={[
            "px-3 py-1 text-sm rounded-md",
            sub === "bank"
              ? "bg-bg-muted text-text-primary font-medium"
              : "text-text-secondary hover:text-text-primary",
          ].join(" ")}
        >
          Reimbursement bank account
        </button>
        <button
          onClick={() => setSub("plans")}
          className={[
            "px-3 py-1 text-sm rounded-md",
            sub === "plans"
              ? "bg-bg-muted text-text-primary font-medium"
              : "text-text-secondary hover:text-text-primary",
          ].join(" ")}
        >
          Pre-Rippling COBRA plans
        </button>
      </div>

      {sub === "bank" ? <BankSettings /> : <PrePlansSettings />}
    </div>
  );
}


function BankSettings() {
  const q = useCobraSettings();
  const patch = usePatchCobraSettings();
  const s = q.data;
  const [draft, setDraft] = useState<Partial<typeof s>>({});
  const [editing, setEditing] = useState(false);

  if (q.isLoading || !s) {
    return <div className="text-sm text-text-muted">Loading…</div>;
  }
  const current = { ...s, ...draft };

  const save = async () => {
    await patch.mutateAsync(draft);
    setDraft({});
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Reimbursement bank account</h2>
        <p className="text-sm text-text-muted mt-1">
          Set the account where collected COBRA premiums from employees will be deposited.
        </p>
      </div>

      <Card>
        {editing ? (
          <div className="space-y-3">
            <Labeled label="Payment method label">
              <input
                value={current.payment_method_label ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, payment_method_label: e.target.value })
                }
                className={inputCls}
                placeholder="ABC Inc. ****7890"
              />
            </Labeled>
            <Labeled label="Account last 4">
              <input
                value={current.bank_last4 ?? ""}
                maxLength={4}
                onChange={(e) =>
                  setDraft({ ...draft, bank_last4: e.target.value })
                }
                className={inputCls}
              />
            </Labeled>
            <div className="grid grid-cols-2 gap-3">
              <Labeled label="Grace period (days)">
                <input
                  type="number"
                  value={String(current.grace_period_days ?? 30)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      grace_period_days: Number(e.target.value) || 30,
                    })
                  }
                  className={inputCls}
                />
              </Labeled>
              <Labeled label="Election window (days)">
                <input
                  type="number"
                  value={String(current.election_window_days ?? 60)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      election_window_days: Number(e.target.value) || 60,
                    })
                  }
                  className={inputCls}
                />
              </Labeled>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => { setDraft({}); setEditing(false); }}
                className="px-3 py-1.5 text-sm border border-border rounded-lg text-text-secondary hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={patch.isPending}
                className="px-3 py-1.5 text-sm rounded-lg bg-[#7b2cbf] text-white hover:bg-[#5a189a] disabled:opacity-50"
              >
                {patch.isPending ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-text-muted">Payment method</div>
                <div className="text-sm font-medium text-text-primary">
                  🇺🇸 {current.payment_method_label ?? "Not configured"}
                </div>
                <div className="text-xs text-text-muted">
                  Grace period {current.grace_period_days} days · Election window{" "}
                  {current.election_window_days} days
                </div>
              </div>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="p-2 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-muted"
              aria-label="Edit payment method"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}


function PrePlansSettings() {
  const q = useCobraPrePlans();
  const add = useAddCobraPrePlan();
  const del = useDeleteCobraPrePlan();
  const rows = q.data ?? [];
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    carrier: "",
    plan_name: "",
    plan_kind: "medical",
    monthly_premium: "",
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Pre-Rippling COBRA plans</h2>
        <p className="text-sm text-text-muted mt-1">
          Legacy plans that were active before Rippling onboarding. Used for
          reporting + historical reference only.
        </p>
      </div>

      <Card className="p-0">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="text-sm font-semibold text-text-primary">
            Plans · {rows.length}
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[#7b2cbf] text-white hover:bg-[#5a189a]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add plan
          </button>
        </header>

        {open && (
          <div className="p-5 border-b border-border bg-violet-500/5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input
                value={draft.carrier}
                onChange={(e) => setDraft({ ...draft, carrier: e.target.value })}
                placeholder="Carrier (e.g. Aetna)"
                className={inputCls}
              />
              <input
                value={draft.plan_name}
                onChange={(e) => setDraft({ ...draft, plan_name: e.target.value })}
                placeholder="Plan name"
                className={inputCls}
              />
              <select
                value={draft.plan_kind}
                onChange={(e) => setDraft({ ...draft, plan_kind: e.target.value })}
                className={inputCls}
              >
                <option value="medical">Medical</option>
                <option value="dental">Dental</option>
                <option value="vision">Vision</option>
              </select>
              <input
                type="number"
                value={draft.monthly_premium}
                onChange={(e) => setDraft({ ...draft, monthly_premium: e.target.value })}
                placeholder="Monthly premium"
                className={inputCls}
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={async () => {
                  if (!draft.carrier || !draft.plan_name) return;
                  await add.mutateAsync({
                    carrier: draft.carrier,
                    plan_name: draft.plan_name,
                    plan_kind: draft.plan_kind,
                    monthly_premium: draft.monthly_premium
                      ? Number(draft.monthly_premium)
                      : undefined,
                  });
                  setOpen(false);
                  setDraft({ carrier: "", plan_name: "", plan_kind: "medical", monthly_premium: "" });
                }}
                disabled={!draft.carrier || !draft.plan_name || add.isPending}
                className="px-3 py-1.5 text-sm rounded-lg bg-[#7b2cbf] text-white hover:bg-[#5a189a] disabled:opacity-50"
              >
                Save plan
              </button>
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 text-sm border border-border rounded-lg text-text-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {q.isLoading ? (
          <div className="p-6 text-sm text-text-muted">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-text-muted">
            No pre-Rippling plans recorded.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((p: CobraPrePlan) => (
              <li key={p.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-text-primary">
                    {p.carrier} — {p.plan_name}
                  </div>
                  <div className="text-xs text-text-muted capitalize">
                    {p.plan_kind} · {fmtMoney(p.monthly_premium)}/mo ·{" "}
                    {fmtDate(p.effective_from)} → {fmtDate(p.effective_to)}
                  </div>
                </div>
                <button
                  onClick={() => del.mutate(p.id)}
                  disabled={del.isPending}
                  className="p-1.5 rounded-md text-text-muted hover:text-rose-600 hover:bg-rose-500/10 disabled:opacity-50"
                  aria-label="Delete plan"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
