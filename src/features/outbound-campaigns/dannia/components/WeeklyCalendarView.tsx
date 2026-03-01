import { useMemo } from "react";
import { useDanniaStore } from "../danniaStore";
import { formatHour } from "../constants";
import type { TimeBlock, DailyPlan } from "../types";
import { SHORT_DAY_NAMES } from "../constants";

function BlockCard({ block, isCurrentBlock }: { block: TimeBlock; isCurrentBlock: boolean }) {
  if (block.capacity === 0) {
    return (
      <div className="px-2 py-1.5 rounded-lg bg-bg-hover text-[10px] text-text-tertiary italic">
        {block.label}
      </div>
    );
  }

  const completed = block.completedIds.length;
  const total = block.contactIds.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div
      className={`px-2 py-1.5 rounded-lg border text-[10px] ${
        isCurrentBlock
          ? "border-primary bg-primary/5"
          : completed === total && total > 0
            ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20"
            : "border-border bg-bg-card"
      }`}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="font-medium text-text-primary truncate">
          {block.label}
        </span>
        <span className="text-text-tertiary tabular-nums">
          {completed}/{total}
        </span>
      </div>
      <div className="text-text-tertiary">
        {formatHour(block.startHour)} - {formatHour(block.endHour)}
      </div>
      {total > 0 && (
        <div className="mt-1 w-full h-1 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

function DayColumn({ plan, isToday }: { plan: DailyPlan; isToday: boolean }) {
  const dayName = SHORT_DAY_NAMES[plan.dayOfWeek] ?? "???";
  const dateLabel = new Date(plan.date + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const currentBlock = useDanniaStore((s) => s.getCurrentBlock());

  return (
    <div
      className={`flex-1 min-w-0 ${isToday ? "ring-2 ring-primary/20 rounded-xl" : ""}`}
    >
      <div
        className={`text-center py-2 rounded-t-xl ${
          isToday
            ? "bg-primary/10 text-primary font-bold"
            : "bg-bg-hover text-text-secondary"
        }`}
      >
        <div className="text-xs font-medium">{dayName}</div>
        <div className="text-[10px]">{dateLabel}</div>
      </div>
      <div className="space-y-1 p-1.5">
        {plan.blocks.map((block) => (
          <BlockCard
            key={block.id}
            block={block}
            isCurrentBlock={isToday && currentBlock?.id === block.id}
          />
        ))}
      </div>
      <div className="text-center py-1.5 text-[10px] text-text-tertiary border-t border-border">
        {plan.completedCount}/{plan.totalCapacity} calls
      </div>
    </div>
  );
}

export function WeeklyCalendarView() {
  const schedule = useDanniaStore((s) => s.currentSchedule);
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  if (!schedule) {
    return (
      <div className="bg-bg-card border border-border rounded-xl p-8 text-center">
        <div className="text-text-tertiary text-sm">
          No schedule generated yet. Open Today&apos;s Plan to generate one.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">
          Weekly Schedule
        </h3>
        <div className="text-xs text-text-tertiary">
          {new Date(schedule.weekStart + "T12:00:00").toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
          })}{" "}
          -{" "}
          {new Date(schedule.weekEnd + "T12:00:00").toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {schedule.days.map((day) => (
          <DayColumn
            key={day.date}
            plan={day}
            isToday={day.date === todayStr}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center gap-4 text-[10px] text-text-tertiary">
        <span>
          Callback reserve: {schedule.callbackReserve} slots
        </span>
        <span>
          Generated:{" "}
          {new Date(schedule.generatedAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
