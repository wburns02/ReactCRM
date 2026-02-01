/**
 * VitalsDetail Component
 *
 * Shows Core Web Vitals breakdown when the Speed Score metric is clicked.
 * - Core Web Vitals: LCP, INP, CLS
 * - Score gauges for each metric
 * - Historical trend (last 10 checks)
 */

import { useVitalsDetails } from "@/api/hooks/useMarketingDetails";
import { DetailSkeleton } from "./DetailDrawer";

interface VitalsDetailProps {
  isEnabled: boolean;
}

// Thresholds based on Google's Core Web Vitals guidelines
const VITAL_CONFIG = {
  lcp: {
    label: "Largest Contentful Paint",
    unit: "ms",
    good: 2500,
    needsImprovement: 4000,
    description: "Time until the largest content element is visible",
    tip: "Optimize images and reduce server response time",
  },
  inp: {
    label: "Interaction to Next Paint",
    unit: "ms",
    good: 200,
    needsImprovement: 500,
    description: "Time from user interaction to visual feedback",
    tip: "Reduce JavaScript execution time and break up long tasks",
  },
  cls: {
    label: "Cumulative Layout Shift",
    unit: "",
    good: 0.1,
    needsImprovement: 0.25,
    description: "How much the page layout shifts unexpectedly",
    tip: "Set dimensions on images and avoid inserting content above existing content",
  },
  fcp: {
    label: "First Contentful Paint",
    unit: "ms",
    good: 1800,
    needsImprovement: 3000,
    description: "Time until first content is visible",
    tip: "Reduce render-blocking resources",
  },
  ttfb: {
    label: "Time to First Byte",
    unit: "ms",
    good: 800,
    needsImprovement: 1800,
    description: "Server response time",
    tip: "Optimize server configuration and use CDN",
  },
};

function getVitalStatus(
  value: number,
  good: number,
  needsImprovement: number
): { status: "good" | "needs-improvement" | "poor"; color: string } {
  if (value <= good) {
    return { status: "good", color: "text-green-600 bg-green-50" };
  }
  if (value <= needsImprovement) {
    return { status: "needs-improvement", color: "text-yellow-600 bg-yellow-50" };
  }
  return { status: "poor", color: "text-red-600 bg-red-50" };
}

function VitalCard({
  name,
  value,
  config,
}: {
  name: string;
  value: number;
  config: (typeof VITAL_CONFIG)[keyof typeof VITAL_CONFIG];
}) {
  const status = getVitalStatus(value, config.good, config.needsImprovement);
  const displayValue = config.unit === "ms" ? Math.round(value) : value.toFixed(2);

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium text-gray-900">{config.label}</h4>
          <p className="text-xs text-gray-400">{name.toUpperCase()}</p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-sm font-bold ${status.color}`}
        >
          {displayValue}
          {config.unit}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            status.status === "good"
              ? "bg-green-500"
              : status.status === "needs-improvement"
                ? "bg-yellow-500"
                : "bg-red-500"
          }`}
          style={{
            width: `${Math.min(100, (value / config.needsImprovement) * 100)}%`,
          }}
        />
      </div>

      {/* Thresholds */}
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span className="text-green-600">Good: &lt;{config.good}{config.unit}</span>
        <span className="text-red-600">Poor: &gt;{config.needsImprovement}{config.unit}</span>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 mt-2">{config.description}</p>

      {/* Improvement tip */}
      {status.status !== "good" && (
        <div className="mt-2 text-xs bg-blue-50 text-blue-600 p-2 rounded">
          💡 <strong>Tip:</strong> {config.tip}
        </div>
      )}
    </div>
  );
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return { stroke: "#22c55e", text: "text-green-600" };
    if (score >= 50) return { stroke: "#eab308", text: "text-yellow-600" };
    return { stroke: "#ef4444", text: "text-red-600" };
  };

  const color = getScoreColor(score);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="45"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="6"
          />
          <circle
            cx="48"
            cy="48"
            r="45"
            fill="none"
            stroke={color.stroke}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div
          className={`absolute inset-0 flex items-center justify-center text-2xl font-bold ${color.text}`}
        >
          {score}
        </div>
      </div>
      <span className="text-sm text-gray-600 mt-2">{label}</span>
    </div>
  );
}

export function VitalsDetail({ isEnabled }: VitalsDetailProps) {
  const { data, isLoading, error } = useVitalsDetails(isEnabled);

  const latest = data?.latest;
  const history = data?.vitals || [];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return <DetailSkeleton rows={6} />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-4xl mb-2">⚠️</div>
        <p className="text-gray-600">Failed to load vitals data</p>
        <p className="text-sm text-gray-400 mt-1">Please try again later</p>
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-4xl mb-2">📊</div>
        <p className="text-gray-600">No vitals data available yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Run a PageSpeed check to collect data
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall scores */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">
          Lighthouse Scores
        </h3>
        <div className="flex justify-around">
          <ScoreGauge score={latest.performanceScore} label="Performance" />
          <ScoreGauge score={latest.seoScore} label="SEO" />
          <ScoreGauge score={latest.accessibilityScore} label="Accessibility" />
          <ScoreGauge score={latest.bestPracticesScore} label="Best Practices" />
        </div>
        <p className="text-xs text-gray-400 text-center mt-4">
          Last checked: {formatDate(latest.recordedAt)}
        </p>
      </div>

      {/* Core Web Vitals */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Core Web Vitals
        </h3>
        <div className="grid gap-3">
          <VitalCard name="lcp" value={latest.lcpMs} config={VITAL_CONFIG.lcp} />
          <VitalCard name="inp" value={latest.inpMs} config={VITAL_CONFIG.inp} />
          <VitalCard name="cls" value={latest.cls} config={VITAL_CONFIG.cls} />
        </div>
      </div>

      {/* Other metrics */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Additional Metrics
        </h3>
        <div className="grid gap-3">
          <VitalCard name="fcp" value={latest.fcpMs} config={VITAL_CONFIG.fcp} />
          <VitalCard name="ttfb" value={latest.ttfbMs} config={VITAL_CONFIG.ttfb} />
        </div>
      </div>

      {/* History */}
      {history.length > 1 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Recent History
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="pb-2 font-medium text-gray-600">Date</th>
                  <th className="pb-2 font-medium text-gray-600 text-center">Perf</th>
                  <th className="pb-2 font-medium text-gray-600 text-center">LCP</th>
                  <th className="pb-2 font-medium text-gray-600 text-center">INP</th>
                  <th className="pb-2 font-medium text-gray-600 text-center">CLS</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 5).map((vital, i) => (
                  <tr key={vital.id} className={i === 0 ? "bg-blue-50" : ""}>
                    <td className="py-2 text-gray-600">
                      {formatDate(vital.recordedAt)}
                    </td>
                    <td className="py-2 text-center font-medium">
                      {vital.performanceScore}
                    </td>
                    <td className="py-2 text-center">{Math.round(vital.lcpMs)}ms</td>
                    <td className="py-2 text-center">{Math.round(vital.inpMs)}ms</td>
                    <td className="py-2 text-center">{vital.cls.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-xs text-gray-400 text-center">
        Data from Google PageSpeed Insights API
      </p>
    </div>
  );
}
