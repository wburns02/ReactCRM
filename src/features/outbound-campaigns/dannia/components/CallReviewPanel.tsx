import { useState, useMemo } from "react";
import { Headphones, Play, Star } from "lucide-react";
import { useDanniaStore } from "../danniaStore";
import {
  filterRecordingsByDisposition,
  getCallOfTheDay,
} from "../callRecordingTracker";
import { CALL_STATUS_CONFIG } from "../../types";
import type { ContactCallStatus } from "../../types";
import { SecureCallRecordingPlayer } from "@/features/calls/components/SecureCallRecordingPlayer";

type FilterOption = "all" | "interested" | "not_interested" | "voicemail";

const FILTERS: { value: FilterOption; label: string }[] = [
  { value: "all", label: "All" },
  { value: "interested", label: "Interested" },
  { value: "not_interested", label: "Not Interested" },
  { value: "voicemail", label: "Voicemail" },
];

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function CallReviewPanel() {
  const records = useDanniaStore((s) => s.recentCallRecords);
  const [filter, setFilter] = useState<FilterOption>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const todayRecords = useMemo(
    () =>
      filterRecordingsByDisposition(
        records,
        filter === "all" ? null : filter,
      ),
    [records, filter],
  );

  const callOfTheDay = useMemo(() => getCallOfTheDay(records), [records]);

  if (records.length === 0) {
    return (
      <div className="bg-bg-card border border-border rounded-xl p-8 text-center">
        <Headphones className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
        <h3 className="text-base font-semibold text-text-primary">
          No calls recorded today
        </h3>
        <p className="text-sm text-text-secondary mt-1">
          Start dialing to see your call history here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Call of the Day */}
      {callOfTheDay && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
              Call of the Day
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-text-primary">
                {callOfTheDay.contactName}
              </span>
              <span className="text-xs text-text-secondary ml-2">
                {formatDuration(callOfTheDay.durationSec)}
              </span>
            </div>
            {callOfTheDay.callId && (
              <button
                onClick={() =>
                  setExpandedId(
                    expandedId === callOfTheDay.id ? null : callOfTheDay.id,
                  )
                }
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50"
              >
                <Play className="w-3 h-3" /> Play
              </button>
            )}
          </div>
          {expandedId === callOfTheDay.id && callOfTheDay.callId && (
            <div className="mt-2">
              <SecureCallRecordingPlayer callId={callOfTheDay.callId} />
            </div>
          )}
        </div>
      )}

      {/* Filter buttons */}
      <div className="flex gap-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
              filter === f.value
                ? "bg-primary/10 text-primary border border-primary/30"
                : "bg-bg-hover text-text-tertiary border border-transparent hover:text-text-secondary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Call list */}
      <div className="space-y-1">
        {todayRecords.map((record) => {
          const statusConf =
            CALL_STATUS_CONFIG[record.disposition as ContactCallStatus];
          return (
            <div
              key={record.id}
              className="bg-bg-card border border-border rounded-lg p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">
                    {record.contactName}
                  </span>
                  {statusConf && (
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${statusConf.color}`}
                    >
                      {statusConf.icon} {statusConf.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-tertiary tabular-nums">
                    {formatDuration(record.durationSec)}
                  </span>
                  {record.callId && (
                    <button
                      onClick={() =>
                        setExpandedId(
                          expandedId === record.id ? null : record.id,
                        )
                      }
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-bg-hover text-text-secondary hover:bg-primary/10 hover:text-primary"
                    >
                      <Play className="w-3 h-3" /> Play
                    </button>
                  )}
                </div>
              </div>
              {record.notes && (
                <p className="text-xs text-text-tertiary mt-1 line-clamp-2">
                  {record.notes}
                </p>
              )}
              {expandedId === record.id && record.callId && (
                <div className="mt-2">
                  <SecureCallRecordingPlayer callId={record.callId} />
                </div>
              )}
            </div>
          );
        })}
        {todayRecords.length === 0 && (
          <p className="text-xs text-text-tertiary text-center py-4">
            No calls match this filter.
          </p>
        )}
      </div>
    </div>
  );
}
