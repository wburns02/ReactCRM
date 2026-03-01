import { useState } from "react";
import { Sparkles, X, Loader2, Check, Pencil } from "lucide-react";

interface AutoSummaryBannerProps {
  summary: string[] | null;
  isGenerating: boolean;
  onUseAsNotes: (text: string) => void;
  onDismiss: () => void;
}

export function AutoSummaryBanner({
  summary,
  isGenerating,
  onUseAsNotes,
  onDismiss,
}: AutoSummaryBannerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");

  if (!isGenerating && !summary) return null;

  const bulletsText = summary ? summary.map((b) => `• ${b}`).join("\n") : "";

  return (
    <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400">
            AI Summary
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="p-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-400"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {isGenerating && (
        <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Generating summary...
        </div>
      )}

      {summary && !isEditing && (
        <>
          <ul className="space-y-0.5">
            {summary.map((bullet, i) => (
              <li
                key={i}
                className="text-xs text-text-primary leading-relaxed flex items-start gap-1.5"
              >
                <span className="text-blue-400 mt-0.5">&#x2022;</span>
                {bullet}
              </li>
            ))}
          </ul>
          <div className="flex gap-1.5">
            <button
              onClick={() => onUseAsNotes(bulletsText)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50"
            >
              <Check className="w-3 h-3" /> Use as Notes
            </button>
            <button
              onClick={() => {
                setEditText(bulletsText);
                setIsEditing(true);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-bg-hover text-text-secondary hover:bg-bg-card"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
          </div>
        </>
      )}

      {isEditing && (
        <>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            className="w-full px-2 py-1.5 rounded border border-blue-200 dark:border-blue-800 bg-white dark:bg-bg-body text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
          />
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                onUseAsNotes(editText);
                setIsEditing(false);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200"
            >
              <Check className="w-3 h-3" /> Save as Notes
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-2 py-1 rounded text-[10px] font-medium text-text-tertiary hover:text-text-secondary"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
