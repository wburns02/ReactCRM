/**
 * Sentiment Gauge Component
 *
 * Visual sentiment meter featuring:
 * - Animated gauge from -100 to +100
 * - Color gradient (red -> yellow -> green)
 * - Shows current value with label
 * - Optional trend indicator
 * - Configurable sizes
 */

import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils.ts';

interface SentimentGaugeProps {
  value: number; // -100 to +100
  previousValue?: number; // For trend indication
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showTrend?: boolean;
  animated?: boolean;
  className?: string;
}

// Size configurations
const SIZE_CONFIG = {
  sm: {
    width: 120,
    height: 80,
    fontSize: 16,
    labelSize: 10,
    strokeWidth: 10,
    radius: 45,
  },
  md: {
    width: 180,
    height: 110,
    fontSize: 24,
    labelSize: 12,
    strokeWidth: 14,
    radius: 65,
  },
  lg: {
    width: 240,
    height: 150,
    fontSize: 32,
    labelSize: 14,
    strokeWidth: 18,
    radius: 85,
  },
};

// Get sentiment label based on score
function getSentimentLabel(value: number): string {
  if (value >= 70) return 'Excellent';
  if (value >= 40) return 'Great';
  if (value >= 20) return 'Good';
  if (value >= 0) return 'Neutral';
  if (value >= -20) return 'Concerned';
  if (value >= -50) return 'Poor';
  return 'Critical';
}

// Get color based on value
function getSentimentColor(value: number): string {
  if (value >= 50) return '#22c55e'; // green-500
  if (value >= 20) return '#84cc16'; // lime-500
  if (value >= 0) return '#eab308'; // yellow-500
  if (value >= -20) return '#f97316'; // orange-500
  if (value >= -50) return '#ef4444'; // red-500
  return '#dc2626'; // red-600
}

// Get trend icon and color
function getTrendInfo(current: number, previous: number): { icon: string; color: string; label: string } {
  const diff = current - previous;
  if (diff > 5) return { icon: '↑', color: 'text-success', label: `+${diff}` };
  if (diff < -5) return { icon: '↓', color: 'text-danger', label: `${diff}` };
  return { icon: '→', color: 'text-text-muted', label: '0' };
}

