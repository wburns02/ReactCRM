import { useState, useEffect } from "react";
import { apiClient } from "@/api/client";

interface TechPerf {
  id: string;
  name: string;
  total_jobs: number;
  completed_jobs: number;
  completion_rate: number;
  avg_jobs_per_week: number;
  top_job_type: string;
  needs_coaching: boolean;
}

interface Recommendation {
  type: string;
  target: string;
  severity: string;
  title: string;
  detail: string;
  action: string;
}

interface CallInsight {
  total_calls: number;
  answered_calls: number;
  missed_calls: number;
  avg_duration_seconds: number;
  answer_rate: number;
  peak_hour: number | null;
  by_direction: { direction: string; count: number }[];
  by_result: { result: string; count: number }[];
  calls_by_day: { day: string; count: number }[];
  booking_conversion_rate: number;
  avg_calls_per_day: number;
}

interface TeamBenchmarks {
  team_size: number;
  total_jobs: number;
  avg_completion_rate: number;
  avg_jobs_per_tech_per_week: number;
  top_performer: { name: string; completion_rate: number; total_jobs: number } | null;
  needs_coaching_count: number;
  job_type_distribution: { job_type: string; count: number; percentage: number }[];
}

export function CoachingPage() {
  const [performance, setPerformance] = useState<TechPerf[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [callInsights, setCallInsights] = useState<CallInsight | null>(null);
  const [benchmarks, setBenchmarks] = useState<TeamBenchmarks | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [perfRes, recRes, callRes, benchRes] = await Promise.allSettled([
          apiClient.get("/coaching/technician-performance"),
          apiClient.get("/coaching/recommendations"),
          apiClient.get("/coaching/call-insights"),
          apiClient.get("/coaching/team-benchmarks"),
        ]);
        if (perfRes.status === "fulfilled") setPerformance(perfRes.value.data?.technicians || []);
        if (recRes.status === "fulfilled") setRecommendations(recRes.value.data?.recommendations || []);
        if (callRes.status === "fulfilled") setCallInsights(callRes.value.data);
        if (benchRes.status === "fulfilled") setBenchmarks(benchRes.value.data);
      } catch {
        // endpoints may not be fully wired
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">AI Coaching</h1>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border rounded-lg p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-48 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-72" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Coaching Insights</h1>
        <p className="text-gray-500 mt-1">Performance analysis and recommendations for your team</p>
      </div>

      {/* Team Benchmarks */}
      {benchmarks && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-500">Team Size</p>
            <p className="text-2xl font-bold text-gray-900">{benchmarks.team_size}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-500">Avg Completion Rate</p>
            <p className="text-2xl font-bold text-gray-900">
              {(benchmarks.avg_completion_rate * 100).toFixed(0)}%
            </p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-500">Avg Jobs/Week</p>
            <p className="text-2xl font-bold text-gray-900">
              {benchmarks.avg_jobs_per_tech_per_week.toFixed(1)}
            </p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-sm text-gray-500">Needs Coaching</p>
            <p className={`text-2xl font-bold ${benchmarks.needs_coaching_count > 0 ? "text-red-600" : "text-green-600"}`}>
              {benchmarks.needs_coaching_count}
            </p>
          </div>
          {benchmarks.top_performer && (
            <div className="bg-white border rounded-lg p-4 col-span-2">
              <p className="text-sm text-gray-500">Top Performer</p>
              <p className="text-lg font-bold text-gray-900">{benchmarks.top_performer.name}</p>
              <p className="text-sm text-gray-500">
                {(benchmarks.top_performer.completion_rate * 100).toFixed(0)}% completion &middot; {benchmarks.top_performer.total_jobs} jobs
              </p>
            </div>
          )}
          {benchmarks.job_type_distribution.length > 0 && (
            <div className="bg-white border rounded-lg p-4 col-span-2">
              <p className="text-sm text-gray-500 mb-2">Job Type Distribution</p>
              <div className="space-y-1">
                {benchmarks.job_type_distribution.slice(0, 5).map((jt) => (
                  <div key={jt.job_type} className="flex justify-between text-sm">
                    <span className="capitalize text-gray-700">{jt.job_type}</span>
                    <span className="text-gray-500">{jt.count} ({jt.percentage.toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Technician Performance */}
      <div className="bg-white border rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h2 className="font-semibold text-gray-900">Technician Performance</h2>
        </div>
        {performance.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No performance data available yet. Complete more jobs to see insights.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Technician</th>
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Jobs</th>
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Completion Rate</th>
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Jobs/Week</th>
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Top Type</th>
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {performance.map((tech) => (
                <tr key={tech.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{tech.name}</td>
                  <td className="px-4 py-3 text-sm">{tech.completed_jobs}/{tech.total_jobs}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={tech.completion_rate >= 0.8 ? "text-green-600" : tech.completion_rate >= 0.5 ? "text-yellow-600" : "text-red-600"}>
                      {(tech.completion_rate * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{tech.avg_jobs_per_week.toFixed(1)}</td>
                  <td className="px-4 py-3 text-sm capitalize">{tech.top_job_type}</td>
                  <td className="px-4 py-3 text-sm">
                    {tech.needs_coaching ? (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Needs Coaching</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">On Track</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Call Insights */}
      {callInsights && (
        <div className="bg-white border rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h2 className="font-semibold text-gray-900">Call Insights</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Total Calls</p>
                <p className="text-xl font-bold">{callInsights.total_calls}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Answer Rate</p>
                <p className="text-xl font-bold text-green-600">
                  {(callInsights.answer_rate * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Duration</p>
                <p className="text-xl font-bold">
                  {Math.floor(callInsights.avg_duration_seconds / 60)}m {Math.round(callInsights.avg_duration_seconds % 60)}s
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Booking Conversion</p>
                <p className="text-xl font-bold text-blue-600">
                  {(callInsights.booking_conversion_rate * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            {callInsights.by_result.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Call Results</p>
                <div className="flex flex-wrap gap-2">
                  {callInsights.by_result.map((r) => (
                    <span key={r.result} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                      {r.result}: <strong>{r.count}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {callInsights.peak_hour !== null && (
              <p className="text-sm text-gray-500 mt-3">
                Peak call hour: <strong>{callInsights.peak_hour}:00</strong> &middot;{" "}
                Avg {callInsights.avg_calls_per_day.toFixed(1)} calls/day
              </p>
            )}
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h2 className="font-semibold text-gray-900">AI Recommendations</h2>
        </div>
        {recommendations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No recommendations yet. The AI needs more data to generate insights.
          </div>
        ) : (
          <div className="divide-y">
            {recommendations.map((rec, i) => (
              <div key={i} className="p-4">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-medium ${
                    rec.severity === "critical" ? "bg-red-100 text-red-700" :
                    rec.severity === "warning" ? "bg-yellow-100 text-yellow-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {rec.severity}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{rec.target} — {rec.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{rec.detail}</p>
                    <p className="text-sm text-blue-600 mt-1 font-medium">{rec.action}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
