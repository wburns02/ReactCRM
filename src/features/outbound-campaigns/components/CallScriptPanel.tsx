import { useState, useMemo } from "react";
import type { CampaignContact } from "../types";
import { getCallScript, AGENT_TIPS } from "../callScripts";
import type { ScriptSection, ObjectionHandler } from "../callScripts";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  MessageSquare,
  Shield,
  Sparkles,
} from "lucide-react";

interface CallScriptPanelProps {
  contact: CampaignContact;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function CallScriptPanel({
  contact,
  collapsed = false,
  onToggle,
}: CallScriptPanelProps) {
  const script = useMemo(() => getCallScript(contact), [contact]);
  const [activeSection, setActiveSection] = useState<string>("opening");
  const [showObjections, setShowObjections] = useState(false);
  const [showTips, setShowTips] = useState(false);

  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-bg-card border border-border rounded-xl text-sm text-text-secondary hover:bg-bg-hover transition-colors"
      >
        <BookOpen className="w-4 h-4 text-primary" />
        <span className="font-medium">Call Script</span>
        <ChevronRight className="w-4 h-4 ml-auto" />
      </button>
    );
  }

  const sections: { key: string; section: ScriptSection; icon: typeof BookOpen }[] = [
    { key: "opening", section: script.opening, icon: MessageSquare },
    { key: "valueProps", section: script.valueProps, icon: Sparkles },
    ...script.contextual.map((s, i) => ({
      key: `ctx-${i}`,
      section: s,
      icon: Lightbulb,
    })),
    { key: "closing", section: script.closing, icon: BookOpen },
  ];

  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-hover/50">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-text-primary">
            Call Script
          </span>
        </div>
        <button
          onClick={onToggle}
          className="text-text-tertiary hover:text-text-secondary"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 px-3 py-2 overflow-x-auto border-b border-border">
        {sections.map(({ key, section, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
              activeSection === key
                ? "bg-primary text-white"
                : "bg-bg-hover text-text-secondary hover:text-text-primary"
            }`}
          >
            <Icon className="w-3 h-3" />
            {section.title}
          </button>
        ))}
      </div>

      {/* Active section content */}
      <div className="px-4 py-3 max-h-[260px] overflow-y-auto">
        {sections.map(({ key, section }) => {
          if (key !== activeSection) return null;
          return (
            <div key={key} className="space-y-2">
              {section.highlight && (
                <div className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                  Key talking point
                </div>
              )}
              {section.lines.map((line, i) => (
                <div
                  key={i}
                  className={`text-sm leading-relaxed ${
                    line.startsWith('"')
                      ? "text-text-primary italic bg-primary/5 rounded-lg px-3 py-2 border-l-2 border-primary"
                      : line.startsWith("[")
                        ? "text-text-secondary text-xs font-medium"
                        : "text-text-secondary"
                  }`}
                >
                  {line}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Objection handlers toggle */}
      <div className="border-t border-border">
        <button
          onClick={() => {
            setShowObjections(!showObjections);
            setShowTips(false);
          }}
          className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-text-secondary hover:bg-bg-hover transition-colors"
        >
          <Shield className="w-3.5 h-3.5 text-amber-500" />
          Objection Handlers ({script.objections.length})
          <ChevronDown
            className={`w-3 h-3 ml-auto transition-transform ${
              showObjections ? "rotate-180" : ""
            }`}
          />
        </button>

        {showObjections && (
          <div className="px-4 pb-3 space-y-2 max-h-[200px] overflow-y-auto">
            {script.objections.map((obj, i) => (
              <ObjectionCard key={i} handler={obj} />
            ))}
          </div>
        )}
      </div>

      {/* Agent tips toggle */}
      <div className="border-t border-border">
        <button
          onClick={() => {
            setShowTips(!showTips);
            setShowObjections(false);
          }}
          className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-text-secondary hover:bg-bg-hover transition-colors"
        >
          <Lightbulb className="w-3.5 h-3.5 text-emerald-500" />
          Agent Tips
          <ChevronDown
            className={`w-3 h-3 ml-auto transition-transform ${
              showTips ? "rotate-180" : ""
            }`}
          />
        </button>

        {showTips && (
          <div className="px-4 pb-3">
            <ul className="space-y-1.5">
              {AGENT_TIPS.map((tip, i) => (
                <li
                  key={i}
                  className="text-xs text-text-secondary flex items-start gap-2"
                >
                  <span className="text-emerald-500 mt-0.5 shrink-0">
                    &bull;
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function ObjectionCard({ handler }: { handler: ObjectionHandler }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-hover transition-colors"
      >
        <span className="text-xs font-medium text-amber-600 flex-1">
          &ldquo;{handler.objection}&rdquo;
        </span>
        <ChevronDown
          className={`w-3 h-3 text-text-tertiary shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="px-3 pb-2.5 text-xs text-text-primary italic leading-relaxed bg-primary/5 border-t border-border">
          {handler.response}
        </div>
      )}
    </div>
  );
}
