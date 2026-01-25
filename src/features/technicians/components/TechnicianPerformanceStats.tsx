import { useTechnicianPerformance } from "@/api/hooks/useTechnicians";

interface TechnicianPerformanceStatsProps {
  technicianId?: string;
  onPumpOutsClick?: () => void;
  onRepairsClick?: () => void;
}

/**
 * Displays aggregated performance statistics for a technician
 * Includes clickable cards for pump outs and repairs
 */
export function TechnicianPerformanceStats({
  technicianId,
  onPumpOutsClick,
  onRepairsClick,
}: TechnicianPerformanceStatsProps) {
  const {
    data: stats,
    isLoading,
    error,
  } = useTechnicianPerformance(technicianId);

  if (isLoading) {
    return (
      <div className="bg-[#1a1f2e] rounded-lg border border-gray-700 p-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-48 mb-6"></div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="h-20 bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-gray-700 rounded"></div>
          <div className="h-24 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#1a1f2e] rounded-lg border border-red-700 p-6">
        <p className="text-red-400 text-sm">Failed to load performance stats</p>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-[#1a1f2e] rounded-lg border border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <svg
          className="w-5 h-5 text-blue-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        Performance Overview
      </h3>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0d1117] rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-white">
            {stats?.total_jobs_completed ?? 0}
          </p>
          <p className="text-sm text-gray-400 mt-1">Total Jobs</p>
        </div>

        <div className="bg-[#0d1117] rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-green-400">
            {formatCurrency(stats?.total_revenue ?? 0)}
          </p>
          <p className="text-sm text-gray-400 mt-1">Total Revenue</p>
        </div>

        <div className="bg-[#0d1117] rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-yellow-400">
            {stats?.returns_count ?? 0}
          </p>
          <p className="text-sm text-gray-400 mt-1">Return Visits</p>
        </div>
      </div>

      {/* Clickable Category Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Pump Outs Card */}
        <button
          onClick={onPumpOutsClick}
          className="bg-[#0d1117] hover:bg-[#161b22] rounded-lg p-4 text-left transition-colors border border-transparent hover:border-blue-500 group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚛</span>
              <span className="text-white font-medium">Pump Outs</span>
            </div>
            <svg
              className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {stats?.pump_out_jobs ?? 0}
            </span>
            <span className="text-gray-400 text-sm">jobs</span>
          </div>
          <p className="text-green-400 text-sm mt-1">
            {formatCurrency(stats?.pump_out_revenue ?? 0)}
          </p>
        </button>

        {/* Repairs Card */}
        <button
          onClick={onRepairsClick}
          className="bg-[#0d1117] hover:bg-[#161b22] rounded-lg p-4 text-left transition-colors border border-transparent hover:border-blue-500 group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔧</span>
              <span className="text-white font-medium">Repairs</span>
            </div>
            <svg
              className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {stats?.repair_jobs ?? 0}
            </span>
            <span className="text-gray-400 text-sm">jobs</span>
          </div>
          <p className="text-green-400 text-sm mt-1">
            {formatCurrency(stats?.repair_revenue ?? 0)}
          </p>
        </button>
      </div>

      {/* Other Jobs (if any) */}
      {(stats?.other_jobs ?? 0) > 0 && (
        <div className="mt-4 bg-[#0d1117] rounded-lg p-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Other Jobs</span>
            <div className="flex items-center gap-4">
              <span className="text-white font-medium">
                {stats?.other_jobs} jobs
              </span>
              <span className="text-green-400">
                {formatCurrency(stats?.other_revenue ?? 0)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
