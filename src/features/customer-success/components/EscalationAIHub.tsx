/**
 * Escalation AI Hub - The "12-Year-Old" Dashboard
 *
 * The main AI-guided escalation interface that makes achieving
 * 95% CSAT and 85 NPS foolproof.
 *
 * Features:
 * - Proactive alerts at the top
 * - Action queue with priority scoring
 * - AI guidance panel for selected escalations
 * - Gamification dashboard
 * - Toggle between AI view and classic view
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AIGuidancePanel } from "./AIGuidancePanel";
import { ActionQueue } from "./ActionQueue";
import { ProactiveAlerts } from "./ProactiveAlerts";
import { GamificationDashboard } from "./GamificationDashboard";

type ViewMode = "ai" | "classic" | "stats";

export function EscalationAIHub() {
  const [selectedEscalationId, setSelectedEscalationId] = useState<
    number | null
  >(null);
  const [viewMode, setViewMode] = useState<ViewMode>("ai");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Escalation Command Center
          </h1>
          <p className="text-text-muted">AI-guided escalation resolution</p>
        </div>

        {/* View Toggle */}
        <div className="flex bg-bg-hover rounded-lg p-1">
          {[
            { id: "ai", label: "AI View", icon: "🤖" },
            { id: "classic", label: "Classic", icon: "📋" },
            { id: "stats", label: "My Stats", icon: "📊" },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id as ViewMode)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2",
                viewMode === mode.id
                  ? "bg-primary text-white"
                  : "text-text-muted hover:text-text-primary",
              )}
            >
              <span>{mode.icon}</span>
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "stats" ? (
        <GamificationDashboard />
      ) : viewMode === "ai" ? (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Alerts & Queue */}
          <div className="space-y-6">
            {/* Proactive Alerts */}
            <ProactiveAlerts onSelectEscalation={setSelectedEscalationId} />

            {/* Action Queue */}
            <ActionQueue
              onSelectEscalation={setSelectedEscalationId}
              onActionTaken={(id, _action) => {
                setSelectedEscalationId(id);
              }}
            />
          </div>

          {/* Right Column - AI Guidance */}
          <div>
            {selectedEscalationId ? (
              <div className="sticky top-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-text-primary">
                    AI Guidance
                  </h2>
                  <button
                    onClick={() => setSelectedEscalationId(null)}
                    className="text-text-muted hover:text-text-primary"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <AIGuidancePanel
                  escalationId={selectedEscalationId}
                  onActionTaken={(_action) => {
                    // TODO: Handle post-action logic
                  }}
                />
              </div>
            ) : (
              <div className="bg-bg-card border-2 border-dashed border-border rounded-xl p-12 text-center">
                <div className="text-6xl mb-4">👈</div>
                <h3 className="text-xl font-bold text-text-primary mb-2">
                  Select an Escalation
                </h3>
                <p className="text-text-muted">
                  Click on any escalation from the queue to see AI guidance on
                  what to do next
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Classic View - Could import the original EscalationManagement here */
        <div className="bg-bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-text-muted">
            Classic view shows the traditional escalation grid.
            <br />
            Switch to AI View for guided assistance.
          </p>
        </div>
      )}
    </div>
  );
}

export default EscalationAIHub;
