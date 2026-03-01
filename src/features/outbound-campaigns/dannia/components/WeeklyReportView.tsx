import { useMemo, useState } from "react";
import { Download, FileText, TrendingUp, Phone, Users, Star } from "lucide-react";
import { useDanniaStore } from "../danniaStore";
import { useWeeklyReport } from "../useWeeklyReport";
import type { WeeklyReport } from "../types";

function ReportCard({ report }: { report: WeeklyReport }) {
  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-bg-hover rounded-xl p-3 text-center">
          <Phone className="w-4 h-4 mx-auto mb-1 text-primary" />
          <div className="text-lg font-bold text-text-primary tabular-nums">
            {report.totalCalls}
          </div>
          <div className="text-[10px] text-text-tertiary">Total Calls</div>
        </div>
        <div className="bg-bg-hover rounded-xl p-3 text-center">
          <TrendingUp className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
          <div className="text-lg font-bold text-text-primary tabular-nums">
            {report.connectRate.toFixed(0)}%
          </div>
          <div className="text-[10px] text-text-tertiary">Connect Rate</div>
        </div>
        <div className="bg-bg-hover rounded-xl p-3 text-center">
          <Users className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
          <div className="text-lg font-bold text-text-primary tabular-nums">
            {report.totalInterested}
          </div>
          <div className="text-[10px] text-text-tertiary">Interested</div>
        </div>
        <div className="bg-bg-hover rounded-xl p-3 text-center">
          <Star className="w-4 h-4 mx-auto mb-1 text-amber-500" />
          <div className="text-lg font-bold text-text-primary tabular-nums">
            {report.contractsSaved}
          </div>
          <div className="text-[10px] text-text-tertiary">Contracts Saved</div>
        </div>
      </div>

      {/* Best performing */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-bg-hover rounded-lg px-3 py-2">
          <div className="text-[10px] text-text-tertiary">Best Time Block</div>
          <div className="text-sm font-medium text-text-primary">
            {report.bestTimeBlock || "—"}
          </div>
        </div>
        <div className="bg-bg-hover rounded-lg px-3 py-2">
          <div className="text-[10px] text-text-tertiary">Best Zone</div>
          <div className="text-sm font-medium text-text-primary">
            {report.bestZone || "—"}
          </div>
        </div>
        <div className="bg-bg-hover rounded-lg px-3 py-2">
          <div className="text-[10px] text-text-tertiary">Best Day</div>
          <div className="text-sm font-medium text-text-primary">
            {report.bestDay || "—"}
          </div>
        </div>
      </div>

      {/* Daily breakdown */}
      {report.dailyBreakdown.length > 0 && (
        <div>
          <div className="text-xs font-medium text-text-secondary mb-2">
            Daily Breakdown
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-tertiary border-b border-border">
                  <th className="text-left py-1.5 font-medium">Day</th>
                  <th className="text-right py-1.5 font-medium">Calls</th>
                  <th className="text-right py-1.5 font-medium">Connected</th>
                  <th className="text-right py-1.5 font-medium">Interested</th>
                  <th className="text-right py-1.5 font-medium">Connect %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.dailyBreakdown.map((day) => (
                  <tr key={day.date} className="text-text-secondary">
                    <td className="py-1.5 font-medium text-text-primary">
                      {day.dayLabel}
                    </td>
                    <td className="text-right py-1.5 tabular-nums">
                      {day.calls}
                    </td>
                    <td className="text-right py-1.5 tabular-nums">
                      {day.connected}
                    </td>
                    <td className="text-right py-1.5 tabular-nums">
                      {day.interested}
                    </td>
                    <td className="text-right py-1.5 tabular-nums">
                      {day.connectRate.toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {report.suggestions.length > 0 && (
        <div>
          <div className="text-xs font-medium text-text-secondary mb-2">
            Optimization Suggestions
          </div>
          <ul className="space-y-1">
            {report.suggestions.map((s, i) => (
              <li
                key={i}
                className="text-xs text-text-secondary flex items-start gap-1.5"
              >
                <span className="text-primary mt-0.5">&#8226;</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function WeeklyReportView() {
  const weeklyReports = useDanniaStore((s) => s.weeklyReports);
  const { generateReport, downloadPdf, isExporting } = useWeeklyReport();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const latestReport = weeklyReports[selectedIndex] ?? null;

  const isFriday = useMemo(() => new Date().getDay() === 5, []);

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-text-tertiary" />
          <h3 className="text-sm font-semibold text-text-primary">
            Weekly Report
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generateReport}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            Generate Report
          </button>
          {latestReport && (
            <button
              onClick={() => latestReport && downloadPdf(latestReport)}
              disabled={isExporting}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-bg-hover text-text-secondary hover:bg-bg-hover/80 disabled:opacity-40 transition-colors"
            >
              <Download className="w-3 h-3" />
              {isExporting ? "Exporting..." : "Download PDF"}
            </button>
          )}
        </div>
      </div>

      {/* Report selector */}
      {weeklyReports.length > 1 && (
        <div className="flex gap-1 mb-4 overflow-x-auto">
          {weeklyReports.slice(0, 8).map((r, i) => (
            <button
              key={r.id}
              onClick={() => setSelectedIndex(i)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                i === selectedIndex
                  ? "bg-primary/10 text-primary"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              Week of{" "}
              {new Date(r.weekStart + "T12:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </button>
          ))}
        </div>
      )}

      {latestReport ? (
        <ReportCard report={latestReport} />
      ) : (
        <div className="text-center py-8 text-sm text-text-tertiary">
          {isFriday
            ? 'Click "Generate Report" to create this week\'s report.'
            : "Reports auto-generate on Friday afternoons. You can also generate one manually."}
        </div>
      )}
    </div>
  );
}
