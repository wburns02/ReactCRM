import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Download,
  Search,
  Filter,
  Building,
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Trash2,
  RefreshCw,
  Wallet,
  Users,
  Receipt,
  Landmark,
  CreditCard,
  CheckCheck,
  BookOpen,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";

import {
  useAddFsaExclusion,
  useDeleteFsaExclusion,
  useFsaComplianceTests,
  useFsaDocuments,
  useFsaEnrollments,
  useFsaExclusions,
  useFsaOverview,
  useFsaPlans,
  useFsaSettings,
  useFsaTransactions,
  usePatchFsaPlan,
  usePatchFsaSettings,
  usePatchFsaTransaction,
  useRunFsaCompliance,
  type FsaComplianceTest,
  type FsaEnrollment,
  type FsaExclusion,
  type FsaPlan,
  type FsaTransaction,
} from "../fsaApi";


type TabKey = "overview" | "settings" | "plans" | "transactions" | "compliance";


const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "settings", label: "Settings" },
  { key: "plans", label: "Plans" },
  { key: "transactions", label: "Transactions" },
  { key: "compliance", label: "Compliance" },
];


const PLAN_KIND_LABEL: Record<string, string> = {
  healthcare: "Healthcare FSA",
  dependent_care: "Dependent Care FSA",
  limited_purpose: "Limited Purpose FSA",
};


function toNum(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isNaN(n) ? 0 : n;
}


function fmtMoney(v: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(toNum(v));
}


function fmtMoney2(v: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(toNum(v));
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


export function FsaPage() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<TabKey>(
    (params.get("tab") as TabKey) || "overview",
  );

  const switchTab = (next: TabKey) => {
    setTab(next);
    const p = new URLSearchParams(params);
    p.set("tab", next);
    setParams(p, { replace: true });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">FSA</h1>
        <p className="text-sm text-text-secondary mt-1">
          Flexible Spending Accounts — pre-tax savings for healthcare and
          dependent care.
        </p>
      </div>

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
        {tab === "overview" && <OverviewTab />}
        {tab === "settings" && <SettingsTab />}
        {tab === "plans" && <PlansTab />}
        {tab === "transactions" && <TransactionsTab />}
        {tab === "compliance" && <ComplianceTab />}
      </div>
    </div>
  );
}


// ─── common bits ────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    active: { cls: "bg-emerald-500/10 text-emerald-600", label: "Active" },
    pending: { cls: "bg-amber-500/10 text-amber-600", label: "Pending" },
    declined: { cls: "bg-neutral-500/10 text-neutral-600", label: "Declined" },
    terminated: { cls: "bg-rose-500/10 text-rose-600", label: "Terminated" },
    approved: { cls: "bg-emerald-500/10 text-emerald-600", label: "Approved" },
    denied: { cls: "bg-rose-500/10 text-rose-600", label: "Denied" },
    substantiation_required: {
      cls: "bg-amber-500/10 text-amber-600",
      label: "Receipt needed",
    },
    passed: { cls: "bg-emerald-500/10 text-emerald-600", label: "Passed" },
    failed: { cls: "bg-rose-500/10 text-rose-600", label: "Failed" },
    warning: { cls: "bg-amber-500/10 text-amber-600", label: "Warning" },
  };
  const m = map[status] ?? { cls: "bg-neutral-500/10 text-neutral-600", label: status };
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full " +
        m.cls
      }
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {m.label}
    </span>
  );
}


function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((n) => n[0])
    .filter((c) => c && /[A-Za-z]/.test(c))
    .slice(0, 2)
    .join("");
  return (
    <div className="w-9 h-9 rounded-full bg-violet-500/10 text-violet-600 flex items-center justify-center text-xs font-medium shrink-0">
      {initials || "?"}
    </div>
  );
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


// ─── Overview tab ───────────────────────────────────────────

