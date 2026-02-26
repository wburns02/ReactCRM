import { useState, useEffect } from "react";
import { apiClient } from "@/api/client";

interface TechPerf {
  technician_id: string;
  name: string;
  jobs_completed: number;
  avg_rating: number;
  ftfr: number;
  avg_completion_time_hours: number;
}

interface Recommendation {
  technician_id: string;
  technician_name: string;
  area: string;
  recommendation: string;
  priority: string;
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
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Avg Rating</th>
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">FTFR</th>
                <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Avg Time</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {performance.map((tech) => (
                <tr key={tech.technician_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{tech.name}</td>
                  <td className="px-4 py-3 text-sm">{tech.jobs_completed}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={tech.avg_rating >= 4 ? "text-green-600" : tech.avg_rating >= 3 ? "text-yellow-600" : "text-red-600"}>
                      {tech.avg_rating.toFixed(1)} / 5
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{(tech.ftfr * 100).toFixed(0)}%</td>
                  <td className="px-4 py-3 text-sm">{tech.avg_completion_time_hours.toFixed(1)}h</td>
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
                    rec.priority === "high" ? "bg-red-100 text-red-700" :
                    rec.priority === "medium" ? "bg-yellow-100 text-yellow-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {rec.priority}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{rec.technician_name} — {rec.area}</p>
                    <p className="text-sm text-gray-600 mt-1">{rec.recommendation}</p>
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
