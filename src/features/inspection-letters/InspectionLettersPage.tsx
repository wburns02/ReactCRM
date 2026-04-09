import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardCheck,
  FileText,
  Send,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  ExternalLink,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────

interface LetterQueueItem {
  id: string;
  work_order_number: string | null;
  customer_name: string;
  customer_email: string | null;
  address: string;
  scheduled_date: string | null;
  status: string | null;
  letter_status: string;
  has_inspection_data: boolean;
  overall_condition: string | null;
  sent_at: string | null;
  sent_to: string | null;
}

type FilterTab = "all" | "needs_letter" | "draft" | "sent";

// ── Hook ───────────────────────────────────────────────

function useInspectionLetterQueue() {
  return useQuery({
    queryKey: ["inspection-letters", "queue"],
    queryFn: async () => {
      const { data } = await apiClient.get(
        "/employee/inspection-letters/queue",
      );
      return data as { items: LetterQueueItem[]; total: number };
    },
  });
}

// ── Helpers ────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "--";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function LetterStatusBadge({
  status,
  hasData,
}: {
  status: string;
  hasData: boolean;
}) {
  if (status === "sent") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
        <CheckCircle2 className="h-3 w-3" />
        Sent
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
        <CheckCircle2 className="h-3 w-3" />
        Ready
      </span>
    );
  }
  if (status === "draft") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
        <FileText className="h-3 w-3" />
        Draft
      </span>
    );
  }
  if (!hasData) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
        No Data
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
      <AlertCircle className="h-3 w-3" />
      Needs Letter
    </span>
  );
}

function ConditionBadge({ condition }: { condition: string | null }) {
  if (!condition) {
    return (
      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
        N/A
      </span>
    );
  }
  const colors: Record<string, string> = {
    good: "bg-green-100 text-green-800",
    fair: "bg-amber-100 text-amber-800",
    poor: "bg-red-100 text-red-800",
    critical: "bg-red-100 text-red-800",
  };
  const cls = colors[condition.toLowerCase()] || "bg-gray-100 text-gray-600";
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}
    >
      {condition}
    </span>
  );
}

function WoStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-gray-400">--</span>;
  const colors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    in_progress: "bg-blue-100 text-blue-800",
    scheduled: "bg-purple-100 text-purple-800",
    pending: "bg-amber-100 text-amber-800",
    cancelled: "bg-red-100 text-red-800",
  };
  const cls = colors[status] || "bg-gray-100 text-gray-600";
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ── Stat Card ──────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ElementType;
}) {
  const colorMap: Record<string, string> = {
    blue: "border-blue-200 bg-blue-50 text-blue-600",
    amber: "border-amber-200 bg-amber-50 text-amber-600",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-600",
    green: "border-green-200 bg-green-50 text-green-600",
  };
  const cls = colorMap[color] || colorMap.blue;
  const [borderBg, , textColor] = cls.split(" ");
  return (
    <div className={`rounded-lg border p-4 ${borderBg} ${cls.split(" ").slice(0, 2).join(" ")}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-gray-600">{label}</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
        </div>
        <Icon className={`h-8 w-8 ${textColor}`} />
      </div>
    </div>
  );
}

// ── Filter Tabs ────────────────────────────────────────

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "needs_letter", label: "Needs Letter" },
  { key: "draft", label: "Drafts" },
  { key: "sent", label: "Sent" },
];

// ── Main Page ──────────────────────────────────────────

export function InspectionLettersPage() {
  const { data, isLoading, error } = useInspectionLetterQueue();
  const [filter, setFilter] = useState<FilterTab>("all");

  const items = data?.items ?? [];

  const stats = {
    total: items.length,
    needsLetter: items.filter(
      (i) => i.letter_status === "none" && i.has_inspection_data,
    ).length,
    drafts: items.filter((i) => i.letter_status === "draft").length,
    sent: items.filter((i) => i.letter_status === "sent").length,
  };

  const filtered = items.filter((item) => {
    if (filter === "needs_letter")
      return item.letter_status === "none" && item.has_inspection_data;
    if (filter === "draft") return item.letter_status === "draft";
    if (filter === "sent") return item.letter_status === "sent";
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Inspection Letters
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            AI-powered inspection letter generation for real estate inspections
          </p>
        </div>
        <button
          disabled
          title="Coming soon"
          className="inline-flex items-center gap-2 rounded-lg bg-gray-300 px-4 py-2 text-sm font-medium text-gray-500 cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          New Letter
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Inspections"
          value={stats.total}
          color="blue"
          icon={ClipboardCheck}
        />
        <StatCard
          label="Needs Letter"
          value={stats.needsLetter}
          color="amber"
          icon={AlertCircle}
        />
        <StatCard
          label="Drafts"
          value={stats.drafts}
          color="indigo"
          icon={FileText}
        />
        <StatCard
          label="Sent"
          value={stats.sent}
          color="green"
          icon={Send}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              filter === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.key === "needs_letter" && stats.needsLetter > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                {stats.needsLetter}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
          Failed to load inspection letters queue.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <ClipboardCheck className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No inspections found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === "all"
              ? "There are no real estate inspections yet."
              : `No inspections match the "${TABS.find((t) => t.key === filter)?.label}" filter.`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Customer
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell">
                  Address
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">
                  WO Status
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 lg:table-cell">
                  Condition
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Letter
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                    {formatDate(item.scheduled_date)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {item.customer_name}
                    </div>
                    {item.customer_email && (
                      <div className="text-xs text-gray-500">
                        {item.customer_email}
                      </div>
                    )}
                  </td>
                  <td className="hidden max-w-xs truncate px-4 py-3 text-sm text-gray-500 md:table-cell">
                    {item.address || "--"}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 sm:table-cell">
                    <WoStatusBadge status={item.status} />
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 lg:table-cell">
                    <ConditionBadge condition={item.overall_condition} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <LetterStatusBadge
                      status={item.letter_status}
                      hasData={item.has_inspection_data}
                    />
                    {item.sent_at && (
                      <div className="mt-0.5 text-xs text-gray-400">
                        {formatDate(item.sent_at)}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Link
                      to={`/work-orders/${item.id}`}
                      className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      Open
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
