import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTechJobs } from "@/api/hooks/useTechPortal.ts";
import { STATUS_LABELS, STATUS_COLORS, JOB_TYPE_LABELS } from "@/api/types/techPortal.ts";
import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import { formatCurrency, formatDate } from "@/lib/utils.ts";
import { CollectPaymentModal } from "@/features/payments/components/CollectPaymentModal.tsx";

// ── Constants ──────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { key: "all", label: "All", emoji: "📋" },
  { key: "scheduled", label: "Scheduled", emoji: "📅" },
  { key: "in_progress", label: "In Progress", emoji: "🔧" },
  { key: "completed", label: "Completed", emoji: "✅" },
] as const;

const JOB_TYPE_EMOJIS: Record<string, string> = {
  pumping: "🚛",
  inspection: "🔍",
  repair: "🔩",
  installation: "🏗️",
  maintenance: "🛠️",
  emergency: "🚨",
  grease_trap: "🪣",
  other: "📦",
};

const STATUS_BADGE_VARIANT: Record<string, "info" | "warning" | "success" | "danger" | "default"> = {
  blue: "info",
  yellow: "warning",
  orange: "warning",
  green: "success",
  red: "danger",
  gray: "default",
};

const STATUS_BORDER_COLOR: Record<string, string> = {
  blue: "border-l-blue-500",
  yellow: "border-l-yellow-500",
  orange: "border-l-orange-500",
  green: "border-l-green-500",
  red: "border-l-red-500",
  gray: "border-l-gray-400",
};

const PAGE_SIZE = 20;

// ── Helpers ────────────────────────────────────────────────────────────────

function buildMapsUrl(address?: string | null, city?: string | null): string {
  const parts = [address, city, "TX"].filter(Boolean).join(", ");
  return `https://maps.google.com/?q=${encodeURIComponent(parts)}`;
}

function formatTimeWindow(start?: string | null, end?: string | null): string | null {
  if (!start && !end) return null;
  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return iso;
    }
  };
  if (start && end) return `${fmt(start)} - ${fmt(end)}`;
  if (start) return `Starts ${fmt(start)}`;
  return `Ends ${fmt(end!)}`;
}

function parseAmount(value: number | string | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

// ── Loading Skeletons ──────────────────────────────────────────────────────

function JobsPageSkeleton() {
  return (
    <div className="space-y-4 p-4 max-w-2xl mx-auto">
      {/* Search bar skeleton */}
      <Skeleton className="h-12 w-full rounded-xl" />
      {/* Tab bar skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-full" />
        ))}
      </div>
      {/* Card skeletons */}
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-xl" />
      ))}
    </div>
  );
}

// ── Job Card ───────────────────────────────────────────────────────────────