export function SentimentGauge({
  value,
  previousValue,
  label = 'Sentiment Score',
  size = 'md',
  showTrend = true,
  animated = true,
  className,
}: SentimentGaugeProps) {
  const [displayValue, setDisplayValue] = useState(animated ? 0 : value);
  const config = SIZE_CONFIG[size];

  // Clamp value between -100 and 100
  const clampedValue = Math.max(-100, Math.min(100, value));

  // Animate value change
  useEffect(() => {
    if (!animated) {
      setDisplayValue(clampedValue);
      return;
    }

    let startTime: number;
    let animationFrame: number;
    const startValue = displayValue;
    const duration = 1200;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const newValue = startValue + (clampedValue - startValue) * easeOut;
      setDisplayValue(Math.round(newValue));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [clampedValue, animated]);

  // Calculate arc path and position
  const { arcPath, needlePath, centerX, centerY } = useMemo(() => {
    const cx = config.width / 2;
    const cy = config.height - 10;
    const r = config.radius;

    // Arc from -100 (left) to +100 (right)
    const startAngle = Math.PI; // 180 degrees
    const endAngle = 0; // 0 degrees

    // Calculate arc path
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    const arc = `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;

    // Calculate needle position
    // Normalize value from -100 to +100 -> 0 to 1
    const normalized = (displayValue + 100) / 200;
    const needleAngle = Math.PI - normalized * Math.PI;
    const needleLength = r - config.strokeWidth;
    const needleX = cx + needleLength * Math.cos(needleAngle);
    const needleY = cy + needleLength * Math.sin(needleAngle);

    const needle = `M ${cx} ${cy} L ${needleX} ${needleY}`;

    return { arcPath: arc, needlePath: needle, centerX: cx, centerY: cy };
  }, [config, displayValue]);

  // Calculate progress arc
  const progressArc = useMemo(() => {
    const cx = config.width / 2;
    const cy = config.height - 10;
    const r = config.radius;

    const startAngle = Math.PI;
    const normalized = (displayValue + 100) / 200;
    const progressAngle = Math.PI - normalized * Math.PI;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(progressAngle);
    const y2 = cy + r * Math.sin(progressAngle);

    // Determine if we need the large arc flag
    const largeArcFlag = normalized > 0.5 ? 1 : 0;

    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
  }, [config, displayValue]);

  const sentimentColor = getSentimentColor(displayValue);
  const sentimentLabel = getSentimentLabel(displayValue);
  const trendInfo = previousValue !== undefined && showTrend
    ? getTrendInfo(clampedValue, previousValue)
    : null;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg
        width={config.width}
        height={config.height}
        viewBox={`0 0 ${config.width} ${config.height}`}
        className="overflow-visible"
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient id={`sentimentGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="25%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="75%" stopColor="#84cc16" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
          {/* Glow filter */}
          <filter id={`glow-${size}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background arc */}
        <path
          d={arcPath}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          className="text-bg-tertiary"
        />

        {/* Gradient progress arc */}
        <path
          d={arcPath}
          fill="none"
          stroke={`url(#sentimentGradient-${size})`}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          opacity={0.3}
        />

        {/* Active progress arc */}
        <path
          d={progressArc}
          fill="none"
          stroke={sentimentColor}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          className="transition-all duration-300"
          filter={`url(#glow-${size})`}
        />

        {/* Scale markers */}
        {[-100, -50, 0, 50, 100].map((marker) => {
          const normalized = (marker + 100) / 200;
          const angle = Math.PI - normalized * Math.PI;
          const innerR = config.radius - config.strokeWidth / 2 - 6;
          const outerR = config.radius - config.strokeWidth / 2 - 2;
          const x1 = centerX + innerR * Math.cos(angle);
          const y1 = centerY + innerR * Math.sin(angle);
          const x2 = centerX + outerR * Math.cos(angle);
          const y2 = centerY + outerR * Math.sin(angle);
          return (
            <line
              key={marker}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-text-muted"
            />
          );
        })}

        {/* Needle */}
        <path
          d={needlePath}
          fill="none"
          stroke={sentimentColor}
          strokeWidth="3"
          strokeLinecap="round"
          className="transition-all duration-300"
        />

        {/* Needle center dot */}
        <circle
          cx={centerX}
          cy={centerY}
          r="6"
          fill={sentimentColor}
          className="transition-colors duration-300"
        />
        <circle
          cx={centerX}
          cy={centerY}
          r="3"
          fill="white"
        />

        {/* Value text */}
        <text
          x={centerX}
          y={centerY - config.radius / 2 - 5}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: `${config.fontSize}px`, fontWeight: 'bold' }}
          fill={sentimentColor}
        >
          {displayValue >= 0 ? '+' : ''}{displayValue}
        </text>

        {/* Scale labels */}
        <text
          x={centerX - config.radius + 5}
          y={centerY + 15}
          textAnchor="start"
          style={{ fontSize: '10px' }}
          className="fill-text-muted"
        >
          -100
        </text>
        <text
          x={centerX}
          y={centerY - config.radius - 5}
          textAnchor="middle"
          style={{ fontSize: '10px' }}
          className="fill-text-muted"
        >
          0
        </text>
        <text
          x={centerX + config.radius - 5}
          y={centerY + 15}
          textAnchor="end"
          style={{ fontSize: '10px' }}
          className="fill-text-muted"
        >
          +100
        </text>
      </svg>

      {/* Label and Sentiment */}
      <div className="text-center mt-2">
        <p className="text-xs text-text-muted">{label}</p>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              displayValue >= 50 ? 'bg-success/10 text-success' :
              displayValue >= 0 ? 'bg-warning/10 text-warning' :
              'bg-danger/10 text-danger'
            )}
          >
            {sentimentLabel}
          </span>
          {trendInfo && (
            <span className={cn('text-xs font-medium flex items-center gap-0.5', trendInfo.color)}>
              {trendInfo.icon} {trendInfo.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact inline version
export function SentimentGaugeInline({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const clampedValue = Math.max(-100, Math.min(100, value));
  const normalized = (clampedValue + 100) / 200;
  const color = getSentimentColor(clampedValue);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative w-24 h-2 bg-bg-tertiary rounded-full overflow-hidden">
        {/* Gradient background */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'linear-gradient(to right, #dc2626, #f97316, #eab308, #84cc16, #22c55e)',
          }}
        />
        {/* Indicator */}
        <div
          className="absolute top-0 bottom-0 w-1 rounded-full transition-all duration-500"
          style={{
            left: `${normalized * 100}%`,
            transform: 'translateX(-50%)',
            backgroundColor: color,
            boxShadow: `0 0 4px ${color}`,
          }}
        />
      </div>
      <span className="text-sm font-medium" style={{ color }}>
        {clampedValue >= 0 ? '+' : ''}{clampedValue}
      </span>
    </div>
  );
}

// Mini gauge for cards
export function SentimentGaugeMini({
  value,
  size = 60,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const clampedValue = Math.max(-100, Math.min(100, value));
  const color = getSentimentColor(clampedValue);
  const normalized = (clampedValue + 100) / 200;

  const radius = size / 2 - 5;
  const circumference = Math.PI * radius;
  const offset = circumference - normalized * circumference;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
        {/* Background arc */}
        <path
          d={`M 5 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 5} ${size / 2}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          className="text-bg-tertiary"
        />
        {/* Progress arc */}
        <path
          d={`M 5 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 5} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
        {/* Value */}
        <text
          x={size / 2}
          y={size / 2 - 5}
          textAnchor="middle"
          style={{ fontSize: '12px', fontWeight: 'bold' }}
          fill={color}
        >
          {clampedValue >= 0 ? '+' : ''}{clampedValue}
        </text>
      </svg>
    </div>
  );
}

export default SentimentGauge;
