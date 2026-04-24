import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Mail,
  Search,
  ShieldCheck,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

import {
  usePayrollPeople,
  useRequestPayrollInfo,
  type PayrollPerson,
} from "../payrollPeopleApi";


type Bucket = "missing_details" | "payroll_ready" | "signatory";

const BUCKETS: {
  key: Bucket;
  label: string;
  badgeCls: string;
}[] = [
  {
    key: "missing_details",
    label: "Missing details",
    badgeCls: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
  },
  {
    key: "payroll_ready",
    label: "Payroll ready",
    badgeCls: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  },
  {
    key: "signatory",
    label: "Signatory status",
    badgeCls: "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30",
  },
];


const AVATAR_PALETTE = [
  "bg-violet-500/30 text-violet-200",
  "bg-sky-500/30 text-sky-200",
  "bg-emerald-500/30 text-emerald-200",
  "bg-amber-500/30 text-amber-200",
  "bg-rose-500/30 text-rose-200",
  "bg-fuchsia-500/30 text-fuchsia-200",
  "bg-indigo-500/30 text-indigo-200",
  "bg-teal-500/30 text-teal-200",
];


function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h << 5) - h + name.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}


function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((n) => n[0])
      .filter((c) => c && /[A-Za-z]/.test(c))
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}


function Avatar({ name }: { name: string }) {
  const cls = AVATAR_PALETTE[hashName(name) % AVATAR_PALETTE.length];
  return (
    <div
      className={
        "w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 " +
        cls
      }
    >
      {initialsOf(name)}
    </div>
  );
}


function EmployeeCell({ person }: { person: PayrollPerson }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar name={person.employee_name} />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white truncate">
          {person.employee_name}
        </div>
        {person.employee_title && (
          <div className="text-xs text-neutral-400 truncate">
            {person.employee_title}
          </div>
        )}
      </div>
    </div>
  );
}


function MissingFieldChips({ fields }: { fields: string | null }) {
  if (!fields) return <span className="text-xs text-neutral-500">—</span>;
  const parts = fields
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const shown = parts.slice(0, 3);
  const rest = parts.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((p) => (
        <span
          key={p}
          className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30"
        >
          {p}
        </span>
      ))}
      {rest > 0 && (
        <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
          +{rest} more
        </span>
      )}
    </div>
  );
}


type ChipTone = "rose" | "indigo" | "emerald" | "amber" | "neutral";


function Chip({ tone, children }: { tone: ChipTone; children: React.ReactNode }) {
  const cls: Record<ChipTone, string> = {
    rose: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
    indigo: "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30",
    emerald: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    amber: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
    neutral: "bg-neutral-800 text-neutral-300 border border-neutral-700",
  };
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full whitespace-nowrap " +
        cls[tone]
      }
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}


function StatusChip({ status }: { status: string }) {
  if (status === "action_needed")
    return <Chip tone="rose">Action needed</Chip>;
  if (status === "request_sent")
    return <Chip tone="indigo">Request sent</Chip>;
  if (status === "payroll_ready")
    return <Chip tone="emerald">Ready for payroll</Chip>;
  if (status === "missing_details")
    return <Chip tone="rose">Missing details</Chip>;
  if (status === "signatory_required")
    return <Chip tone="amber">Signatory required</Chip>;
  const label = status.replace(/_/g, " ");
  return (
    <Chip tone="neutral">
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </Chip>
  );
}


function SignatoryChip({ status }: { status: string | null }) {
  if (status === "pending_approval")
    return <Chip tone="amber">Pending approval</Chip>;
  if (status === "completed") return <Chip tone="emerald">Approved</Chip>;
  return <Chip tone="neutral">—</Chip>;
}


function primaryBtnCls() {
  return "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-amber-500 text-neutral-900 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition";
}
function ghostBtnCls() {
  return "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-700 text-neutral-400 cursor-not-allowed";
}
function secondaryBtnCls() {
  return "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-700 bg-neutral-800/40 text-neutral-200 hover:border-indigo-500/60 hover:text-white transition";
}


function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-t border-neutral-800 animate-pulse">
      <div className="w-9 h-9 rounded-full bg-neutral-800" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-48 bg-neutral-800 rounded" />
        <div className="h-2 w-32 bg-neutral-800 rounded" />
      </div>
      <div className="h-5 w-20 bg-neutral-800 rounded-full" />
      <div className="h-7 w-24 bg-neutral-800 rounded-md" />
    </div>
  );
}


function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="p-10 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-rose-500/15 text-rose-300 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div className="text-sm font-medium text-white">
        Something went wrong loading payroll people
      </div>
      <div className="text-xs text-neutral-400 mt-1">
        Check your connection and try again.
      </div>
      <button onClick={onRetry} className={"mt-4 " + secondaryBtnCls()}>
        Retry
      </button>
    </div>
  );
}


