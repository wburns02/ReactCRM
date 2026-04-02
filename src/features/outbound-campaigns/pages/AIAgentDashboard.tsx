import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import {
  Play, Pause, Square, Phone, PhoneOff, Clock, CheckCircle,
  Users, DollarSign, BarChart3, Loader2, AlertCircle, RefreshCw,
  Bot, Zap, MessageSquare, Calendar, PhoneCall,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toastSuccess, toastError } from "@/components/ui/Toast";

interface CampaignStatus {
  running: boolean;
  paused: boolean;
  started_at: string | null;
  current_call_sid: string | null;
  current_prospect: {
    name: string;
    phone: string;
    quote_total: number;
    quote_number: string;
  } | null;
  calls_made: number;
  calls_today: number;
  dispositions: Record<string, number>;
  queue_depth: number;
  last_error: string | null;
}

interface QueueItem {
  name: string;
  phone: string;
  quote_number: string;
  quote_total: number;
  sent_at: string | null;
  service: string;
}

const DISPOSITION_LABELS: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  appointment_set: { label: "Appointment Set", color: "text-emerald-600 bg-emerald-50", icon: Calendar },
  callback_requested: { label: "Callback", color: "text-blue-600 bg-blue-50", icon: Clock },
  transferred_to_sales: { label: "Transferred", color: "text-purple-600 bg-purple-50", icon: PhoneCall },
  not_interested: { label: "Not Interested", color: "text-gray-600 bg-gray-50", icon: PhoneOff },
  voicemail_left: { label: "Voicemail", color: "text-amber-600 bg-amber-50", icon: MessageSquare },
  no_answer: { label: "No Answer", color: "text-red-600 bg-red-50", icon: Phone },
  service_completed_elsewhere: { label: "Done Elsewhere", color: "text-gray-600 bg-gray-50", icon: CheckCircle },
  wrong_number: { label: "Wrong Number", color: "text-red-600 bg-red-50", icon: AlertCircle },
  do_not_call: { label: "DNC", color: "text-red-600 bg-red-50", icon: AlertCircle },
};

