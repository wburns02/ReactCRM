/**
 * Enhanced Survey Card Component
 *
 * Features:
 * - Real-time response counter with animation
 * - NPS/CSAT/CES trend sparkline (inline SVG)
 * - AI insights badge showing urgent/warnings
 * - Quick action buttons (view, analyze, pause)
 * - Hover effects showing last response info
 */

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils.ts";
import type { Survey, SurveyType, SurveyStatus } from "./SurveySystem";

interface SurveyCardProps {
  survey: Survey;
  onSelect?: (survey: Survey) => void;
  onAnalyze?: (survey: Survey) => void;
  onPause?: (survey: Survey) => void;
  lastResponse?: {
    customerName: string;
    score: number;
    timeAgo: string;
  };
  aiInsights?: {
    urgent: number;
    warnings: number;
  };
  trendData?: number[];
  className?: string;
}

// Survey type configuration
const TYPE_CONFIG: Record<
  SurveyType,
  { label: string; color: string; bgColor: string }
> = {
  nps: { label: "NPS", color: "text-primary", bgColor: "bg-primary/10" },
  csat: { label: "CSAT", color: "text-warning", bgColor: "bg-warning/10" },
  ces: { label: "CES", color: "text-info", bgColor: "bg-info/10" },
  custom: {
    label: "Custom",
    color: "text-text-secondary",
    bgColor: "bg-bg-hover",
  },
};

const STATUS_CONFIG: Record<
  SurveyStatus,
  { label: string; color: string; bgColor: string }
> = {
  draft: { label: "Draft", color: "text-gray-600", bgColor: "bg-gray-100" },
  active: { label: "Active", color: "text-success", bgColor: "bg-success/10" },
  paused: { label: "Paused", color: "text-warning", bgColor: "bg-warning/10" },
  completed: { label: "Completed", color: "text-info", bgColor: "bg-info/10" },
};

// Survey type icons
function SurveyIcon({ type }: { type: SurveyType }) {
  switch (type) {
    case "nps":
      return (
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
            d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case "csat":
      return (
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
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      );
    case "ces":
      return (
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
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      );
    default:
      return (
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
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      );
  }
}

// Sparkline mini chart
function TrendSparkline({
  data,
  className,
}: {
  data: number[];
  className?: string;
}) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 60;
  const height = 20;

  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const lastValue = data[data.length - 1];
  const firstValue = data[0];
  const trend = lastValue >= firstValue ? "up" : "down";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("w-[60px] h-[20px]", className)}
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={trend === "up" ? "#22c55e" : "#ef4444"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={((data.length - 1) / (data.length - 1)) * width}
        cy={height - ((lastValue - min) / range) * height}
        r="2"
        fill={trend === "up" ? "#22c55e" : "#ef4444"}
      />
    </svg>
  );
}

