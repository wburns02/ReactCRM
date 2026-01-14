/**
 * Survey Analytics Dashboard Component
 *
 * Full analytics view featuring:
 * - Large NPS gauge with animation
 * - Response rate over time chart
 * - Sentiment distribution pie chart
 * - Top themes word cloud/list
 * - Question-by-question breakdown
 * - Export button (PDF/Excel placeholder)
 */

import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils.ts";

// Types
export type SurveyType = "nps" | "csat" | "ces" | "custom";
export type TimePeriod = "7d" | "30d" | "90d" | "12m";

interface QuestionBreakdown {
  id: number;
  text: string;
  type: "rating" | "scale" | "text" | "multiple_choice";
  avgScore?: number;
  responseCount: number;
  distribution?: { label: string; count: number; percentage: number }[];
}

interface SurveyAnalyticsDashboardProps {
  surveyId: number;
  surveyName: string;
  surveyType: SurveyType;
  npsScore?: number;
  promoters?: number;
  passives?: number;
  detractors?: number;
  totalResponses?: number;
  responseRate?: number;
  questions?: QuestionBreakdown[];
  themes?: {
    text: string;
    count: number;
    sentiment: "positive" | "neutral" | "negative";
  }[];
  onExport?: (format: "pdf" | "excel") => void;
  onClose?: () => void;
  className?: string;
}

// Large animated NPS Gauge
function NPSGauge({ score, size = 200 }: { score: number; size?: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / 1500, 1);

      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(easeOut * score));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [score]);

  // Calculate gauge arc
  const radius = 80;
  const circumference = Math.PI * radius; // Half circle
  const normalizedScore = (score + 100) / 200; // Normalize -100 to 100 -> 0 to 1
  const strokeDashoffset = circumference - normalizedScore * circumference;

  const getColor = () => {
    if (score >= 50) return "#22c55e";
    if (score >= 0) return "#f59e0b";
    return "#ef4444";
  };

  const getLabel = () => {
    if (score >= 70) return "Excellent";
    if (score >= 50) return "Great";
    if (score >= 30) return "Good";
    if (score >= 0) return "Needs Work";
    return "Critical";
  };

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 40} viewBox="0 0 200 140">
        {/* Background arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="16"
          strokeLinecap="round"
          className="text-bg-tertiary"
        />
        {/* Progress arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={getColor()}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
        {/* Score text */}
        <text
          x="100"
          y="85"
          textAnchor="middle"
          className="fill-text-primary text-4xl font-bold"
          style={{ fontSize: "36px" }}
        >
          {animatedScore >= 0 ? "+" : ""}
          {animatedScore}
        </text>
        <text
          x="100"
          y="110"
          textAnchor="middle"
          className="fill-text-muted text-sm"
          style={{ fontSize: "12px" }}
        >
          NPS Score
        </text>
        {/* Scale markers */}
        <text
          x="15"
          y="130"
          className="fill-text-muted"
          style={{ fontSize: "10px" }}
        >
          -100
        </text>
        <text
          x="92"
          y="130"
          className="fill-text-muted"
          style={{ fontSize: "10px" }}
        >
          0
        </text>
        <text
          x="175"
          y="130"
          className="fill-text-muted"
          style={{ fontSize: "10px" }}
        >
          100
        </text>
      </svg>
      <span
        className={cn(
          "mt-2 px-3 py-1 rounded-full text-sm font-medium",
          score >= 50
            ? "bg-success/10 text-success"
            : score >= 0
              ? "bg-warning/10 text-warning"
              : "bg-danger/10 text-danger",
        )}
      >
        {getLabel()}
      </span>
    </div>
  );
}

// Response Rate Chart
function ResponseRateChart({
  data,
}: {
  data: { date: string; rate: number }[];
}) {
  const maxRate = Math.max(...data.map((d) => d.rate), 50);

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (d.rate / maxRate) * 100;
    return { x, y, ...d };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const areaPath = `${linePath} L 100 100 L 0 100 Z`;

  return (
    <div className="bg-bg-card rounded-xl border border-border p-6">
      <h4 className="font-semibold text-text-primary mb-4">
        Response Rate Over Time
      </h4>
      <div className="relative h-40">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.1}
              className="text-border"
            />
          ))}
          {/* Area */}
          <path d={areaPath} fill="url(#rateGradient)" opacity={0.3} />
          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {/* Dots */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="2" fill="#3b82f6" />
          ))}
          <defs>
            <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="flex justify-between mt-2 text-xs text-text-muted">
        {data.length > 0 && (
          <>
            <span>{data[0].date}</span>
            <span>{data[data.length - 1].date}</span>
          </>
        )}
      </div>
    </div>
  );
}

