import { useCallback } from "react";
import { useDanniaStore } from "./danniaStore";
import { useOutboundStore } from "../store";
import { usePdfExport } from "@/hooks/usePdfExport";
import { getWeekStart, getWeekEnd } from "./scheduleAlgorithm";
import { DAY_NAMES } from "./constants";
import type { WeeklyReport } from "./types";

/**
 * Hook for generating weekly reports and exporting to PDF.
 */
export function useWeeklyReport() {
  const performanceMetrics = useDanniaStore((s) => s.performanceMetrics);
  const currentSchedule = useDanniaStore((s) => s.currentSchedule);
  const addWeeklyReport = useDanniaStore((s) => s.addWeeklyReport);
  const addAuditEntry = useDanniaStore((s) => s.addAuditEntry);
  const allContacts = useOutboundStore((s) => s.contacts);
  const campaigns = useOutboundStore((s) => s.campaigns);
  const { exportPdf, isExporting } = usePdfExport();

  const generateReport = useCallback(() => {
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();
    const hourlyData = performanceMetrics.hourlyData;

    // Aggregate data from hourly metrics for this week
    const weekDates = new Set<string>();
    const today = new Date();
    for (let i = 0; i < 5; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      if (d <= today) {
        weekDates.add(d.toISOString().split("T")[0]);
      }
    }

    const weekHourly = hourlyData.filter((h) => weekDates.has(h.date));
    const totalCalls = weekHourly.reduce((s, h) => s + h.callsMade, 0);
    const totalConnected = weekHourly.reduce((s, h) => s + h.connected, 0);
    const totalInterested = weekHourly.reduce((s, h) => s + h.interested, 0);
    const totalVoicemails = weekHourly.reduce((s, h) => s + h.voicemails, 0);
    const totalNoAnswer = weekHourly.reduce((s, h) => s + h.noAnswers, 0);

    const connectRate = totalCalls > 0 ? (totalConnected / totalCalls) * 100 : 0;
    const interestRate =
      totalConnected > 0 ? (totalInterested / totalConnected) * 100 : 0;

    // Count contracts saved (interested contacts)
    const contractsSaved = totalInterested;
    const revenueEstimate = contractsSaved * 250; // $250 avg contract value estimate

    // Find best time block
    const blockPerf = new Map<number, { calls: number; connects: number }>();
    for (const h of weekHourly) {
      const existing = blockPerf.get(h.hour) ?? { calls: 0, connects: 0 };
      existing.calls += h.callsMade;
      existing.connects += h.connected;
      blockPerf.set(h.hour, existing);
    }
    let bestHour = 10;
    let bestHourRate = 0;
    for (const [hour, stats] of blockPerf) {
      if (stats.calls >= 3) {
        const rate = stats.connects / stats.calls;
        if (rate > bestHourRate) {
          bestHourRate = rate;
          bestHour = hour;
        }
      }
    }
    const bestTimeBlock = `${bestHour > 12 ? bestHour - 12 : bestHour}${bestHour >= 12 ? "PM" : "AM"} block`;

    // Find best zone
    const activeCampaigns = campaigns.filter((c) => c.status === "active");
    const zones = new Map<string, number>();
    for (const campaign of activeCampaigns) {
      const campContacts = allContacts.filter(
        (c) => c.campaign_id === campaign.id && c.call_status === "interested",
      );
      for (const c of campContacts) {
        if (c.service_zone) {
          zones.set(c.service_zone, (zones.get(c.service_zone) ?? 0) + 1);
        }
      }
    }
    let bestZone = "—";
    let bestZoneCount = 0;
    for (const [zone, count] of zones) {
      if (count > bestZoneCount) {
        bestZone = zone;
        bestZoneCount = count;
      }
    }

    // Daily breakdown
    const dailyBreakdown = Array.from(weekDates)
      .sort()
      .map((date) => {
        const dayHourly = weekHourly.filter((h) => h.date === date);
        const dayCalls = dayHourly.reduce((s, h) => s + h.callsMade, 0);
        const dayConnected = dayHourly.reduce((s, h) => s + h.connected, 0);
        const dayInterested = dayHourly.reduce((s, h) => s + h.interested, 0);
        const dayOfWeek = new Date(date + "T12:00:00").getDay();
        return {
          date,
          dayLabel: DAY_NAMES[dayOfWeek],
          calls: dayCalls,
          connected: dayConnected,
          interested: dayInterested,
          connectRate: dayCalls > 0 ? (dayConnected / dayCalls) * 100 : 0,
        };
      });

    // Find best day
    const bestDay =
      dailyBreakdown.reduce(
        (best, day) =>
          day.connectRate > (best?.connectRate ?? 0) && day.calls >= 5
            ? day
            : best,
        null as (typeof dailyBreakdown)[0] | null,
      )?.dayLabel ?? "—";

    // Generate suggestions
    const suggestions: string[] = [];
    if (connectRate < 20) {
      suggestions.push(
        "Connect rate is below 20%. Consider focusing on Zone 1 and Zone 2 for higher density.",
      );
    }
    if (connectRate >= 25) {
      suggestions.push(
        "Great connect rate! Consider expanding to Zone 4 and 5 to broaden reach.",
      );
    }
    if (totalCalls < 100) {
      suggestions.push(
        "Call volume is below target. Aim for 35 calls/day to maximize coverage.",
      );
    }
    if (bestHourRate > 0.3) {
      suggestions.push(
        `${bestTimeBlock} has the highest connect rate (${(bestHourRate * 100).toFixed(0)}%). Schedule high-priority contacts during this time.`,
      );
    }
    if (totalVoicemails > totalConnected) {
      suggestions.push(
        "Voicemail rate exceeds connect rate. Consider adjusting call times for better reach.",
      );
    }
    if (suggestions.length === 0) {
      suggestions.push("Performance is on track. Keep up the great work!");
    }

    const report: WeeklyReport = {
      id: crypto.randomUUID(),
      weekStart,
      weekEnd,
      generatedAt: new Date().toISOString(),
      totalCalls,
      totalConnected,
      totalInterested,
      totalVoicemails,
      totalNoAnswer,
      connectRate,
      interestRate,
      contractsSaved,
      revenueEstimate,
      bestTimeBlock,
      bestZone,
      bestDay,
      dailyBreakdown,
      suggestions,
    };

    addWeeklyReport(report);
    addAuditEntry({
      action: "schedule_generated",
      reason: `Weekly report generated for ${weekStart}`,
      details: { totalCalls, connectRate: connectRate.toFixed(1) },
    });

    return report;
  }, [
    performanceMetrics,
    currentSchedule,
    allContacts,
    campaigns,
    addWeeklyReport,
    addAuditEntry,
  ]);

  const downloadPdf = useCallback(
    (report: WeeklyReport) => {
      exportPdf((doc) => {
        const pageWidth = doc.internal.pageSize.getWidth();

        // Title
        doc.setFontSize(18);
        doc.text("Weekly Outbound Report", pageWidth / 2, 20, {
          align: "center",
        });

        doc.setFontSize(10);
        doc.text(
          `Week of ${report.weekStart} to ${report.weekEnd}`,
          pageWidth / 2,
          28,
          { align: "center" },
        );
        doc.text(
          `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
          pageWidth / 2,
          34,
          { align: "center" },
        );

        // Summary stats
        let y = 48;
        doc.setFontSize(12);
        doc.text("Summary", 14, y);
        y += 8;
        doc.setFontSize(10);

        const stats = [
          ["Total Calls", String(report.totalCalls)],
          ["Connected", String(report.totalConnected)],
          ["Interested", String(report.totalInterested)],
          [
            "Connect Rate",
            `${report.connectRate.toFixed(1)}%`,
          ],
          [
            "Interest Rate",
            `${report.interestRate.toFixed(1)}%`,
          ],
          ["Contracts Saved", String(report.contractsSaved)],
          [
            "Est. Revenue",
            `$${report.revenueEstimate.toLocaleString()}`,
          ],
        ];

        for (const [label, value] of stats) {
          doc.text(`${label}: ${value}`, 20, y);
          y += 6;
        }

        // Best performing
        y += 6;
        doc.setFontSize(12);
        doc.text("Best Performing", 14, y);
        y += 8;
        doc.setFontSize(10);
        doc.text(`Time Block: ${report.bestTimeBlock}`, 20, y);
        y += 6;
        doc.text(`Zone: ${report.bestZone}`, 20, y);
        y += 6;
        doc.text(`Day: ${report.bestDay}`, 20, y);
        y += 10;

        // Daily breakdown
        doc.setFontSize(12);
        doc.text("Daily Breakdown", 14, y);
        y += 8;
        doc.setFontSize(9);
        doc.text("Day", 20, y);
        doc.text("Calls", 60, y);
        doc.text("Connected", 85, y);
        doc.text("Interested", 115, y);
        doc.text("Connect %", 148, y);
        y += 6;

        for (const day of report.dailyBreakdown) {
          doc.text(day.dayLabel, 20, y);
          doc.text(String(day.calls), 60, y);
          doc.text(String(day.connected), 85, y);
          doc.text(String(day.interested), 115, y);
          doc.text(`${day.connectRate.toFixed(0)}%`, 148, y);
          y += 5;
        }

        // Suggestions
        y += 8;
        doc.setFontSize(12);
        doc.text("Optimization Suggestions", 14, y);
        y += 8;
        doc.setFontSize(9);
        for (const suggestion of report.suggestions) {
          const lines = doc.splitTextToSize(`- ${suggestion}`, pageWidth - 34);
          doc.text(lines, 20, y);
          y += lines.length * 5;
        }

        // Footer
        doc.setFontSize(8);
        doc.text(
          "Mac Septic - ReactCRM Outbound Report",
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" },
        );

        doc.save(`weekly-report-${report.weekStart}.pdf`);
      });
    },
    [exportPdf],
  );

  return {
    generateReport,
    downloadPdf,
    isExporting,
  };
}
