import { useState } from "react";
import { Info } from "lucide-react";

interface ScoreExplanationProps {
  score: number;
  explanation: string;
}

export function ScoreExplanation({ score, explanation }: ScoreExplanationProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const color =
    score >= 70
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
      : score >= 40
        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";

  return (
    <div className="relative inline-flex items-center gap-1">
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${color}`}
      >
        {score}
      </span>
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="text-text-tertiary hover:text-text-secondary"
      >
        <Info className="w-3 h-3" />
      </button>
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-0 mb-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-700 text-white text-[11px] whitespace-nowrap shadow-lg">
          <div className="font-medium mb-0.5">Why this contact is next</div>
          <div className="text-zinc-300">{explanation}</div>
          <div className="absolute top-full left-3 w-2 h-2 bg-zinc-900 dark:bg-zinc-700 rotate-45 -mt-1" />
        </div>
      )}
    </div>
  );
}