function EmptyPanel({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="p-12 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-sm font-medium text-white">{title}</div>
      <div className="text-xs text-neutral-400 mt-1">{subtitle}</div>
    </div>
  );
}


function filterBySearch(rows: PayrollPerson[], q: string): PayrollPerson[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((r) =>
    r.employee_name.toLowerCase().includes(needle),
  );
}


export function PayrollPeoplePage() {
  const [bucket, setBucket] = useState<Bucket>("missing_details");
  const [search, setSearch] = useState("");

  // Query each bucket so we can show real badge counts at all times.
  const missingQ = usePayrollPeople("missing_details");
  const readyQ = usePayrollPeople("payroll_ready");
  const signatoryQ = usePayrollPeople("signatory");

  const counts = {
    missing_details: missingQ.data?.length ?? 0,
    payroll_ready: readyQ.data?.length ?? 0,
    signatory: signatoryQ.data?.length ?? 0,
  };

  const activeQuery =
    bucket === "missing_details"
      ? missingQ
      : bucket === "payroll_ready"
        ? readyQ
        : signatoryQ;

  const rows = useMemo(
    () => filterBySearch(activeQuery.data ?? [], search),
    [activeQuery.data, search],
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <div className="p-6 max-w-7xl mx-auto">
        <header>
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">People</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Manage payroll readiness for your employees.
          </p>
        </header>

        <nav className="mt-6 border-b border-neutral-800 flex flex-wrap gap-1">
          {BUCKETS.map((b) => {
            const active = b.key === bucket;
            const count = counts[b.key];
            return (
              <button
                key={b.key}
                onClick={() => setBucket(b.key)}
                className={[
                  "px-4 py-2.5 text-sm border-b-2 -mb-px transition flex items-center gap-2",
                  active
                    ? "border-indigo-500 text-white font-medium"
                    : "border-transparent text-neutral-400 hover:text-neutral-200",
                ].join(" ")}
              >
                {b.label}
                <span
                  className={[
                    "inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-[11px] font-semibold",
                    b.badgeCls,
                  ].join(" ")}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="mt-5 flex items-center gap-3">
          <div className="relative w-80 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people"
              className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-800 rounded-lg bg-neutral-900 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500/60"
            />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
          {activeQuery.isLoading ? (
            <div>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : activeQuery.isError ? (
            <ErrorCard onRetry={() => activeQuery.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyBucket bucket={bucket} hasSearch={search.trim().length > 0} />
          ) : bucket === "missing_details" ? (
            <MissingDetailsTable rows={rows} />
          ) : bucket === "payroll_ready" ? (
            <PayrollReadyTable rows={rows} />
          ) : (
            <SignatoryTable rows={rows} />
          )}
        </div>
      </div>
    </div>
  );
}


function EmptyBucket({
  bucket,
  hasSearch,
}: {
  bucket: Bucket;
  hasSearch: boolean;
}) {
  if (hasSearch) {
    return (
      <EmptyPanel
        icon={Search}
        title="No matches for your search"
        subtitle="Try a different name or clear the search to see everyone in this bucket."
      />
    );
  }
  if (bucket === "payroll_ready") {
    return (
      <EmptyPanel
        icon={UserCheck}
        title="No people in this bucket"
        subtitle="Employees appear here once their profiles are complete and ready for payroll."
      />
    );
  }
  if (bucket === "signatory") {
    return (
      <EmptyPanel
        icon={ShieldCheck}
        title="No people in this bucket"
        subtitle="Signatory approvals will show up here when a signature is required."
      />
    );
  }
  return (
    <EmptyPanel
      icon={AlertTriangle}
      title="No people in this bucket"
      subtitle="Nobody needs their payroll details requested right now."
    />
  );
}


// ─── Missing details ──────────────────────────────────────────

function MissingDetailsTable({ rows }: { rows: PayrollPerson[] }) {
  const reqMut = useRequestPayrollInfo();

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-neutral-400">
            <tr>
              <th className="text-left font-medium px-5 py-3">Employee</th>
              <th className="text-left font-medium px-5 py-3">Pay schedule</th>
              <th className="text-left font-medium px-5 py-3">
                Missing fields
              </th>
              <th className="text-left font-medium px-5 py-3">Status</th>
              <th className="text-right font-medium px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-t border-neutral-800 hover:bg-neutral-800/40 transition"
              >
                <td className="px-5 py-4">
                  <EmployeeCell person={r} />
                </td>
                <td className="px-5 py-4 text-neutral-200">
                  {r.pay_schedule ?? "—"}
                </td>
                <td className="px-5 py-4">
                  <MissingFieldChips fields={r.missing_fields} />
                </td>
                <td className="px-5 py-4">
                  <StatusChip status={r.status} />
                </td>
                <td className="px-5 py-4 text-right">
                  <MissingDetailsAction
                    person={r}
                    onRequest={() => reqMut.mutate(r.id)}
                    pending={reqMut.isPending}
                    error={reqMut.isError}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <ul className="md:hidden divide-y divide-neutral-800">
        {rows.map((r) => (
          <li key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <EmployeeCell person={r} />
              <StatusChip status={r.status} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <div>
                <dt className="text-neutral-500 uppercase tracking-wide">
                  Pay schedule
                </dt>
                <dd className="text-neutral-200 mt-0.5">
                  {r.pay_schedule ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500 uppercase tracking-wide">
                  Missing
                </dt>
                <dd className="mt-0.5">
                  <MissingFieldChips fields={r.missing_fields} />
                </dd>
              </div>
            </dl>
            <div className="mt-3 flex justify-end">
              <MissingDetailsAction
                person={r}
                onRequest={() => reqMut.mutate(r.id)}
                pending={reqMut.isPending}
                error={reqMut.isError}
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}


function MissingDetailsAction({
  person,
  onRequest,
  pending,
  error,
}: {
  person: PayrollPerson;
  onRequest: () => void;
  pending: boolean;
  error: boolean;
}) {
  if (person.status === "request_sent") {
    return (
      <button type="button" disabled className={ghostBtnCls()}>
        <Mail className="w-3.5 h-3.5" />
        Request sent
      </button>
    );
  }
  if (person.status === "action_needed") {
    return (
      <div className="inline-flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={onRequest}
          disabled={pending}
          className={primaryBtnCls()}
        >
          <Mail className="w-3.5 h-3.5" />
          {pending ? "Sending…" : "Request info"}
        </button>
        {error && (
          <span className="text-[11px] text-rose-400">
            Failed — try again
          </span>
        )}
      </div>
    );
  }
  return null;
}


// ─── Payroll ready ────────────────────────────────────────────

function PayrollReadyTable({ rows }: { rows: PayrollPerson[] }) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-neutral-400">
            <tr>
              <th className="text-left font-medium px-5 py-3">Employee</th>
              <th className="text-left font-medium px-5 py-3">Pay schedule</th>
              <th className="text-left font-medium px-5 py-3">Status</th>
              <th className="text-right font-medium px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-t border-neutral-800 hover:bg-neutral-800/40 transition"
              >
                <td className="px-5 py-4">
                  <EmployeeCell person={r} />
                </td>
                <td className="px-5 py-4 text-neutral-200">
                  {r.pay_schedule ?? "—"}
                </td>
                <td className="px-5 py-4">
                  <Chip tone="emerald">Ready for payroll</Chip>
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    className={secondaryBtnCls()}
                    onClick={() => {
                      /* no-op for now */
                    }}
                  >
                    View details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <ul className="md:hidden divide-y divide-neutral-800">
        {rows.map((r) => (
          <li key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <EmployeeCell person={r} />
              <Chip tone="emerald">Ready</Chip>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-neutral-400">
                {r.pay_schedule ?? "—"}
              </span>
              <button
                type="button"
                className={secondaryBtnCls()}
                onClick={() => {
                  /* no-op for now */
                }}
              >
                View details
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}


// ─── Signatory ────────────────────────────────────────────────

function SignatoryTable({ rows }: { rows: PayrollPerson[] }) {
  const reqMut = useRequestPayrollInfo();

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-neutral-400">
            <tr>
              <th className="text-left font-medium px-5 py-3">Employee</th>
              <th className="text-left font-medium px-5 py-3">
                Signatory status
              </th>
              <th className="text-right font-medium px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-t border-neutral-800 hover:bg-neutral-800/40 transition"
              >
                <td className="px-5 py-4">
                  <EmployeeCell person={r} />
                </td>
                <td className="px-5 py-4">
                  <SignatoryChip status={r.signatory_status} />
                </td>
                <td className="px-5 py-4 text-right">
                  <SignatoryAction
                    person={r}
                    onRemind={() => reqMut.mutate(r.id)}
                    pending={reqMut.isPending}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden divide-y divide-neutral-800">
        {rows.map((r) => (
          <li key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <EmployeeCell person={r} />
              <SignatoryChip status={r.signatory_status} />
            </div>
            <div className="mt-3 flex justify-end">
              <SignatoryAction
                person={r}
                onRemind={() => reqMut.mutate(r.id)}
                pending={reqMut.isPending}
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}


function SignatoryAction({
  person,
  onRemind,
  pending,
}: {
  person: PayrollPerson;
  onRemind: () => void;
  pending: boolean;
}) {
  if (person.signatory_status === "pending_approval") {
    return (
      <button
        type="button"
        onClick={onRemind}
        disabled={pending}
        className={primaryBtnCls()}
      >
        <Mail className="w-3.5 h-3.5" />
        {pending ? "Sending…" : "Remind"}
      </button>
    );
  }
  return (
    <span className="text-xs text-neutral-500">No action needed</span>
  );
}