export function AIAgentDashboard() {
  const queryClient = useQueryClient();

  // Poll campaign status every 2 seconds when running
  const { data: status } = useQuery<CampaignStatus>({
    queryKey: ["outbound-agent-status"],
    queryFn: () => apiClient.get("/outbound-agent/campaign/status").then((r) => r.data),
    refetchInterval: 2000,
  });

  const { data: queueData } = useQuery<{ queue: QueueItem[]; total: number }>({
    queryKey: ["outbound-agent-queue"],
    queryFn: () => apiClient.get("/outbound-agent/queue").then((r) => r.data),
    refetchInterval: 30000,
  });

  const startMutation = useMutation({
    mutationFn: () => apiClient.post("/outbound-agent/campaign/start"),
    onSuccess: () => {
      toastSuccess("Campaign started");
      queryClient.invalidateQueries({ queryKey: ["outbound-agent-status"] });
    },
    onError: () => toastError("Failed to start campaign"),
  });

  const stopMutation = useMutation({
    mutationFn: () => apiClient.post("/outbound-agent/campaign/stop"),
    onSuccess: () => {
      toastSuccess("Campaign stopped");
      queryClient.invalidateQueries({ queryKey: ["outbound-agent-status"] });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: () => apiClient.post("/outbound-agent/campaign/pause"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["outbound-agent-status"] }),
  });

  const resumeMutation = useMutation({
    mutationFn: () => apiClient.post("/outbound-agent/campaign/resume"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["outbound-agent-status"] }),
  });

  const isRunning = status?.running && !status?.paused;
  const isPaused = status?.running && status?.paused;
  const totalDispositions = Object.values(status?.dispositions || {}).reduce((a, b) => a + b, 0);
  const appointmentsSet = status?.dispositions?.appointment_set || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <Bot className="w-7 h-7 text-primary" />
            AI Sales Agent
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Autonomous quote follow-up calls powered by AI
          </p>
        </div>

        {/* Campaign Controls */}
        <div className="flex items-center gap-3">
          {!status?.running ? (
            <button
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {startMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Start Campaign
            </button>
          ) : (
            <>
              {isPaused ? (
                <button
                  onClick={() => resumeMutation.mutate()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Resume
                </button>
              ) : (
                <button
                  onClick={() => pauseMutation.mutate()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
              )}
              <button
                onClick={() => stopMutation.mutate()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status Banner */}
      {status?.running && (
        <div
          className={cn(
            "rounded-xl p-4 flex items-center gap-4",
            isPaused
              ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800"
              : "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800"
          )}
        >
          <div className={cn(
            "w-3 h-3 rounded-full",
            isPaused ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
          )} />
          <div className="flex-1">
            {status.current_prospect ? (
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {isPaused ? "Paused" : "On call with"}{" "}
                  <span className="font-bold">{status.current_prospect.name}</span>
                  {" "}({status.current_prospect.phone})
                </p>
                <p className="text-xs text-text-secondary">
                  Quote #{status.current_prospect.quote_number} — ${status.current_prospect.quote_total.toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-sm font-medium text-text-primary">
                {isPaused ? "Campaign paused" : "Waiting to dial next prospect..."}
              </p>
            )}
          </div>
          {status.current_prospect && !isPaused && (
            <Zap className="w-5 h-5 text-emerald-500 animate-pulse" />
          )}
        </div>
      )}

      {/* Error Banner */}
      {status?.last_error && (
        <div className="rounded-xl p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-400">{status.last_error}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Calls Made"
          value={status?.calls_today || 0}
          icon={Phone}
          color="text-blue-600"
        />
        <KPICard
          label="Appointments Set"
          value={appointmentsSet}
          icon={Calendar}
          color="text-emerald-600"
        />
        <KPICard
          label="Queue Depth"
          value={queueData?.total || status?.queue_depth || 0}
          icon={Users}
          color="text-purple-600"
        />
        <KPICard
          label="Conversion Rate"
          value={totalDispositions > 0 ? `${Math.round((appointmentsSet / totalDispositions) * 100)}%` : "—"}
          icon={BarChart3}
          color="text-amber-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disposition Breakdown */}
        <div className="bg-bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide mb-4">
            Call Dispositions
          </h3>
          {totalDispositions === 0 ? (
            <p className="text-sm text-text-muted py-8 text-center">No calls completed yet</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(status?.dispositions || {}).map(([key, count]) => {
                const config = DISPOSITION_LABELS[key] || { label: key, color: "text-gray-600 bg-gray-50", icon: Phone };
                const Icon = config.icon;
                const pct = Math.round((count / totalDispositions) * 100);
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className={cn("p-1.5 rounded-lg", config.color)}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm text-text-primary flex-1">{config.label}</span>
                    <span className="text-sm font-semibold text-text-primary">{count}</span>
                    <div className="w-20 h-1.5 bg-bg-hover rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-text-muted w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Prospect Queue */}
        <div className="bg-bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
              Up Next ({queueData?.total || 0})
            </h3>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["outbound-agent-queue"] })}
              className="p-1.5 rounded-md hover:bg-bg-hover text-text-secondary"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          {!queueData?.queue?.length ? (
            <p className="text-sm text-text-muted py-8 text-center">
              No prospects with outstanding quotes
            </p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {queueData.queue.map((item, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border border-border",
                    i === 0 && status?.running && !status?.current_prospect
                      ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200"
                      : "bg-bg-body"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{item.name}</p>
                    <p className="text-xs text-text-secondary">
                      {item.service} — ${item.quote_total.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-muted">Q#{item.quote_number}</p>
                    {item.sent_at && (
                      <p className="text-[10px] text-text-muted">
                        {new Date(item.sent_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KPICard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: typeof Phone;
  color: string;
}) {
  return (
    <div className="bg-bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("w-4 h-4", color)} />
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
    </div>
  );
}