// Sentiment Distribution Pie Chart
function SentimentPieChart({
  positive,
  neutral,
  negative,
}: {
  positive: number;
  neutral: number;
  negative: number;
}) {
  const total = positive + neutral + negative;
  if (total === 0) return null;

  const posPercent = (positive / total) * 100;
  const neuPercent = (neutral / total) * 100;
  const negPercent = (negative / total) * 100;

  // Calculate SVG arc segments
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  const posLength = (posPercent / 100) * circumference;
  const neuLength = (neuPercent / 100) * circumference;
  const negLength = (negPercent / 100) * circumference;

  return (
    <div className="bg-bg-card rounded-xl border border-border p-6">
      <h4 className="font-semibold text-text-primary mb-4">
        Sentiment Distribution
      </h4>
      <div className="flex items-center gap-6">
        <svg width="120" height="120" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
          />
          {/* Positive segment */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#22c55e"
            strokeWidth="12"
            strokeDasharray={`${posLength} ${circumference}`}
            strokeDashoffset="0"
            transform="rotate(-90 50 50)"
          />
          {/* Neutral segment */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="12"
            strokeDasharray={`${neuLength} ${circumference}`}
            strokeDashoffset={-posLength}
            transform="rotate(-90 50 50)"
          />
          {/* Negative segment */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#ef4444"
            strokeWidth="12"
            strokeDasharray={`${negLength} ${circumference}`}
            strokeDashoffset={-(posLength + neuLength)}
            transform="rotate(-90 50 50)"
          />
          <text
            x="50"
            y="50"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-text-primary text-lg font-bold"
            style={{ fontSize: "14px" }}
          >
            {total}
          </text>
          <text
            x="50"
            y="62"
            textAnchor="middle"
            className="fill-text-muted"
            style={{ fontSize: "8px" }}
          >
            responses
          </text>
        </svg>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-success" />
            <span className="text-sm text-text-secondary">Positive</span>
            <span className="text-sm font-semibold text-text-primary ml-auto">
              {posPercent.toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-sm text-text-secondary">Neutral</span>
            <span className="text-sm font-semibold text-text-primary ml-auto">
              {neuPercent.toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-danger" />
            <span className="text-sm text-text-secondary">Negative</span>
            <span className="text-sm font-semibold text-text-primary ml-auto">
              {negPercent.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Themes List
function ThemesList({
  themes,
}: {
  themes: {
    text: string;
    count: number;
    sentiment: "positive" | "neutral" | "negative";
  }[];
}) {
  const sortedThemes = [...themes]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const maxCount = sortedThemes[0]?.count || 1;

  const sentimentColors = {
    positive: "bg-success/20 text-success border-success/30",
    neutral: "bg-warning/20 text-warning border-warning/30",
    negative: "bg-danger/20 text-danger border-danger/30",
  };

  return (
    <div className="bg-bg-card rounded-xl border border-border p-6">
      <h4 className="font-semibold text-text-primary mb-4">Top Themes</h4>
      <div className="space-y-3">
        {sortedThemes.map((theme, i) => (
          <div key={i} className="flex items-center gap-3">
            <span
              className={cn(
                "px-2 py-0.5 text-xs rounded border",
                sentimentColors[theme.sentiment],
              )}
            >
              {theme.sentiment}
            </span>
            <span className="text-sm text-text-primary flex-1">
              {theme.text}
            </span>
            <div className="w-24 h-2 bg-bg-hover rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  theme.sentiment === "positive"
                    ? "bg-success"
                    : theme.sentiment === "neutral"
                      ? "bg-warning"
                      : "bg-danger",
                )}
                style={{ width: `${(theme.count / maxCount) * 100}%` }}
              />
            </div>
            <span className="text-xs text-text-muted w-8 text-right">
              {theme.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Question Breakdown
function QuestionBreakdownList({
  questions,
}: {
  questions: QuestionBreakdown[];
}) {
  return (
    <div className="bg-bg-card rounded-xl border border-border p-6">
      <h4 className="font-semibold text-text-primary mb-4">
        Question-by-Question Breakdown
      </h4>
      <div className="space-y-4">
        {questions.map((q) => (
          <div
            key={q.id}
            className="border-b border-border pb-4 last:border-0 last:pb-0"
          >
            <div className="flex items-start justify-between mb-2">
              <p className="text-sm text-text-primary font-medium">{q.text}</p>
              {q.avgScore !== undefined && (
                <span
                  className={cn(
                    "px-2 py-0.5 rounded text-xs font-bold",
                    q.avgScore >= 4
                      ? "bg-success/10 text-success"
                      : q.avgScore >= 3
                        ? "bg-warning/10 text-warning"
                        : "bg-danger/10 text-danger",
                  )}
                >
                  Avg: {q.avgScore.toFixed(1)}
                </span>
              )}
            </div>
            <div className="text-xs text-text-muted mb-2">
              {q.responseCount} responses - {q.type.replace("_", " ")}
            </div>
            {q.distribution && (
              <div className="flex items-center gap-1">
                {q.distribution.map((d, i) => (
                  <div
                    key={i}
                    className="h-6 bg-primary/20 rounded flex items-center justify-center text-xs text-primary relative group"
                    style={{
                      width: `${d.percentage}%`,
                      minWidth: d.percentage > 0 ? "24px" : "0",
                    }}
                  >
                    {d.percentage >= 10 && d.label}
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-bg-primary border border-border rounded px-2 py-1 text-text-primary opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                      {d.label}: {d.count} ({d.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Sample data generator
function generateSampleData() {
  const responseRateData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      rate: Math.floor(Math.random() * 30) + 20,
    };
  });

  const themes = [
    {
      text: "Great customer support",
      count: 45,
      sentiment: "positive" as const,
    },
    {
      text: "Easy to use interface",
      count: 38,
      sentiment: "positive" as const,
    },
    { text: "Slow response times", count: 22, sentiment: "negative" as const },
    { text: "Missing features", count: 18, sentiment: "negative" as const },
    { text: "Good value for money", count: 32, sentiment: "positive" as const },
    { text: "Documentation unclear", count: 15, sentiment: "neutral" as const },
    { text: "Integration issues", count: 12, sentiment: "negative" as const },
    { text: "Reliable platform", count: 28, sentiment: "positive" as const },
  ];

  const questions: QuestionBreakdown[] = [
    {
      id: 1,
      text: "How likely are you to recommend us to a friend or colleague?",
      type: "scale",
      avgScore: 7.8,
      responseCount: 156,
      distribution: [
        { label: "0-6", count: 23, percentage: 15 },
        { label: "7-8", count: 45, percentage: 29 },
        { label: "9-10", count: 88, percentage: 56 },
      ],
    },
    {
      id: 2,
      text: "How satisfied are you with our product?",
      type: "rating",
      avgScore: 4.2,
      responseCount: 148,
      distribution: [
        { label: "1", count: 5, percentage: 3 },
        { label: "2", count: 8, percentage: 5 },
        { label: "3", count: 22, percentage: 15 },
        { label: "4", count: 58, percentage: 39 },
        { label: "5", count: 55, percentage: 37 },
      ],
    },
    {
      id: 3,
      text: "What could we improve?",
      type: "text",
      responseCount: 89,
    },
  ];

  return { responseRateData, themes, questions };
}

export function SurveyAnalyticsDashboard({
  surveyId: _surveyId,
  surveyName,
  surveyType,
  npsScore = 42,
  promoters = 65,
  passives = 20,
  detractors = 15,
  totalResponses = 156,
  responseRate = 34,
  questions: propQuestions,
  themes: propThemes,
  onExport,
  onClose,
  className,
}: SurveyAnalyticsDashboardProps) {
  const [period, setPeriod] = useState<TimePeriod>("30d");
  const [isExporting, setIsExporting] = useState(false);

  const { responseRateData, themes, questions } = useMemo(() => {
    const sampleData = generateSampleData();
    return {
      responseRateData: sampleData.responseRateData,
      themes: propThemes || sampleData.themes,
      questions: propQuestions || sampleData.questions,
    };
  }, [propThemes, propQuestions]);

  // Calculate sentiment totals from themes
  const sentimentTotals = useMemo(() => {
    return themes.reduce(
      (acc, t) => {
        acc[t.sentiment] += t.count;
        return acc;
      },
      { positive: 0, neutral: 0, negative: 0 },
    );
  }, [themes]);

  const handleExport = async (format: "pdf" | "excel") => {
    setIsExporting(true);
    // Simulate export delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    onExport?.(format);
    setIsExporting(false);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="bg-bg-card rounded-xl border border-border p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">
              {surveyName}
            </h2>
            <p className="text-sm text-text-muted mt-1">
              {surveyType.toUpperCase()} Survey Analytics -{" "}
              {totalResponses.toLocaleString()} total responses
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <div className="flex items-center gap-1 bg-bg-hover rounded-lg p-1">
              {(["7d", "30d", "90d", "12m"] as TimePeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    period === p
                      ? "bg-bg-card text-text-primary shadow-sm"
                      : "text-text-muted hover:text-text-secondary",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            {/* Export Button */}
            <div className="relative group">
              <button
                disabled={isExporting}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors",
                  "bg-primary text-white hover:bg-primary-dark",
                  isExporting && "opacity-50 cursor-not-allowed",
                )}
              >
                {isExporting ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Export
                  </>
                )}
              </button>
              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-1 bg-bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => handleExport("pdf")}
                  className="w-full px-4 py-2 text-sm text-left text-text-secondary hover:bg-bg-hover flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4 text-danger"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Export as PDF
                </button>
                <button
                  onClick={() => handleExport("excel")}
                  className="w-full px-4 py-2 text-sm text-left text-text-secondary hover:bg-bg-hover flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4 text-success"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Export as Excel
                </button>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-hover"
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
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-bg-hover rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-text-primary">
              {totalResponses.toLocaleString()}
            </p>
            <p className="text-xs text-text-muted">Total Responses</p>
          </div>
          <div className="bg-bg-hover rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-text-primary">
              {responseRate}%
            </p>
            <p className="text-xs text-text-muted">Response Rate</p>
          </div>
          <div className="bg-bg-hover rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-success">{promoters}%</p>
            <p className="text-xs text-text-muted">Promoters</p>
          </div>
          <div className="bg-bg-hover rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-danger">{detractors}%</p>
            <p className="text-xs text-text-muted">Detractors</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* NPS Gauge */}
        {surveyType === "nps" && (
          <div className="bg-bg-card rounded-xl border border-border p-6 flex flex-col items-center justify-center">
            <h4 className="font-semibold text-text-primary mb-4 self-start">
              Net Promoter Score
            </h4>
            <NPSGauge score={npsScore} size={220} />
            <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-border w-full">
              <div className="text-center">
                <span className="text-2xl font-bold text-success">
                  {promoters}%
                </span>
                <p className="text-xs text-text-muted">Promoters</p>
              </div>
              <div className="text-center">
                <span className="text-2xl font-bold text-warning">
                  {passives}%
                </span>
                <p className="text-xs text-text-muted">Passives</p>
              </div>
              <div className="text-center">
                <span className="text-2xl font-bold text-danger">
                  {detractors}%
                </span>
                <p className="text-xs text-text-muted">Detractors</p>
              </div>
            </div>
          </div>
        )}

        {/* Response Rate Chart */}
        <ResponseRateChart data={responseRateData} />

        {/* Sentiment Distribution */}
        <SentimentPieChart
          positive={sentimentTotals.positive}
          neutral={sentimentTotals.neutral}
          negative={sentimentTotals.negative}
        />

        {/* Top Themes */}
        <ThemesList themes={themes} />
      </div>

      {/* Question Breakdown - Full Width */}
      <QuestionBreakdownList questions={questions} />
    </div>
  );
}

export default SurveyAnalyticsDashboard;
