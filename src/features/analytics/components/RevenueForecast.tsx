import { useState, useEffect } from "react";
import { apiClient } from "@/api/client";

interface ForecastData {
  forecast_30: number;
  forecast_60: number;
  forecast_90: number;
  scheduled_wo_value: number;
  contract_monthly_value: number;
  avg_job_value: number;
  scheduled_wo_count: number;
  active_contracts: number;
}

export function RevenueForecast() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.get("/revenue/forecast");
        setData(res.data);
      } catch {
        // Silently fail — component is additive
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const fmt = (v: number) =>
    v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`;

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Forecast</h3>

      {/* Forecast Bars */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "30 Days", value: data.forecast_30, color: "bg-blue-500" },
          { label: "60 Days", value: data.forecast_60, color: "bg-indigo-500" },
          { label: "90 Days", value: data.forecast_90, color: "bg-purple-500" },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <div className="text-2xl font-bold text-gray-900">{fmt(item.value)}</div>
            <div className="text-sm text-gray-500">{item.label}</div>
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${item.color} rounded-full`}
                style={{ width: `${Math.min((item.value / (data.forecast_90 || 1)) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Breakdown */}
      <div className="border-t pt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Scheduled Jobs</span>
          <span className="font-medium">{data.scheduled_wo_count}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Active Contracts</span>
          <span className="font-medium">{data.active_contracts}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Avg Job Value</span>
          <span className="font-medium">{fmt(data.avg_job_value)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Monthly Contract Value</span>
          <span className="font-medium">{fmt(data.contract_monthly_value)}</span>
        </div>
      </div>
    </div>
  );
}
