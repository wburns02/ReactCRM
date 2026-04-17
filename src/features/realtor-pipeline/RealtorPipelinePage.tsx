import { useState, useMemo } from "react";
import { useRealtorStore } from "./store";
import { getFollowUpUrgency, isDueForFollowUp } from "./scoring";
import {
  REALTOR_STAGE_LABELS,
  REALTOR_STAGE_COLORS,
  REALTOR_STAGES,
} from "./types";
import type { RealtorStage, RealtorPipelineStats } from "./types";
import {
  Building2,
  Users,
  Phone,
  TrendingUp,
  AlertCircle,
  Plus,
  Search,
  LayoutGrid,
  List,
  Trophy,
  Clock,
} from "lucide-react";

type ViewTab = "pipeline" | "table" | "followup" | "leaderboard";

export function RealtorPipelinePage() {
  const [activeTab, setActiveTab] = useState<ViewTab>("pipeline");
  const [searchQuery, setSearchQuery] = useState("");

  const agents = useRealtorStore((s) => s.agents);
  const referrals = useRealtorStore((s) => s.referrals);
  const stageFilter = useRealtorStore((s) => s.stageFilter);
  const setStageFilter = useRealtorStore((s) => s.setStageFilter);

  const stats: RealtorPipelineStats = useMemo(() => {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const thisMonthStr = thisMonth.toISOString();

    const monthReferrals = referrals.filter(
      (r) => r.referred_date >= thisMonthStr,
    );

    return {
      total_agents: agents.length,
      cold: agents.filter((a) => a.stage === "cold").length,
      introd: agents.filter((a) => a.stage === "introd").length,
      warm: agents.filter((a) => a.stage === "warm").length,
      active_referrer: agents.filter((a) => a.stage === "active_referrer").length,
      referrals_this_month: monthReferrals.length,
      revenue_this_month: monthReferrals.reduce(
        (sum, r) => sum + (r.invoice_amount || 0),
        0,
      ),
      agents_due_followup: agents.filter(isDueForFollowUp).length,
    };
  }, [agents, referrals]);

  const filteredAgents = useMemo(() => {
    let result = agents;
    if (stageFilter !== "all") {
      result = result.filter((a) => a.stage === stageFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.first_name.toLowerCase().includes(q) ||
          a.last_name.toLowerCase().includes(q) ||
          (a.brokerage && a.brokerage.toLowerCase().includes(q)) ||
          a.phone.includes(q) ||
          (a.email && a.email.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [agents, stageFilter, searchQuery]);

  const tabs: Array<{ id: ViewTab; label: string; icon: typeof LayoutGrid }> = [
    { id: "pipeline", label: "Pipeline", icon: LayoutGrid },
    { id: "table", label: "Table", icon: List },
    { id: "followup", label: "Follow-Up", icon: Clock },
    { id: "leaderboard", label: "Leaderboard", icon: Trophy },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Realtor Pipeline
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage real estate agent relationships and referral tracking
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Agent
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard
          label="Total Agents"
          value={stats.total_agents}
          icon={<Users className="w-4 h-4" />}
        />
        {REALTOR_STAGES.map((stage) => (
          <button
            key={stage}
            onClick={() =>
              setStageFilter(stageFilter === stage ? "all" : stage)
            }
            className={`rounded-lg p-3 text-left transition-all border ${
              stageFilter === stage
                ? "border-primary ring-2 ring-primary/20"
                : "border-border hover:border-primary/40"
            } bg-bg-card`}
          >
            <div className="text-xs text-text-secondary">
              {REALTOR_STAGE_LABELS[stage]}
            </div>
            <div className="text-xl font-bold text-text-primary">
              {stats[stage]}
            </div>
          </button>
        ))}
        <StatCard
          label="Referrals (Month)"
          value={stats.referrals_this_month}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          label="Revenue (Month)"
          value={`$${stats.revenue_this_month.toLocaleString()}`}
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </div>

      {/* Due for Follow-Up Alert */}
      {stats.agents_due_followup > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <span className="text-sm text-amber-800 dark:text-amber-200 font-medium">
            {stats.agents_due_followup} agent{stats.agents_due_followup !== 1 ? "s" : ""} due for follow-up
          </span>
          <button
            onClick={() => setActiveTab("followup")}
            className="ml-auto text-sm text-amber-700 dark:text-amber-300 underline hover:no-underline"
          >
            View queue
          </button>
        </div>
      )}

      {/* Search + Tabs */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            placeholder="Search agents by name, brokerage, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-bg-card text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex bg-bg-card border border-border rounded-lg overflow-hidden">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "pipeline" && (
          <PipelineView agents={filteredAgents} />
        )}
        {activeTab === "table" && (
          <TableView agents={filteredAgents} />
        )}
        {activeTab === "followup" && (
          <FollowUpView agents={agents} />
        )}
        {activeTab === "leaderboard" && (
          <LeaderboardView agents={agents} referrals={referrals} />
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg p-3 bg-bg-card border border-border">
      <div className="flex items-center gap-1.5 text-xs text-text-secondary mb-1">
        {icon}
        {label}
      </div>
      <div className="text-xl font-bold text-text-primary">{value}</div>
    </div>
  );
}

/** Kanban pipeline view */
function PipelineView({ agents }: { agents: import("./types").RealtorAgent[] }) {
  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Building2 className="w-12 h-12 text-text-secondary/30 mb-4" />
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          No agents yet
        </h3>
        <p className="text-sm text-text-secondary max-w-md">
          Add your first realtor agent to start building your referral pipeline.
          Import a list or add agents manually.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {REALTOR_STAGES.map((stage) => {
        const stageAgents = agents.filter((a) => a.stage === stage);
        return (
          <div key={stage} className="flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 mb-2">
              <span
                className={`text-xs font-bold px-2 py-1 rounded-full ${REALTOR_STAGE_COLORS[stage]}`}
              >
                {REALTOR_STAGE_LABELS[stage]}
              </span>
              <span className="text-xs text-text-secondary font-medium">
                {stageAgents.length}
              </span>
            </div>
            <div className="space-y-2 min-h-[200px]">
              {stageAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Compact agent card for the pipeline board */
function AgentCard({ agent }: { agent: import("./types").RealtorAgent }) {
  const urgency = getFollowUpUrgency(agent);
  const daysSince = agent.last_call_date
    ? Math.floor(
        (Date.now() - new Date(agent.last_call_date).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  return (
    <div className="bg-bg-card border border-border rounded-lg p-3 hover:border-primary/40 transition-colors cursor-pointer">
      <div className="flex items-start justify-between mb-1.5">
        <div>
          <div className="font-semibold text-sm text-text-primary">
            {agent.first_name} {agent.last_name}
          </div>
          {agent.brokerage && (
            <div className="text-xs text-text-secondary">{agent.brokerage}</div>
          )}
        </div>
        {urgency >= 70 && (
          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 mt-1.5" title="Due for follow-up" />
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-text-secondary">
        <span className="flex items-center gap-1">
          <Phone className="w-3 h-3" />
          {agent.call_attempts} calls
        </span>
        {agent.total_referrals > 0 && (
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {agent.total_referrals} ref
          </span>
        )}
        {daysSince !== null && (
          <span className={daysSince > 21 ? "text-amber-600" : ""}>
            {daysSince}d ago
          </span>
        )}
      </div>
    </div>
  );
}

/** Table view placeholder */
function TableView({ agents }: { agents: import("./types").RealtorAgent[] }) {
  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <List className="w-12 h-12 text-text-secondary/30 mb-4" />
        <h3 className="text-lg font-semibold text-text-primary mb-2">No agents to display</h3>
        <p className="text-sm text-text-secondary">Add agents or adjust your filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-text-secondary">
            <th className="pb-3 pr-4 font-medium">Name</th>
            <th className="pb-3 pr-4 font-medium">Brokerage</th>
            <th className="pb-3 pr-4 font-medium">Phone</th>
            <th className="pb-3 pr-4 font-medium">Stage</th>
            <th className="pb-3 pr-4 font-medium">Calls</th>
            <th className="pb-3 pr-4 font-medium">Referrals</th>
            <th className="pb-3 pr-4 font-medium">Revenue</th>
            <th className="pb-3 font-medium">Last Contact</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr
              key={agent.id}
              className="border-b border-border/50 hover:bg-bg-hover transition-colors cursor-pointer"
            >
              <td className="py-3 pr-4 font-medium text-text-primary">
                {agent.first_name} {agent.last_name}
              </td>
              <td className="py-3 pr-4 text-text-secondary">
                {agent.brokerage || "—"}
              </td>
              <td className="py-3 pr-4 text-text-secondary">{agent.phone}</td>
              <td className="py-3 pr-4">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${REALTOR_STAGE_COLORS[agent.stage]}`}
                >
                  {REALTOR_STAGE_LABELS[agent.stage]}
                </span>
              </td>
              <td className="py-3 pr-4 text-text-secondary">
                {agent.call_attempts}
              </td>
              <td className="py-3 pr-4 text-text-secondary">
                {agent.total_referrals}
              </td>
              <td className="py-3 pr-4 text-text-secondary">
                ${agent.total_revenue.toLocaleString()}
              </td>
              <td className="py-3 text-text-secondary">
                {agent.last_call_date
                  ? new Date(agent.last_call_date).toLocaleDateString()
                  : "Never"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Follow-up queue */
function FollowUpView({ agents }: { agents: import("./types").RealtorAgent[] }) {
  const dueAgents = useMemo(
    () =>
      agents
        .filter(isDueForFollowUp)
        .sort((a, b) => getFollowUpUrgency(b) - getFollowUpUrgency(a)),
    [agents],
  );

  if (dueAgents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Clock className="w-12 h-12 text-emerald-400/30 mb-4" />
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          All caught up!
        </h3>
        <p className="text-sm text-text-secondary">
          No agents are due for follow-up right now.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {dueAgents.map((agent) => {
        const urgency = getFollowUpUrgency(agent);
        const daysSince = agent.last_call_date
          ? Math.floor(
              (Date.now() - new Date(agent.last_call_date).getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : null;

        return (
          <div
            key={agent.id}
            className={`flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer hover:border-primary/40 ${
              urgency >= 90
                ? "bg-red-50 dark:bg-red-950/10 border-red-200 dark:border-red-800"
                : urgency >= 70
                  ? "bg-amber-50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800"
                  : "bg-bg-card border-border"
            }`}
          >
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                urgency >= 90
                  ? "bg-red-100 text-red-700"
                  : urgency >= 70
                    ? "bg-amber-100 text-amber-700"
                    : "bg-blue-100 text-blue-700"
              }`}
            >
              {urgency}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-text-primary">
                {agent.first_name} {agent.last_name}
              </div>
              <div className="text-xs text-text-secondary">
                {agent.brokerage || "No brokerage"} &middot;{" "}
                <span
                  className={`font-medium px-1.5 py-0.5 rounded-full ${REALTOR_STAGE_COLORS[agent.stage]}`}
                >
                  {REALTOR_STAGE_LABELS[agent.stage]}
                </span>
              </div>
            </div>
            <div className="text-right text-sm">
              <div className="text-text-secondary">
                {daysSince !== null ? `${daysSince} days ago` : "Never contacted"}
              </div>
              {agent.last_disposition && (
                <div className="text-xs text-text-secondary">
                  Last: {agent.last_disposition.replace(/_/g, " ")}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Leaderboard view */
function LeaderboardView({
  agents,
  referrals,
}: {
  agents: import("./types").RealtorAgent[];
  referrals: import("./types").Referral[];
}) {
  const ranked = useMemo(
    () =>
      agents
        .filter((a) => a.total_referrals > 0)
        .sort((a, b) => b.total_referrals - a.total_referrals),
    [agents],
  );

  if (ranked.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Trophy className="w-12 h-12 text-amber-400/30 mb-4" />
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          No referrals yet
        </h3>
        <p className="text-sm text-text-secondary max-w-md">
          When agents start sending referrals, their rankings will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
        Top Referral Partners
      </h3>
      {ranked.map((agent, idx) => (
        <div
          key={agent.id}
          className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
            idx === 0
              ? "bg-amber-50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800"
              : idx === 1
                ? "bg-slate-50 dark:bg-slate-950/10 border-slate-200 dark:border-slate-800"
                : idx === 2
                  ? "bg-orange-50 dark:bg-orange-950/10 border-orange-200 dark:border-orange-800"
                  : "bg-bg-card border-border"
          }`}
        >
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
              idx === 0
                ? "bg-amber-200 text-amber-800"
                : idx === 1
                  ? "bg-slate-200 text-slate-700"
                  : idx === 2
                    ? "bg-orange-200 text-orange-800"
                    : "bg-bg-hover text-text-secondary"
            }`}
          >
            #{idx + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-text-primary">
              {agent.first_name} {agent.last_name}
            </div>
            <div className="text-xs text-text-secondary">
              {agent.brokerage || "Independent"}
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-text-primary">
              {agent.total_referrals} referral{agent.total_referrals !== 1 ? "s" : ""}
            </div>
            <div className="text-sm text-emerald-600 font-medium">
              ${agent.total_revenue.toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