function JobCard({
  job,
  onClick,
  onCollectPayment,
}: {
  job: {
    id: string;
    customer_id?: string | null;
    customer_name?: string | null;
    service_address_line1?: string | null;
    service_city?: string | null;
    job_type?: string | null;
    status?: string | null;
    scheduled_date?: string | null;
    total_amount?: number | string | null;
    estimated_duration_hours?: number | null;
    notes?: string | null;
    priority?: string | null;
  };
  onClick: () => void;
  onCollectPayment: () => void;
}) {
  const status = job.status || "pending";
  const colorKey = STATUS_COLORS[status] || "gray";
  const borderColor = STATUS_BORDER_COLOR[colorKey] || "border-l-gray-400";
  const badgeVariant = STATUS_BADGE_VARIANT[colorKey] || "default";
  const jobTypeEmoji = JOB_TYPE_EMOJIS[job.job_type || "other"] || "📦";
  const jobTypeLabel = JOB_TYPE_LABELS[job.job_type || "other"] || job.job_type || "Job";
  const statusLabel = STATUS_LABELS[status] || status;
  const isCompleted = status === "completed";
  const isCancelled = status === "cancelled";
  const amount = parseAmount(job.total_amount);

  return (
    <Card
      className={`border-l-4 ${borderColor} cursor-pointer transition-shadow hover:shadow-md active:shadow-inner ${
        isCompleted ? "opacity-60" : ""
      } ${isCancelled ? "opacity-40" : ""}`}
      onClick={onClick}
    >
      <CardContent className="pt-4 pb-4">
        {/* Row 1: Job type + Status badge */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xl flex-shrink-0">{jobTypeEmoji}</span>
            <div className="min-w-0">
              <p className="text-base font-bold text-text-primary truncate">
                {jobTypeLabel}
              </p>
              <p className="text-sm text-text-secondary truncate">
                {job.customer_name || "Unknown Customer"}
              </p>
            </div>
          </div>
          <Badge variant={badgeVariant} size="md" className="flex-shrink-0 ml-2">
            {statusLabel}
          </Badge>
        </div>

        {/* Row 2: Address — tappable for Google Maps */}
        {job.service_address_line1 && (
          <a
            href={buildMapsUrl(job.service_address_line1, job.service_city)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:text-primary/80 mb-2"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-lg">📍</span>
            <span className="text-sm underline truncate">
              {job.service_address_line1}
              {job.service_city ? `, ${job.service_city}` : ""}
            </span>
          </a>
        )}

        {/* Row 3: Date + Duration + Value */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
          {job.scheduled_date && (
            <span className="flex items-center gap-1">
              <span>📅</span>
              {formatDate(job.scheduled_date)}
            </span>
          )}
          {job.estimated_duration_hours != null && job.estimated_duration_hours > 0 && (
            <span className="flex items-center gap-1">
              <span>🕐</span>
              {job.estimated_duration_hours >= 1
                ? `${job.estimated_duration_hours}h est.`
                : `${Math.round(job.estimated_duration_hours * 60)}m est.`}
            </span>
          )}
          {amount > 0 && (
            <span className="flex items-center gap-1 font-semibold text-green-600">
              <span>💰</span>
              {formatCurrency(amount)}
            </span>
          )}
          {job.priority === "urgent" || job.priority === "emergency" ? (
            <span className="flex items-center gap-1 text-red-600 font-semibold">
              <span>🔴</span>
              {job.priority === "emergency" ? "EMERGENCY" : "URGENT"}
            </span>
          ) : null}
        </div>

        {/* Row 4: Notes preview */}
        {job.notes && (
          <p className="text-xs text-text-muted mt-2 line-clamp-1">
            📝 {job.notes}
          </p>
        )}

        {/* Collect Payment button for active/completed jobs */}
        {(status === "in_progress" || status === "completed") && (
          <button
            onClick={(e) => { e.stopPropagation(); onCollectPayment(); }}
            className="w-full h-11 mt-3 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-sm transition-colors"
          >
            <span>💰</span> Collect Payment
            {amount > 0 && <span className="opacity-80">({formatCurrency(amount)})</span>}
          </button>
        )}

        {/* Tap indicator */}
        <div className="flex justify-end mt-2">
          <span className="text-xs text-text-muted">Tap for details →</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ statusFilter }: { statusFilter: string }) {
  const messages: Record<string, { emoji: string; text: string }> = {
    all: { emoji: "📭", text: "No jobs found" },
    scheduled: { emoji: "📅", text: "No scheduled jobs" },
    in_progress: { emoji: "🔧", text: "No jobs in progress" },
    completed: { emoji: "🎉", text: "No completed jobs yet" },
  };
  const msg = messages[statusFilter] || messages.all;

  return (
    <Card>
      <CardContent className="py-16 text-center">
        <p className="text-5xl mb-4">{msg.emoji}</p>
        <p className="text-lg font-medium text-text-secondary">{msg.text}</p>
        <p className="text-sm text-text-muted mt-2">
          Pull down to refresh or adjust your filters
        </p>
      </CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export function TechJobsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [paymentJob, setPaymentJob] = useState<{
    id: string;
    customer_name?: string | null;
    total_amount?: number | string | null;
  } | null>(null);

  // Build API filters
  const apiFilters = useMemo(() => {
    const f: Record<string, string | number> = {
      page,
      page_size: PAGE_SIZE,
    };
    if (statusFilter !== "all") f.status = statusFilter;
    if (search.trim()) f.search = search.trim();
    return f;
  }, [statusFilter, search, page]);

  const { data, isLoading, isFetching, refetch } = useTechJobs(apiFilters);

  // Sort by date (newest first) client-side as a fallback
  const sortedItems = useMemo(() => {
    const items = data?.items ?? [];
    return [...items].sort((a, b) => {
      const da = a.scheduled_date ? new Date(a.scheduled_date).getTime() : 0;
      const db = b.scheduled_date ? new Date(b.scheduled_date).getTime() : 0;
      return db - da;
    });
  }, [data?.items]);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Reset page when filters change
  const handleStatusChange = useCallback((newStatus: string) => {
    setStatusFilter(newStatus);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────

  if (isLoading) return <JobsPageSkeleton />;

  return (
    <div className="p-4 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <span className="text-3xl">🔧</span> My Jobs
        </h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-primary"
        >
          {isFetching ? (
            <span className="animate-spin text-lg">🔄</span>
          ) : (
            <span className="text-lg">🔄</span>
          )}
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg pointer-events-none">
          🔍
        </span>
        <Input
          placeholder="Search by customer or address..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="h-12 pl-10 text-base rounded-xl"
        />
        {search && (
          <button
            onClick={() => handleSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-text-muted hover:text-text-primary"
          >
            ✕
          </button>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1 scrollbar-hide">
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleStatusChange(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "bg-bg-muted text-text-secondary hover:bg-bg-hover"
              }`}
            >
              <span>{tab.emoji}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-text-muted">
          {total === 0
            ? "No results"
            : total === 1
              ? "1 job"
              : `${total} jobs`}
          {search && (
            <span className="ml-1">
              matching "{search}"
            </span>
          )}
        </p>
        {isFetching && !isLoading && (
          <span className="text-xs text-text-muted animate-pulse">
            Refreshing...
          </span>
        )}
      </div>

      {/* Job Cards */}
      {sortedItems.length === 0 ? (
        <EmptyState statusFilter={statusFilter} />
      ) : (
        <div className="space-y-3">
          {sortedItems.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onClick={() => navigate(`/portal/jobs/${job.id}`)}
              onCollectPayment={() => setPaymentJob(job)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isFetching}
            className="h-11 px-5 rounded-xl text-base"
          >
            ← Prev
          </Button>
          <span className="text-sm text-text-secondary font-medium">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || isFetching}
            className="h-11 px-5 rounded-xl text-base"
          >
            Next →
          </Button>
        </div>
      )}

      {/* Collect Payment Modal */}
      <CollectPaymentModal
        open={paymentJob !== null}
        onClose={() => setPaymentJob(null)}
        workOrderId={paymentJob?.id}
        customerName={paymentJob?.customer_name ?? undefined}
        suggestedAmount={paymentJob?.total_amount != null ? parseAmount(paymentJob.total_amount) : undefined}
        isTechnician={true}
        onSuccess={() => {
          refetch();
          setPaymentJob(null);
        }}
      />
    </div>
  );
}