// Animated counter
function AnimatedCounter({
  value,
  duration = 1000,
}: {
  value: number;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      // Ease out quad
      const easeOut = 1 - (1 - progress) * (1 - progress);
      setDisplayValue(Math.floor(easeOut * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
}

export function SurveyCard({
  survey,
  onSelect,
  onAnalyze,
  onPause,
  lastResponse,
  aiInsights = { urgent: 0, warnings: 0 },
  trendData = [],
  className,
}: SurveyCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showLastResponse, setShowLastResponse] = useState(false);

  // Simulate real-time updates for demo
  const [responseCount, setResponseCount] = useState(survey.responses_count);

  useEffect(() => {
    if (survey.status !== "active") return;

    // Simulate occasional new response for active surveys
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setResponseCount((prev) => prev + 1);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [survey.status]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (lastResponse) {
      setShowLastResponse(true);
    }
  }, [lastResponse]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setShowLastResponse(false);
  }, []);

  const typeConfig = TYPE_CONFIG[survey.type];
  const statusConfig = STATUS_CONFIG[survey.status];

  // Calculate score color
  const getScoreColor = () => {
    if (survey.avg_score === undefined) return "text-text-muted";
    if (survey.type === "nps") {
      if (survey.avg_score >= 50) return "text-success";
      if (survey.avg_score >= 0) return "text-warning";
      return "text-danger";
    }
    // CSAT/CES typically 1-5 or 1-7 scale
    if (survey.avg_score >= 4) return "text-success";
    if (survey.avg_score >= 3) return "text-warning";
    return "text-danger";
  };

  const hasInsights = aiInsights.urgent > 0 || aiInsights.warnings > 0;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => onSelect?.(survey)}
      className={cn(
        "relative bg-bg-card rounded-xl border border-border p-6",
        "transition-all duration-300 cursor-pointer",
        "hover:shadow-lg hover:border-primary/30 hover:-translate-y-1",
        isHovered && "ring-2 ring-primary/20",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-2.5 rounded-lg", typeConfig.bgColor)}>
          <span className={typeConfig.color}>
            <SurveyIcon type={survey.type} />
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* AI Insights Badge */}
          {hasInsights && (
            <div className="flex items-center gap-1 px-2 py-1 bg-bg-hover rounded-full text-xs">
              {aiInsights.urgent > 0 && (
                <span className="text-danger font-medium">
                  {aiInsights.urgent} urgent
                </span>
              )}
              {aiInsights.urgent > 0 && aiInsights.warnings > 0 && (
                <span className="text-text-muted">|</span>
              )}
              {aiInsights.warnings > 0 && (
                <span className="text-warning font-medium">
                  {aiInsights.warnings} warnings
                </span>
              )}
            </div>
          )}
          {/* Status Badge */}
          <span
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-full",
              statusConfig.bgColor,
              statusConfig.color,
            )}
          >
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Title and Type */}
      <h3 className="font-semibold text-text-primary mb-1 line-clamp-1">
        {survey.name}
      </h3>
      <p className="text-sm text-text-muted mb-4">
        {typeConfig.label} Survey - {survey.questions.length} questions
      </p>

      {/* Stats Row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-text-muted text-sm">Responses:</span>
          <span className="ml-1.5 font-semibold text-text-primary">
            <AnimatedCounter value={responseCount} />
          </span>
          {responseCount > survey.responses_count && (
            <span className="ml-1 text-xs text-success animate-pulse">
              +{responseCount - survey.responses_count}
            </span>
          )}
        </div>
        {survey.avg_score !== undefined && (
          <div className="flex items-center gap-2">
            <div>
              <span className="text-text-muted text-sm">Score:</span>
              <span className={cn("ml-1.5 font-semibold", getScoreColor())}>
                {survey.type === "nps"
                  ? survey.avg_score
                  : survey.avg_score.toFixed(1)}
              </span>
            </div>
            {/* Trend Sparkline */}
            {trendData.length >= 2 && <TrendSparkline data={trendData} />}
          </div>
        )}
      </div>

      {/* Target Segment */}
      {survey.target_segment_name && (
        <div className="mb-4 pb-4 border-b border-border">
          <span className="text-xs text-text-muted">
            Target:{" "}
            <span className="text-text-secondary font-medium">
              {survey.target_segment_name}
            </span>
          </span>
        </div>
      )}

      {/* Quick Actions */}
      <div
        className={cn(
          "flex items-center gap-2 transition-opacity duration-300",
          isHovered ? "opacity-100" : "opacity-0",
        )}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(survey);
          }}
          className="flex-1 px-3 py-2 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors flex items-center justify-center gap-1.5"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          View
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAnalyze?.(survey);
          }}
          className="flex-1 px-3 py-2 text-xs font-medium text-info bg-info/10 rounded-lg hover:bg-info/20 transition-colors flex items-center justify-center gap-1.5"
        >
          <svg
            className="w-3.5 h-3.5"
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
          Analyze
        </button>
        {survey.status === "active" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPause?.(survey);
            }}
            className="px-3 py-2 text-xs font-medium text-warning bg-warning/10 rounded-lg hover:bg-warning/20 transition-colors flex items-center justify-center"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Last Response Tooltip */}
      {showLastResponse && lastResponse && (
        <div className="absolute left-0 right-0 -bottom-2 transform translate-y-full z-10 px-4">
          <div className="bg-bg-primary border border-border rounded-lg shadow-lg p-3 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-text-primary">
                {lastResponse.customerName}
              </span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded font-bold",
                  lastResponse.score >= 9
                    ? "bg-success/10 text-success"
                    : lastResponse.score >= 7
                      ? "bg-warning/10 text-warning"
                      : "bg-danger/10 text-danger",
                )}
              >
                {lastResponse.score}
              </span>
            </div>
            <span className="text-text-muted">{lastResponse.timeAgo}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default SurveyCard;