function OverviewTab() {
  const ov = useFsaOverview();
  const s = ov.data;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total enrollments"
          value={s?.total_enrollments ?? "—"}
          hint={`${s?.active_enrollments ?? "—"} active, ${s?.pending_enrollments ?? "—"} pending`}
          icon={Users}
          accent="violet"
        />
        <StatCard
          label="YTD contributed"
          value={s ? fmtMoney(s.total_ytd_contributed) : "—"}
          hint="Employee + employer dollars"
          icon={Wallet}
          accent="emerald"
        />
        <StatCard
          label="YTD spent"
          value={s ? fmtMoney(s.total_ytd_spent) : "—"}
          hint="Claims + card swipes"
          icon={Receipt}
          accent="blue"
        />
        <StatCard
          label="Remaining balance"
          value={s ? fmtMoney(s.remaining_balance) : "—"}
          hint="Available for use"
          icon={CheckCheck}
          accent="amber"
        />
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-0">
          <header className="px-5 py-3 border-b border-border">
            <div className="text-sm font-semibold text-text-primary">
              Employee status
            </div>
            <div className="text-xs text-text-muted">
              Snapshot of current plan year
            </div>
          </header>
          <ul className="divide-y divide-border">
            <StatusRow
              label="Active"
              value={s?.active_enrollments ?? 0}
              icon={CheckCircle2}
              accent="emerald"
            />
            <StatusRow
              label="Pending enrollment"
              value={s?.pending_enrollments ?? 0}
              icon={Clock}
              accent="amber"
            />
            <StatusRow
              label="Declined"
              value={s?.declined_enrollments ?? 0}
              icon={XCircle}
              accent="rose"
            />
          </ul>
        </Card>

        <Card className="p-0">
          <header className="px-5 py-3 border-b border-border">
            <div className="text-sm font-semibold text-text-primary">
              By plan kind
            </div>
          </header>
          {s && Object.keys(s.by_plan_kind).length > 0 ? (
            <ul className="divide-y divide-border">
              {Object.entries(s.by_plan_kind).map(([kind, n]) => (
                <li
                  key={kind}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <span className="text-sm text-text-primary">
                    {PLAN_KIND_LABEL[kind] ?? kind}
                  </span>
                  <span className="text-sm font-medium text-text-primary">
                    {n}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-sm text-text-muted">
              No plans active yet.
            </div>
          )}
        </Card>
      </div>

      <Card className="p-0">
        <header className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-text-primary">
              Quick actions
            </div>
            <div className="text-xs text-text-muted">
              {s?.transactions_last_30d ?? 0} transactions in the last 30 days
              {s?.last_compliance_status &&
                ` · Last compliance: ${s.last_compliance_status}`}
            </div>
          </div>
        </header>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickAction
            icon={Building}
            label="Funding bank"
            hint={
              s?.bank_configured
                ? "Configured ✓"
                : "Configure account →"
            }
            to="settings"
          />
          <QuickAction
            icon={FileText}
            label="Plans"
            hint="Edit limits and rules"
            to="plans"
          />
          <QuickAction
            icon={Receipt}
            label="Transactions"
            hint="Review & export"
            to="transactions"
          />
          <QuickAction
            icon={Shield}
            label="Run NDT"
            hint="Non-discrimination testing"
            to="compliance"
          />
        </div>
      </Card>
    </div>
  );
}


function StatCard({
  label, value, hint, icon: Icon, accent,
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: typeof Users;
  accent: "blue" | "violet" | "emerald" | "amber" | "rose";
}) {
  const cls: Record<string, { bg: string; tx: string }> = {
    blue: { bg: "bg-blue-500/10", tx: "text-blue-500" },
    violet: { bg: "bg-violet-500/10", tx: "text-violet-500" },
    emerald: { bg: "bg-emerald-500/10", tx: "text-emerald-500" },
    amber: { bg: "bg-amber-500/10", tx: "text-amber-500" },
    rose: { bg: "bg-rose-500/10", tx: "text-rose-500" },
  };
  const a = cls[accent];
  return (
    <Card className="stat-card">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-text-secondary">{label}</p>
            <p className="text-3xl font-bold text-text-primary mt-1">{value}</p>
            <p className="text-xs text-text-muted mt-1">{hint}</p>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${a.bg}`}>
            <Icon className={`w-5 h-5 ${a.tx}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


function StatusRow({
  label, value, icon: Icon, accent,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  accent: "emerald" | "amber" | "rose";
}) {
  const cls: Record<string, { bg: string; tx: string }> = {
    emerald: { bg: "bg-emerald-500/10", tx: "text-emerald-600" },
    amber: { bg: "bg-amber-500/10", tx: "text-amber-600" },
    rose: { bg: "bg-rose-500/10", tx: "text-rose-600" },
  };
  const a = cls[accent];
  return (
    <li className="flex items-center justify-between px-5 py-3">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${a.bg}`}>
          <Icon className={`w-4 h-4 ${a.tx}`} />
        </div>
        <span className="text-sm text-text-primary">{label}</span>
      </div>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </li>
  );
}


function QuickAction({
  icon: Icon,
  label,
  hint,
  to,
}: {
  icon: typeof Users;
  label: string;
  hint: string;
  to: string;
}) {
  const [, setParams] = useSearchParams();
  return (
    <button
      onClick={() => setParams({ tab: to }, { replace: true })}
      className="flex items-start gap-3 text-left p-3 rounded-lg border border-border bg-bg-card hover:border-[#c77dff] hover:-translate-y-0.5 transition"
    >
      <div className="w-9 h-9 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-text-primary">{label}</div>
        <div className="text-xs text-text-muted">{hint}</div>
      </div>
    </button>
  );
}


// ─── Settings tab ───────────────────────────────────────────

function SettingsTab() {
  const q = useFsaSettings();
  const patch = usePatchFsaSettings();
  const docs = useFsaDocuments();
  const s = q.data;
  const [draft, setDraft] = useState<Partial<typeof s>>({});

  if (q.isLoading || !s) {
    return <div className="p-6 text-sm text-text-muted">Loading…</div>;
  }

  const current = { ...s, ...draft };

  const isDirty = Object.keys(draft).length > 0;

  const save = async () => {
    await patch.mutateAsync(draft);
    setDraft({});
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <Card>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-text-primary">
                Funding bank account
              </div>
              <p className="text-sm text-text-muted mt-0.5">
                Rippling pulls employer contributions and reimbursements from
                this account. Only the last 4 digits are stored.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Labeled label="Bank name">
              <input
                value={current.bank_name ?? ""}
                onChange={(e) => setDraft({ ...draft, bank_name: e.target.value })}
                className={inputCls}
                placeholder="Pacific Western Bank"
              />
            </Labeled>
            <Labeled label="Account type">
              <select
                value={current.bank_account_type ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, bank_account_type: e.target.value })
                }
                className={inputCls}
              >
                <option value="">Select…</option>
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
            </Labeled>
            <Labeled label="Account last 4">
              <input
                value={current.bank_account_last4 ?? ""}
                maxLength={4}
                onChange={(e) =>
                  setDraft({ ...draft, bank_account_last4: e.target.value })
                }
                className={inputCls}
                placeholder="4472"
              />
            </Labeled>
            <Labeled label="Routing last 4">
              <input
                value={current.bank_routing_last4 ?? ""}
                maxLength={4}
                onChange={(e) =>
                  setDraft({ ...draft, bank_routing_last4: e.target.value })
                }
                className={inputCls}
                placeholder="9081"
              />
            </Labeled>
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-text-primary">
                Eligibility rules
              </div>
              <p className="text-sm text-text-muted mt-0.5">
                Who qualifies for FSA enrollment.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Labeled label="Waiting period (days)">
              <input
                type="number"
                value={String(current.eligibility_waiting_days ?? 0)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    eligibility_waiting_days: Number(e.target.value) || 0,
                  })
                }
                className={inputCls}
              />
            </Labeled>
            <Labeled label="Minimum hours per week">
              <input
                type="number"
                value={String(current.eligibility_min_hours ?? 30)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    eligibility_min_hours: Number(e.target.value) || 0,
                  })
                }
                className={inputCls}
              />
            </Labeled>
          </div>
          <div className="mt-3">
            <Labeled label="Additional eligibility rule">
              <textarea
                rows={3}
                value={current.eligibility_rule ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, eligibility_rule: e.target.value })
                }
                className={inputCls}
                placeholder="Employees classified as full-time (>=30 hrs/wk) after waiting period."
              />
            </Labeled>
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-text-primary">
                Card & substantiation
              </div>
              <p className="text-sm text-text-muted mt-0.5">
                Debit card issuance + auto-substantiation behavior.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <ToggleRow
              label="Issue FSA debit cards"
              checked={current.debit_card_enabled ?? false}
              onChange={(v) => setDraft({ ...draft, debit_card_enabled: v })}
            />
            <ToggleRow
              label="Auto-substantiate Rx & copays"
              checked={current.auto_substantiation_enabled ?? false}
              onChange={(v) =>
                setDraft({ ...draft, auto_substantiation_enabled: v })
              }
            />
          </div>
        </Card>

        {isDirty && (
          <div className="sticky bottom-4 z-10">
            <Card className="shadow-lg flex items-center justify-between gap-3 p-4 bg-violet-500/5 border-[#c77dff]">
              <div className="text-sm text-text-primary">
                You have unsaved FSA settings changes.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDraft({})}
                  className="px-3 py-1.5 text-sm border border-border rounded-lg text-text-secondary hover:text-text-primary"
                >
                  Discard
                </button>
                <button
                  onClick={save}
                  disabled={patch.isPending}
                  className="px-3 py-1.5 text-sm rounded-lg bg-[#7b2cbf] text-white hover:bg-[#5a189a] disabled:opacity-50"
                >
                  {patch.isPending ? "Saving…" : "Save changes"}
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>

      <aside>
        <Card className="p-0">
          <header className="px-5 py-3 border-b border-border flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-violet-500" />
            <div className="text-sm font-semibold text-text-primary">
              Documents & help docs
            </div>
          </header>
          {docs.isLoading ? (
            <div className="p-5 text-sm text-text-muted">Loading…</div>
          ) : (docs.data ?? []).length === 0 ? (
            <div className="p-5 text-sm text-text-muted">
              No documents uploaded yet.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {(docs.data ?? []).map((d) => (
                <li key={d.id} className="p-4">
                  <a
                    href={d.url ?? "#"}
                    target="_blank"
                    rel="noopener"
                    className="text-sm font-medium text-text-primary hover:text-[#7b2cbf]"
                  >
                    {d.title}
                  </a>
                  <div className="text-xs text-text-muted capitalize">
                    {d.kind.replace(/_/g, " ")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </aside>
    </div>
  );
}


const inputCls =
  "w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg-card text-text-primary";


function Labeled({
  label, children,
}: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-text-muted block mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}


function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-primary">{label}</span>
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={
          "relative inline-flex h-6 w-11 items-center rounded-full transition cursor-pointer " +
          (checked ? "bg-[#7b2cbf]" : "bg-neutral-300")
        }
      >
        <span
          className={
            "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition " +
            (checked ? "translate-x-5" : "translate-x-0.5")
          }
        />
      </button>
    </div>
  );
}


// ─── Plans tab ──────────────────────────────────────────────

function PlansTab() {
  const q = useFsaPlans();
  const rows = q.data ?? [];
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      {q.isLoading ? (
        <div className="text-sm text-text-muted">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-text-muted">No FSA plans configured.</div>
      ) : (
        rows.map((p) => <PlanCard key={p.id} plan={p} />)
      )}
    </div>
  );
}


function PlanCard({ plan }: { plan: FsaPlan }) {
  const patch = usePatchFsaPlan();
  const [draft, setDraft] = useState<Partial<FsaPlan>>({});
  const current = { ...plan, ...draft } as FsaPlan;
  const dirty = Object.keys(draft).length > 0;

  const save = async () => {
    const keep: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(draft)) {
      keep[k] = v;
    }
    await patch.mutateAsync({ id: plan.id, ...keep });
    setDraft({});
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-text-muted">
            {PLAN_KIND_LABEL[plan.kind] ?? plan.kind}
          </div>
          <div className="text-base font-semibold text-text-primary">
            {current.name}
          </div>
        </div>
        <span
          className={
            "text-xs px-2 py-0.5 rounded-full " +
            (current.is_active
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-neutral-500/10 text-neutral-600")
          }
        >
          {current.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="space-y-3">
        <Labeled label="Annual election limit (employee)">
          <input
            type="number"
            value={String(toNum(current.annual_limit_employee))}
            onChange={(e) =>
              setDraft({ ...draft, annual_limit_employee: e.target.value as unknown as FsaPlan["annual_limit_employee"] })
            }
            className={inputCls}
          />
        </Labeled>
        {plan.kind === "dependent_care" && (
          <Labeled label="Family limit">
            <input
              type="number"
              value={String(toNum(current.annual_limit_family))}
              onChange={(e) =>
                setDraft({ ...draft, annual_limit_family: e.target.value as unknown as FsaPlan["annual_limit_family"] })
              }
              className={inputCls}
            />
          </Labeled>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Labeled label="Plan year start">
            <input
              type="date"
              value={current.plan_year_start ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, plan_year_start: e.target.value })
              }
              className={inputCls}
            />
          </Labeled>
          <Labeled label="Plan year end">
            <input
              type="date"
              value={current.plan_year_end ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, plan_year_end: e.target.value })
              }
              className={inputCls}
            />
          </Labeled>
        </div>
        <ToggleRow
          label="Grace period"
          checked={current.grace_period_enabled}
          onChange={(v) => setDraft({ ...draft, grace_period_enabled: v })}
        />
        {current.grace_period_enabled && (
          <Labeled label="Grace period months">
            <input
              type="number"
              value={String(current.grace_period_months)}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  grace_period_months: Number(e.target.value) || 0,
                })
              }
              className={inputCls}
            />
          </Labeled>
        )}
        <ToggleRow
          label="Rollover enabled"
          checked={current.rollover_enabled}
          onChange={(v) => setDraft({ ...draft, rollover_enabled: v })}
        />
        {current.rollover_enabled && (
          <Labeled label="Rollover max ($)">
            <input
              type="number"
              value={String(toNum(current.rollover_max))}
              onChange={(e) =>
                setDraft({ ...draft, rollover_max: e.target.value as unknown as FsaPlan["rollover_max"] })
              }
              className={inputCls}
            />
          </Labeled>
        )}
        <Labeled label="Claims run-out (days)">
          <input
            type="number"
            value={String(current.runout_days)}
            onChange={(e) =>
              setDraft({ ...draft, runout_days: Number(e.target.value) || 0 })
            }
            className={inputCls}
          />
        </Labeled>
      </div>

      {dirty && (
        <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-3">
          <button
            onClick={() => setDraft({})}
            className="px-3 py-1.5 text-sm border border-border rounded-lg text-text-secondary hover:text-text-primary"
          >
            Discard
          </button>
          <button
            onClick={save}
            disabled={patch.isPending}
            className="px-3 py-1.5 text-sm rounded-lg bg-[#7b2cbf] text-white hover:bg-[#5a189a] disabled:opacity-50"
          >
            {patch.isPending ? "Saving…" : "Save plan"}
          </button>
        </div>
      )}
    </Card>
  );
}


// ─── Transactions tab ───────────────────────────────────────

function TransactionsTab() {
  const [status, setStatus] = useState("");
  const [planKind, setPlanKind] = useState("");
  const [kind, setKind] = useState("");
  const [search, setSearch] = useState("");

  const q = useFsaTransactions({
    status: status || undefined,
    plan_kind: planKind || undefined,
    kind: kind || undefined,
    q: search.trim() || undefined,
  });
  const rows = q.data ?? [];
  const patch = usePatchFsaTransaction();

  return (
    <Card className="p-0">
      <header className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-text-primary">
            FSA transactions · {rows.length}
          </div>
          <div className="text-xs text-text-muted">
            Card swipes + reimbursements across all plans
          </div>
        </div>
        <button
          onClick={() =>
            downloadCsv(
              rows.map((r) => ({
                date: r.transaction_date,
                employee: r.employee_name,
                plan_kind: r.plan_kind,
                merchant: r.merchant ?? "",
                category: r.category ?? "",
                kind: r.kind,
                amount: toNum(r.amount).toFixed(2),
                status: r.status,
                notes: r.notes ?? "",
              })),
              `fsa-transactions-${Date.now()}.csv`,
            )
          }
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:border-[#c77dff] text-text-primary bg-bg-card"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </header>

      <div className="px-5 py-3 border-b border-border flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee / merchant / category"
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-bg-card text-text-primary"
          />
        </div>
        <select
          value={planKind}
          onChange={(e) => setPlanKind(e.target.value)}
          className={`${inputCls} max-w-[160px]`}
        >
          <option value="">All plans</option>
          <option value="healthcare">Healthcare</option>
          <option value="dependent_care">Dependent care</option>
          <option value="limited_purpose">Limited purpose</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={`${inputCls} max-w-[180px]`}
        >
          <option value="">All statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="substantiation_required">Receipt needed</option>
          <option value="denied">Denied</option>
        </select>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className={`${inputCls} max-w-[160px]`}
        >
          <option value="">All kinds</option>
          <option value="card_swipe">Card swipe</option>
          <option value="reimbursement">Reimbursement</option>
          <option value="adjustment">Adjustment</option>
        </select>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg text-text-secondary hover:text-text-primary">
          <Filter className="w-3.5 h-3.5" />
          Filter
        </button>
      </div>

      {q.isLoading ? (
        <div className="p-10 text-center text-sm text-text-muted">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center text-sm text-text-muted">
          No transactions match these filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="text-left font-medium px-5 py-3">Date</th>
                <th className="text-left font-medium px-5 py-3">Employee</th>
                <th className="text-left font-medium px-5 py-3">Merchant</th>
                <th className="text-left font-medium px-5 py-3">Plan</th>
                <th className="text-right font-medium px-5 py-3">Amount</th>
                <th className="text-left font-medium px-5 py-3">Kind</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <TxRow key={r.id} row={r} onPatch={patch.mutate} pending={patch.isPending} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}


function TxRow({
  row,
  onPatch,
  pending,
}: {
  row: FsaTransaction;
  onPatch: (args: { id: string; status?: string }) => void;
  pending: boolean;
}) {
  return (
    <tr className="border-b border-border/60 hover:bg-bg-muted transition">
      <td className="px-5 py-3 text-text-secondary">
        {fmtDate(row.transaction_date)}
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={row.employee_name} />
          <div className="font-medium text-text-primary truncate">
            {row.employee_name}
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        <div className="text-text-primary">{row.merchant ?? "—"}</div>
        {row.category && (
          <div className="text-xs text-text-muted">{row.category}</div>
        )}
      </td>
      <td className="px-5 py-3 text-text-secondary capitalize">
        {row.plan_kind.replace(/_/g, " ")}
      </td>
      <td className="px-5 py-3 text-right font-medium text-text-primary">
        {fmtMoney2(row.amount)}
      </td>
      <td className="px-5 py-3 text-text-secondary capitalize">
        {row.kind.replace(/_/g, " ")}
      </td>
      <td className="px-5 py-3">
        <StatusPill status={row.status} />
      </td>
      <td className="px-5 py-3">
        {(row.status === "pending" ||
          row.status === "substantiation_required") && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPatch({ id: row.id, status: "approved" })}
              disabled={pending}
              className="px-2 py-1 text-xs rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => onPatch({ id: row.id, status: "denied" })}
              disabled={pending}
              className="px-2 py-1 text-xs rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 disabled:opacity-50"
            >
              Deny
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}


// ─── Compliance tab ─────────────────────────────────────────

function ComplianceTab() {
  const tests = useFsaComplianceTests();
  const runTests = useRunFsaCompliance();
  const exclusions = useFsaExclusions();
  const addExcl = useAddFsaExclusion();
  const delExcl = useDeleteFsaExclusion();
  const enrollments = useFsaEnrollments({});

  const latestByKind = useMemo(() => {
    const m = new Map<string, FsaComplianceTest>();
    for (const t of tests.data ?? []) {
      if (!m.has(t.test_kind)) m.set(t.test_kind, t);
    }
    return m;
  }, [tests.data]);

  const [exclName, setExclName] = useState("");
  const [exclReason, setExclReason] = useState("");
  const [exclFrom, setExclFrom] = useState("all");

  return (
    <div className="space-y-6">
      <Card className="p-0">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-text-primary">
              Non-discrimination tests (NDT)
            </div>
            <div className="text-xs text-text-muted">
              Ensures HCEs and key employees don't disproportionately benefit
              from the FSA.
            </div>
          </div>
          <button
            onClick={() => runTests.mutate()}
            disabled={runTests.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[#7b2cbf] text-white hover:bg-[#5a189a] disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${runTests.isPending ? "animate-spin" : ""}`}
            />
            {runTests.isPending ? "Running…" : "Run tests"}
          </button>
        </header>
        {tests.isLoading ? (
          <div className="p-6 text-sm text-text-muted">Loading…</div>
        ) : latestByKind.size === 0 ? (
          <div className="p-10 text-center text-sm text-text-muted">
            No test runs yet. Click "Run tests" to start.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {[...latestByKind.values()].map((t) => (
              <li key={t.id} className="p-5 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-text-primary capitalize">
                    {t.test_kind.replace(/_/g, " ")}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5">
                    Plan year {t.plan_year} · run {fmtDate(t.run_date)} ·
                    HCEs {t.highly_compensated_count} · NHCEs{" "}
                    {t.non_highly_compensated_count}
                  </div>
                  {t.failure_reason && (
                    <div className="mt-2 text-xs text-rose-600">
                      {t.failure_reason}
                    </div>
                  )}
                </div>
                <StatusPill status={t.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-0">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-text-primary">
              Employee classification
            </div>
            <div className="text-xs text-text-muted">
              Snapshot of who's enrolled and where
            </div>
          </div>
        </header>
        {enrollments.isLoading ? (
          <div className="p-6 text-sm text-text-muted">Loading…</div>
        ) : (enrollments.data ?? []).length === 0 ? (
          <div className="p-10 text-center text-sm text-text-muted">
            No enrollments.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Employee</th>
                  <th className="text-left font-medium px-5 py-3">Plan</th>
                  <th className="text-right font-medium px-5 py-3">Annual election</th>
                  <th className="text-right font-medium px-5 py-3">YTD spent</th>
                  <th className="text-left font-medium px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(enrollments.data ?? []).slice(0, 15).map((e: FsaEnrollment) => (
                  <tr
                    key={e.id}
                    className="border-b border-border/60 hover:bg-bg-muted transition"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={e.employee_name} />
                        <div className="font-medium text-text-primary">
                          {e.employee_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-text-primary">
                      {PLAN_KIND_LABEL[e.plan_kind] ?? e.plan_kind}
                    </td>
                    <td className="px-5 py-3 text-right text-text-primary">
                      {fmtMoney(e.annual_election)}
                    </td>
                    <td className="px-5 py-3 text-right text-text-primary">
                      {fmtMoney(e.ytd_spent)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill status={e.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-0">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-text-primary">
              Exclusions · {(exclusions.data ?? []).length}
            </div>
            <div className="text-xs text-text-muted">
              Employees manually excluded from FSA benefits.
            </div>
          </div>
        </header>

        <div className="p-4 border-b border-border bg-violet-500/5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              value={exclName}
              onChange={(e) => setExclName(e.target.value)}
              placeholder="Employee name"
              className={inputCls}
            />
            <input
              value={exclReason}
              onChange={(e) => setExclReason(e.target.value)}
              placeholder="Reason"
              className={inputCls}
            />
            <select
              value={exclFrom}
              onChange={(e) => setExclFrom(e.target.value)}
              className={inputCls}
            >
              <option value="all">All FSA plans</option>
              <option value="healthcare">Healthcare</option>
              <option value="dependent_care">Dependent care</option>
              <option value="limited_purpose">Limited purpose</option>
            </select>
            <button
              onClick={async () => {
                if (!exclName || !exclReason) return;
                await addExcl.mutateAsync({
                  employee_name: exclName,
                  reason: exclReason,
                  excluded_from: exclFrom,
                });
                setExclName("");
                setExclReason("");
                setExclFrom("all");
              }}
              disabled={!exclName || !exclReason || addExcl.isPending}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-[#7b2cbf] text-white hover:bg-[#5a189a] disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Add exclusion
            </button>
          </div>
        </div>

        {(exclusions.data ?? []).length === 0 ? (
          <div className="p-10 text-center text-sm text-text-muted">
            No exclusions.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {(exclusions.data ?? []).map((x: FsaExclusion) => (
              <li
                key={x.id}
                className="p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={x.employee_name} />
                  <div className="min-w-0">
                    <div className="font-medium text-text-primary truncate">
                      {x.employee_name}
                    </div>
                    <div className="text-xs text-text-muted truncate">
                      {x.reason} ·{" "}
                      <span className="capitalize">
                        {x.excluded_from.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => delExcl.mutate(x.id)}
                  disabled={delExcl.isPending}
                  className="p-1.5 rounded-md text-text-muted hover:text-rose-600 hover:bg-rose-500/10 disabled:opacity-50"
                  aria-label="Delete exclusion"
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
