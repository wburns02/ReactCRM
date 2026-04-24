import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  Info,
  Inbox,
  RefreshCcw,
  XCircle,
} from "lucide-react";

import {
  usePayRuns,
  useApprovePayRun,
  useArchivePayRun,
  usePatchPayRun,
  useSeedPayrollDemo,
  type PayRun,
} from "../payRunsApi";


type TabKey = "upcoming" | "paid" | "archived" | "failed";

const TABS: { key: TabKey; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "paid", label: "Paid" },
  { key: "archived", label: "Archived" },
  { key: "failed", label: "Failed" },
];


function fmtPayDate(d: string | null | undefined): string {
  if (!d) return "—";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}


function fmtApproveBy(d: string | null | undefined): string {
  if (!d) return "—";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return "—";
  const month = parsed.toLocaleDateString("en-US", { month: "short" });
  const day = parsed.getDate();
  let hours = parsed.getHours();
  const minutes = parsed.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const mm = minutes.toString().padStart(2, "0");
  return `${month} ${day}, ${hours}:${mm}${ampm}`;
}


function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}


function hoursUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return (parsed.getTime() - Date.now()) / (1000 * 60 * 60);
}


function StatusChip({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const map: Record<string, { cls: string; label: string }> = {
    upcoming: {
      cls: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      label: "Upcoming",
    },
    paid: {
      cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      label: "Paid",
    },
    archived: {
      cls: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
      label: "Archived",
    },
    failed: {
      cls: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      label: "Failed",
    },
  };
  const cfg = map[normalized] ?? {
    cls: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
    label: capitalize(normalized),
  };
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border " +
        cfg.cls
      }
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {cfg.label}
    </span>
  );
}


function TabBadge({ count, active }: { count: number; active: boolean }) {
  return (
    <span
      className={
        "ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[11px] rounded-full " +
        (active
          ? "bg-indigo-500/20 text-indigo-300"
          : "bg-neutral-800 text-neutral-400")
      }
    >
      {count}
    </span>
  );
}


function TableSkeleton() {
  return (
    <div className="divide-y divide-neutral-800">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-5 py-4 animate-pulse"
        >
          <div className="flex-1 space-y-2">
            <div className="h-3 w-40 rounded bg-neutral-800" />
            <div className="h-2.5 w-24 rounded bg-neutral-800/60" />
          </div>
          <div className="h-3 w-16 rounded bg-neutral-800 hidden md:block" />
          <div className="h-3 w-20 rounded bg-neutral-800 hidden md:block" />
          <div className="h-3 w-14 rounded bg-neutral-800 hidden md:block" />
          <div className="h-5 w-20 rounded-full bg-neutral-800" />
          <div className="h-8 w-28 rounded-lg bg-neutral-800" />
        </div>
      ))}
    </div>
  );
}


function ErrorInline({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mx-5 my-5 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
          <XCircle className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-neutral-100">
            Couldn't load pay runs
          </div>
          <div className="text-xs text-neutral-400 mt-0.5">{message}</div>
        </div>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-indigo-500/50 transition"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    </div>
  );
}


function EmptyState({
  tab,
  onSeed,
  seeding,
}: {
  tab: TabKey;
  onSeed: () => void;
  seeding: boolean;
}) {
  const copy: Record<TabKey, { title: string; sub: string; icon: typeof Inbox }> = {
    upcoming: {
      title: "No upcoming pay runs",
      sub: "When a new pay run is queued, it'll appear here for review and approval.",
      icon: Calendar,
    },
    paid: {
      title: "No paid pay runs",
      sub: "Pay runs you've approved will show up here after funding completes.",
      icon: CheckCircle2,
    },
    archived: {
      title: "No archived pay runs",
      sub: "Archived pay runs stay here for historical reference. Unarchive to re-queue.",
      icon: Archive,
    },
    failed: {
      title: "No failed pay runs",
      sub: "If a pay run hits an error during funding or submission, it'll land here.",
      icon: AlertTriangle,
    },
  };
  const c = copy[tab];
  const Icon = c.icon;
  return (
    <div className="py-16 px-6 text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-neutral-800 flex items-center justify-center">
        <Icon className="w-5 h-5 text-neutral-400" />
      </div>
      <div className="text-sm font-medium text-neutral-200">{c.title}</div>
      <div className="text-xs text-neutral-500 mt-1.5 max-w-sm mx-auto">
        {c.sub}
      </div>
      {tab === "upcoming" && (
        <button
          onClick={onSeed}
          disabled={seeding}
          className="mt-5 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-indigo-500/50 disabled:opacity-50 transition"
        >
          <Banknote className="w-3.5 h-3.5" />
          {seeding ? "Seeding…" : "Seed demo data"}
        </button>
      )}
    </div>
  );
}


