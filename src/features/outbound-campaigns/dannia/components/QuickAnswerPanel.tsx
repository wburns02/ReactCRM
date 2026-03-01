import { useState, useMemo, useCallback } from "react";
import { Copy, Check, ChevronRight } from "lucide-react";
import type { CampaignContact } from "../../types";
import {
  generateQuickAnswers,
  getCardCategory,
  type QuickAnswerCard,
} from "../quickAnswers";
import type { KBCategory } from "../macSepticKnowledgeBase";

interface QuickAnswerPanelProps {
  contact: CampaignContact | null;
}

export function QuickAnswerPanel({ contact }: QuickAnswerPanelProps) {
  const cards = useMemo(() => generateQuickAnswers(contact), [contact]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<KBCategory | "all">("all");

  const filtered = useMemo(
    () =>
      filter === "all" ? cards : cards.filter((c) => c.category === filter),
    [cards, filter],
  );

  const categories = useMemo(() => {
    const seen = new Set<KBCategory>();
    for (const c of cards) seen.add(c.category);
    return Array.from(seen);
  }, [cards]);

  const handleCopy = useCallback(async (card: QuickAnswerCard) => {
    try {
      await navigator.clipboard.writeText(card.talkingPoint);
      setCopiedId(card.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for non-secure contexts
      const ta = document.createElement("textarea");
      ta.value = card.talkingPoint;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedId(card.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }, []);

  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <div className="text-2xl mb-2">📋</div>
        <p className="text-xs text-text-tertiary">
          Select a contact to see personalized quick answers
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Category filter chips */}
      <div className="flex gap-1 px-3 py-2 overflow-x-auto border-b border-border">
        <button
          onClick={() => setFilter("all")}
          className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
            filter === "all"
              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
              : "bg-bg-muted text-text-tertiary hover:text-text-secondary"
          }`}
        >
          All ({cards.length})
        </button>
        {categories.map((cat) => {
          const info = getCardCategory(cat);
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                filter === cat
                  ? info.color
                  : "bg-bg-muted text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {info.label}
            </button>
          );
        })}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 max-h-[280px] min-h-[120px]">
        {filtered.map((card) => {
          const catInfo = getCardCategory(card.category);
          const isExpanded = expandedId === card.id;
          const isCopied = copiedId === card.id;

          return (
            <div
              key={card.id}
              className="rounded-lg border border-border bg-bg-body overflow-hidden transition-all"
            >
              {/* Card header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : card.id)}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-bg-hover transition-colors"
              >
                <span
                  className={`shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${catInfo.color}`}
                >
                  {catInfo.icon}
                </span>
                <span className="flex-1 text-xs font-medium text-text-primary truncate">
                  {card.title}
                </span>
                <ChevronRight
                  className={`w-3.5 h-3.5 text-text-tertiary transition-transform ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                />
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-2.5 pb-2.5 border-t border-border/50">
                  <p className="text-[11px] leading-relaxed text-text-secondary mt-2">
                    {card.content}
                  </p>

                  {/* Talking point + copy button */}
                  <div className="mt-2 flex items-start gap-2 bg-purple-50/50 dark:bg-purple-950/20 rounded-md p-2 border border-purple-200/50 dark:border-purple-800/30">
                    <p className="flex-1 text-[10px] leading-relaxed text-purple-700 dark:text-purple-300 italic">
                      &ldquo;{card.talkingPoint}&rdquo;
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(card);
                      }}
                      className="shrink-0 p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                      title="Copy talking point"
                    >
                      {isCopied ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3 text-purple-500" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
