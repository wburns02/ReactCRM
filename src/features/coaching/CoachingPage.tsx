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

export function CoachingPage() {
    const [performance, setPerformance] = useState<TechPerf[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [perfRes, recRes] = await Promise.allSettled([
          apiClient.get("/coaching/technician-performance"),
          apiClient.get("/coaching/recommendations"),
        ]);
        if (perfRes.status === "fulfilled") setPerformance(perfRes.value.data?.technicians || []);
        if (recRes.status === "fulfilled") setRecommendations(recRes.value.data?.recommendations || []);
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
          {[1, 2, 3].map((i) => (
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