function ActionButton({
  row,
  onApprove,
  onUnarchive,
  onRetry,
  onMakeChanges,
  pendingId,
}: {
  row: PayRun;
  onApprove: (id: string) => void;
  onUnarchive: (id: string) => void;
  onRetry: (id: string) => void;
  onMakeChanges: (id: string) => void;
  pendingId: string | null;
}) {
  const isPending = pendingId === row.id;
  const label = row.action_text ?? "";
  const status = row.status.toLowerCase();

  if (status === "upcoming") {
    return (
      <button
        onClick={() => onApprove(row.id)}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-50 transition font-medium"
      >
        {isPending ? "Running…" : label || "Run payroll"}
      </button>
    );
  }
  if (status === "paid") {
    return (
      <button
        onClick={() => onMakeChanges(row.id)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-indigo-500/50 transition"
      >
        {label || "Make Changes"}
      </button>
    );
  }
  if (status === "archived") {
    return (
      <button
        onClick={() => onUnarchive(row.id)}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-indigo-500/50 disabled:opacity-50 transition"
      >
        {isPending ? "Unarchiving…" : label || "Unarchive"}
      </button>
    );
  }
  if (status === "failed") {
    return (
      <button
        onClick={() => onRetry(row.id)}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-amber-500 text-neutral-950 hover:bg-amber-400 disabled:opacity-50 transition font-medium"
      >
        {isPending ? "Retrying…" : label || "Retry"}
      </button>
    );
  }
  return null;
}


function PayRunRow(props: {
  row: PayRun;
  onApprove: (id: string) => void;
  onUnarchive: (id: string) => void;
  onRetry: (id: string) => void;
  onMakeChanges: (id: string) => void;
  pendingId: string | null;
}) {
  const { row } = props;
  return (
    <tr className="border-t border-neutral-800 hover:bg-neutral-800/40 transition">
      <td className="px-5 py-4">
        <div className="font-medium text-neutral-100">
          {row.pay_schedule_name ?? "Bi-Weekly"}
        </div>
        <div className="text-xs text-neutral-500 mt-0.5">
          {row.entity ?? "Entity - US"}
        </div>
        <div className="text-xs text-neutral-400 mt-1">{row.label}</div>
      </td>
      <td className="px-5 py-4 text-sm text-neutral-300">
        {capitalize(row.pay_run_type)}
      </td>
      <td className="px-5 py-4 text-sm text-neutral-300">
        {fmtPayDate(row.pay_date)}
      </td>
      <td className="px-5 py-4 text-sm text-neutral-300">
        {row.funding_method ?? "—"}
      </td>
      <td className="px-5 py-4">
        <StatusChip status={row.status} />
        {row.status === "failed" && row.failure_reason && (
          <div className="text-xs text-rose-400 mt-1 max-w-[14rem]">
            {row.failure_reason}
          </div>
        )}
      </td>
      <td className="px-5 py-4 text-right">
        <ActionButton {...props} />
      </td>
    </tr>
  );
}


function PayRunCardMobile(props: {
  row: PayRun;
  onApprove: (id: string) => void;
  onUnarchive: (id: string) => void;
  onRetry: (id: string) => void;
  onMakeChanges: (id: string) => void;
  pendingId: string | null;
}) {
  const { row } = props;
  return (
    <div className="border-t border-neutral-800 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-neutral-100 text-sm">
            {row.pay_schedule_name ?? "Bi-Weekly"}
          </div>
          <div className="text-xs text-neutral-500 mt-0.5">
            {row.entity ?? "Entity - US"}
          </div>
          <div className="text-xs text-neutral-400 mt-1">{row.label}</div>
        </div>
        <StatusChip status={row.status} />
      </div>
      <dl className="grid grid-cols-2 gap-2 mt-3 text-xs">
        <div>
          <dt className="text-neutral-500 uppercase tracking-wide">Type</dt>
          <dd className="text-neutral-200 mt-0.5">
            {capitalize(row.pay_run_type)}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500 uppercase tracking-wide">Pay date</dt>
          <dd className="text-neutral-200 mt-0.5">
            {fmtPayDate(row.pay_date)}
          </dd>
        </div>
        <div>
          <dt className="text-neutral-500 uppercase tracking-wide">Method</dt>
          <dd className="text-neutral-200 mt-0.5">
            {row.funding_method ?? "—"}
          </dd>
        </div>
      </dl>
      {row.status === "failed" && row.failure_reason && (
        <div className="text-xs text-rose-400 mt-3">{row.failure_reason}</div>
      )}
      <div className="mt-4 flex justify-end">
        <ActionButton {...props} />
      </div>
    </div>
  );
}


function PayRunsTable(props: {
  rows: PayRun[];
  onApprove: (id: string) => void;
  onUnarchive: (id: string) => void;
  onRetry: (id: string) => void;
  onMakeChanges: (id: string) => void;
  pendingId: string | null;
}) {
  const { rows } = props;
  return (
    <div>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900/60 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="text-left font-medium px-5 py-3">Pay schedule</th>
              <th className="text-left font-medium px-5 py-3">Pay run type</th>
              <th className="text-left font-medium px-5 py-3">Pay date</th>
              <th className="text-left font-medium px-5 py-3">Payment method</th>
              <th className="text-left font-medium px-5 py-3">Status</th>
              <th className="text-right font-medium px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <PayRunRow key={r.id} row={r} {...props} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden">
        {rows.map((r) => (
          <PayRunCardMobile key={r.id} row={r} {...props} />
        ))}
      </div>
    </div>
  );
}


function ApproveBanner({ run }: { run: PayRun }) {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-500/5 p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <Clock className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Approve your next pay run
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
            Approve by{" "}
            <span className="text-amber-700 dark:text-amber-300 font-medium">
              {fmtApproveBy(run.approve_by)}
            </span>{" "}
            to pay your team on time.
          </div>
        </div>
        <Link
          to={`/payroll/runs/${run.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-amber-500 text-neutral-950 hover:bg-amber-400 transition font-medium shrink-0"
        >
          Review & approve
        </Link>
      </div>
    </div>
  );
}


function RothBanner() {
  return (
    <div className="rounded-xl border border-indigo-500/40 bg-indigo-50 dark:bg-indigo-500/5 p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <Info className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Roth 401(k) deduction updates
          </div>
          <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
            Admin review required for Q2. A few employees elected new Roth
            deferrals — confirm their deduction is set before the next pay run.
          </div>
        </div>
        <a
          href="#"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10 transition shrink-0"
        >
          Learn more
        </a>
      </div>
    </div>
  );
}


export function PayrollOverviewPage() {
  const [tab, setTab] = useState<TabKey>("upcoming");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const allQ = usePayRuns();
  const tabQ = usePayRuns(tab);

  const approve = useApprovePayRun();
  const archive = useArchivePayRun();
  const patch = usePatchPayRun();
  const seed = useSeedPayrollDemo();

  const allRows: PayRun[] = allQ.data ?? [];
  const tabRows: PayRun[] = tabQ.data ?? [];

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      upcoming: 0,
      paid: 0,
      archived: 0,
      failed: 0,
    };
    for (const r of allRows) {
      const key = r.status.toLowerCase() as TabKey;
      if (key in c) c[key]++;
    }
    return c;
  }, [allRows]);

  const approveSoon = useMemo(() => {
    const upcoming = allRows.filter(
      (r) => r.status.toLowerCase() === "upcoming",
    );
    return upcoming.find((r) => {
      const h = hoursUntil(r.approve_by);
      return h !== null && h <= 24 && h >= -24;
    });
  }, [allRows]);

  const handleApprove = async (id: string) => {
    setPendingId(id);
    try {
      await approve.mutateAsync(id);
      window.alert("Pay run approved. Funding started via ACH.");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Approval failed — please try again.";
      window.alert(msg);
    } finally {
      setPendingId(null);
    }
  };

  const handleUnarchive = async (id: string) => {
    setPendingId(id);
    try {
      await patch.mutateAsync({
        id,
        patch: { status: "upcoming", action_text: "Run payroll" },
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unarchive failed — please try again.";
      window.alert(msg);
    } finally {
      setPendingId(null);
    }
  };

  const handleRetry = async (id: string) => {
    setPendingId(id);
    try {
      await patch.mutateAsync({
        id,
        patch: {
          status: "upcoming",
          action_text: "Run payroll",
          failure_reason: null,
        },
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Retry failed.";
      window.alert(msg);
    } finally {
      setPendingId(null);
    }
  };

  const handleMakeChanges = (id: string) => {
    console.log("[payroll] Make changes requested for pay run", id);
  };

  const handleSeed = async () => {
    try {
      await seed.mutateAsync();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Couldn't seed demo data.";
      window.alert(msg);
    }
  };

  const handleArchive = async (id: string) => {
    setPendingId(id);
    try {
      await archive.mutateAsync(id);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Archive failed.";
      window.alert(msg);
    } finally {
      setPendingId(null);
    }
  };
  void handleArchive;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Run payroll</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
          Here's a summary of your upcoming and past pay runs.
        </p>
      </div>

      {(approveSoon || allRows.length > 0) && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {approveSoon && <ApproveBanner run={approveSoon} />}
          <RothBanner />
        </div>
      )}

      <nav className="mt-8 border-b border-neutral-800 flex flex-wrap gap-0">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                "px-4 py-3 text-sm -mb-px border-b-2 transition inline-flex items-center",
                active
                  ? "border-indigo-500 text-white font-medium"
                  : "border-transparent text-neutral-400 hover:text-neutral-200",
              ].join(" ")}
            >
              {t.label}
              <TabBadge count={counts[t.key]} active={active} />
            </button>
          );
        })}
      </nav>

      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
        {tabQ.isLoading ? (
          <TableSkeleton />
        ) : tabQ.isError ? (
          <ErrorInline
            message={
              tabQ.error instanceof Error
                ? tabQ.error.message
                : "Something went wrong loading this tab."
            }
            onRetry={() => tabQ.refetch()}
          />
        ) : tabRows.length === 0 ? (
          <EmptyState
            tab={tab}
            onSeed={handleSeed}
            seeding={seed.isPending}
          />
        ) : (
          <PayRunsTable
            rows={tabRows}
            onApprove={handleApprove}
            onUnarchive={handleUnarchive}
            onRetry={handleRetry}
            onMakeChanges={handleMakeChanges}
            pendingId={pendingId}
          />
        )}
      </div>
    </div>
  );
}
