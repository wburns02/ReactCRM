import { useState, useCallback } from "react";
import { Calendar, FileText, Headphones, LayoutDashboard } from "lucide-react";
import { useOutboundStore } from "../../store";
import { useDanniaStore } from "../danniaStore";
import { TodaysPlan } from "./TodaysPlan";
import { WeeklyCalendarView } from "./WeeklyCalendarView";
import { WeeklyReportView } from "./WeeklyReportView";
import { AuditLogPanel } from "./AuditLogPanel";
import { PowerDialer } from "../../components/PowerDialer";
import { CallReviewPanel } from "./CallReviewPanel";

type DanniaTab = "today" | "week" | "report" | "calls";

export function DanniaDashboard() {
  const [activeTab, setActiveTab] = useState<DanniaTab>("today");
  const campaigns = useOutboundStore((s) => s.campaigns);
  const dialingActive = useDanniaStore((s) => s.dialingActive);
  const setDialingActive = useDanniaStore((s) => s.setDialingActive);

  // Find first active campaign for the dialer
  const activeCampaign = campaigns.find((c) => c.status === "active");

  const handleStartDialing = useCallback(() => {
    if (dialingActive) {
      setDialingActive(false);
      useOutboundStore.getState().stopDialer();
    } else {
      setDialingActive(true);
      if (activeCampaign) {
        const store = useOutboundStore.getState();
        store.setActiveCampaign(activeCampaign.id);
        store.setAutoDialEnabled(true);
        store.setSortOrder("smart");
        store.startDialer();
      }
    }
  }, [dialingActive, activeCampaign, setDialingActive]);

  const tabs: { id: DanniaTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "today", label: "Today", icon: LayoutDashboard },
    { id: "week", label: "Week", icon: Calendar },
    { id: "report", label: "Report", icon: FileText },
    { id: "calls", label: "My Calls", icon: Headphones },
  ];

  return (
    <div className="space-y-4">
      {/* Dialer overlay when active */}
      {dialingActive && activeCampaign && (
        <div className="dannia-enter bg-bg-card dannia-dialer-border rounded-2xl p-4">
          <PowerDialer campaignId={activeCampaign.id} />
        </div>
      )}

      {/* Only show dashboard content when not actively dialing */}
      {!dialingActive && (
        <>
          {/* Tab content */}
          {activeTab === "today" && (
            <TodaysPlan
              onStartDialing={handleStartDialing}
              dialingActive={dialingActive}
            />
          )}
          {activeTab === "week" && (
            <div className="dannia-enter dannia-enter-delay-1">
              <WeeklyCalendarView />
            </div>
          )}
          {activeTab === "report" && (
            <div className="dannia-enter dannia-enter-delay-1">
              <WeeklyReportView />
            </div>
          )}
          {activeTab === "calls" && (
            <div className="dannia-enter dannia-enter-delay-1">
              <CallReviewPanel />
            </div>
          )}

          {/* Audit log (admin only) */}
          <AuditLogPanel />
        </>
      )}

      {/* Sub-tabs — pill style */}
      <div className="flex justify-center pt-2">
        <div className="inline-flex gap-1 p-1 bg-bg-hover/60 rounded-xl border border-border/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (dialingActive) {
                  setDialingActive(false);
                  useOutboundStore.getState().stopDialer();
                }
                setActiveTab(tab.id);
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id && !dialingActive
                  ? "dannia-tab-active shadow-sm"
                  : "text-text-tertiary hover:text-text-secondary hover:bg-bg-hover"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
