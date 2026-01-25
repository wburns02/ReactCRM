import { useState } from "react";
import {
  useIndustryBenchmarks,
  useCompetitiveAnalysis,
  usePeerComparison,
} from "@/api/hooks/useEnterpriseBenchmarkingAI";
import { Button } from "@/components/ui/Button";

/**
 * AI-powered enterprise benchmarking panel
 * Compares business performance against industry standards and peers
 */
export function BenchmarkingPanel() {
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "benchmarks" | "competitive" | "peers"
  >("benchmarks");

  const { data: benchmarks, isLoading: loadingBenchmarks } =
    useIndustryBenchmarks();
  const { data: competitive, isLoading: loadingCompetitive } =
    useCompetitiveAnalysis();
  const { data: peers, isLoading: loadingPeers } = usePeerComparison();

  const isLoading = loadingBenchmarks || loadingCompetitive || loadingPeers;

  const getTrendColor = (trend: "above" | "at" | "below") => {
    switch (trend) {
      case "above":
        return "text-green-400";
      case "below":
        return "text-red-400";
      default:
        return "text-yellow-400";
    }
  };

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 75) return "bg-green-500";
    if (percentile >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getPositionBadge = (position: string) => {
    switch (position) {
      case "leader":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "challenger":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "follower":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="flex items-center gap-2 text-sm text-purple-500 hover:text-purple-400 transition-colors"
      >
        <span>&#10024;</span>
        <span>AI Benchmarking Insights</span>
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">&#10024;</span>
          <h4 className="font-medium text-text-primary">
            AI Benchmarking Analysis
          </h4>
        </div>
        <button
          onClick={() => setShowPanel(false)}
          className="text-text-muted hover:text-text-primary text-sm"
        >
          Close
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {(["benchmarks", "competitive", "peers"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "bg-purple-600 text-white"
                : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
            }`}
          >
            {tab === "benchmarks"
              ? "Industry Benchmarks"
              : tab === "competitive"
                ? "Competitive Analysis"
                : "Peer Comparison"}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-text-secondary py-4">
          <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full" />
          <span className="text-sm">Analyzing benchmarks...</span>
        </div>
      )}

      {/* Industry Benchmarks Tab */}
      {activeTab === "benchmarks" && benchmarks && !loadingBenchmarks && (
        <div className="space-y-3">
          {/* Category groupings */}
          {["financial", "operational", "customer", "efficiency"].map(
            (category) => {
              const categoryBenchmarks = benchmarks.filter(
                (b) => b.category === category,
              );
              if (categoryBenchmarks.length === 0) return null;

              return (
                <div key={category}>
                  <span className="text-xs text-text-muted uppercase tracking-wide block mb-2">
                    {category}
                  </span>
                  <div className="space-y-2">
                    {categoryBenchmarks.map((benchmark, i) => (
                      <div
                        key={i}
                        className="bg-bg-card border border-border rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-text-primary text-sm">
                            {benchmark.metric}
                          </span>
                          <span
                            className={`text-xs font-medium ${getTrendColor(benchmark.trend)}`}
                          >
                            {benchmark.trend === "above"
                              ? "Above Avg"
                              : benchmark.trend === "below"
                                ? "Below Avg"
                                : "At Avg"}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                          <div>
                            <span className="text-text-muted block">You</span>
                            <span className="text-text-primary font-bold">
                              {typeof benchmark.your_value === "number" &&
                              benchmark.your_value > 1000
                                ? `${(benchmark.your_value / 1000).toFixed(0)}k`
                                : benchmark.your_value}
                            </span>
                          </div>
                          <div>
                            <span className="text-text-muted block">
                              Industry
                            </span>
                            <span className="text-text-secondary">
                              {typeof benchmark.industry_average === "number" &&
                              benchmark.industry_average > 1000
                                ? `${(benchmark.industry_average / 1000).toFixed(0)}k`
                                : benchmark.industry_average}
                            </span>
                          </div>
                          <div>
                            <span className="text-text-muted block">
                              Top 10%
                            </span>
                            <span className="text-green-400">
                              {typeof benchmark.top_performers === "number" &&
                              benchmark.top_performers > 1000
                                ? `${(benchmark.top_performers / 1000).toFixed(0)}k`
                                : benchmark.top_performers}
                            </span>
                          </div>
                        </div>
                        {/* Percentile bar */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getPercentileColor(benchmark.percentile)}`}
                              style={{ width: `${benchmark.percentile}%` }}
                            />
                          </div>
                          <span className="text-xs text-text-muted">
                            {benchmark.percentile}th
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            },
          )}
        </div>
      )}

      {/* Competitive Analysis Tab */}
      {activeTab === "competitive" && competitive && !loadingCompetitive && (
        <div className="space-y-4">
          {/* Overall Score */}
          <div className="bg-bg-card border border-border rounded-lg p-4 text-center">
            <span className="text-xs text-text-muted block mb-1">
              Market Position Score
            </span>
            <span className="text-3xl font-bold text-text-primary">
              {competitive.overall_score}
            </span>
            <span className="text-xs text-text-muted">/100</span>
            <div className="mt-2">
              <span
                className={`text-xs px-2 py-1 rounded border ${getPositionBadge(competitive.market_position)}`}
              >
                {competitive.market_position.charAt(0).toUpperCase() +
                  competitive.market_position.slice(1)}
              </span>
            </div>
          </div>

          {/* Strengths */}
          <div>
            <span className="text-xs text-text-muted block mb-2">
              Strengths
            </span>
            <div className="space-y-2">
              {competitive.strengths.map((s, i) => (
                <div
                  key={i}
                  className="bg-green-500/10 border border-green-500/30 rounded-lg p-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-400">
                      {s.area}
                    </span>
                    <span className="text-xs text-green-400">{s.score}%</span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    {s.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Weaknesses */}
          <div>
            <span className="text-xs text-text-muted block mb-2">
              Areas for Improvement
            </span>
            <div className="space-y-2">
              {competitive.weaknesses.map((w, i) => (
                <div
                  key={i}
                  className="bg-red-500/10 border border-red-500/30 rounded-lg p-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-red-400">
                      {w.area}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        w.improvement_priority === "high"
                          ? "bg-red-500/20 text-red-400"
                          : w.improvement_priority === "medium"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {w.improvement_priority}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    {w.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Opportunities */}
          <div>
            <span className="text-xs text-text-muted block mb-2">
              Growth Opportunities
            </span>
            <div className="space-y-2">
              {competitive.opportunities.map((o, i) => (
                <div
                  key={i}
                  className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2"
                >
                  <span className="text-sm font-medium text-purple-400">
                    {o.title}
                  </span>
                  <p className="text-xs text-text-secondary mt-1">
                    {o.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="text-green-400">
                      ${(o.market_size_potential / 1000).toFixed(0)}k potential
                    </span>
                    <span className="text-text-muted">{o.time_to_value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Peer Comparison Tab */}
      {activeTab === "peers" && peers && !loadingPeers && (
        <div className="space-y-4">
          {/* Rank Card */}
          <div className="bg-bg-card border border-border rounded-lg p-4 text-center">
            <span className="text-xs text-text-muted block mb-1">
              Your Rank
            </span>
            <span className="text-3xl font-bold text-primary">
              #{peers.your_rank}
            </span>
            <span className="text-xs text-text-muted block">
              of {peers.peer_count} peers
            </span>
            <p className="text-xs text-text-secondary mt-2">
              {peers.peer_group}
            </p>
          </div>

          {/* Metrics Comparison */}
          <div className="space-y-2">
            {peers.metrics.map((m, i) => {
              const isGood =
                m.better_if === "higher"
                  ? m.your_value > m.peer_average
                  : m.your_value < m.peer_average;

              return (
                <div
                  key={i}
                  className="bg-bg-card border border-border rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-primary">
                      {m.name}
                    </span>
                    <span
                      className={`text-sm font-bold ${isGood ? "text-green-400" : "text-red-400"}`}
                    >
                      {m.unit === "$"
                        ? `$${m.your_value.toLocaleString()}`
                        : `${m.your_value}${m.unit}`}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-text-muted">Peer Avg</span>
                      <span className="text-text-secondary block">
                        {m.unit === "$"
                          ? `$${m.peer_average.toLocaleString()}`
                          : `${m.peer_average}${m.unit}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted">Best</span>
                      <span className="text-green-400 block">
                        {m.unit === "$"
                          ? `$${m.peer_best.toLocaleString()}`
                          : `${m.peer_best}${m.unit}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recommendations */}
          <div>
            <span className="text-xs text-text-muted block mb-2">
              AI Recommendations
            </span>
            <div className="space-y-2">
              {peers.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="bg-bg-card border border-border rounded-lg p-2 flex gap-2"
                >
                  <span className="text-purple-400">{"→"}</span>
                  <p className="text-xs text-text-secondary">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Button
        size="sm"
        variant="secondary"
        className="w-full mt-4"
        onClick={() => window.location.reload()}
      >
        Refresh Benchmarks
      </Button>
    </div>
  );
}
