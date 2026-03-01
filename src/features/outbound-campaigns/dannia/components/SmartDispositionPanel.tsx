import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  getSmartDispositions,
  type SmartDisposition,
} from "../smartDisposition";
import { getTemplatesForDisposition } from "../noteTemplates";
import { CALL_STATUS_CONFIG, type ContactCallStatus } from "../../types";

interface SmartDispositionPanelProps {
  callTimer: number;
  phoneState: string;
  isCallback: boolean;
  callAttempts: number;
  notes: string;
  onNotesChange: (notes: string) => void;
  onDisposition: (status: ContactCallStatus) => void;
}

export function SmartDispositionPanel({
  callTimer,
  phoneState,
  isCallback,
  callAttempts,
  notes,
  onNotesChange,
  onDisposition,
}: SmartDispositionPanelProps) {
  const [showAllDispositions, setShowAllDispositions] = useState(false);
  const [hoveredStatus, setHoveredStatus] = useState<ContactCallStatus | null>(
    null,
  );

  const wasConnected =
    phoneState === "active" || phoneState === "registered" || callTimer > 20;

  const smartDispositions = useMemo(
    () => getSmartDispositions(callTimer, wasConnected, isCallback, callAttempts),
    [callTimer, wasConnected, isCallback, callAttempts],
  );

  const activeStatus = hoveredStatus ?? smartDispositions[0]?.status ?? null;

  const noteTemplates = useMemo(
    () => getTemplatesForDisposition(activeStatus),
    [activeStatus],
  );

  const handleTemplateClick = (text: string) => {
    const newNotes = notes ? `${notes}\n${text}` : text;
    onNotesChange(newNotes);
  };

  const primary = smartDispositions[0];
  const secondaries = smartDispositions.slice(1);

  const allStatuses: ContactCallStatus[] = [
    "interested",
    "not_interested",
    "voicemail",
    "no_answer",
    "busy",
    "callback_scheduled",
    "wrong_number",
    "do_not_call",
    "completed",
  ];

  return (
    <div className="space-y-3">
      {/* Smart disposition label */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-text-tertiary font-medium">
          Smart Disposition
        </div>
        {primary && (
          <div className="text-[10px] text-text-tertiary italic">
            {primary.reason}
          </div>
        )}
      </div>

      {/* Primary recommendation — large button */}
      {primary && (
        <button
          onClick={() => onDisposition(primary.status)}
          onMouseEnter={() => setHoveredStatus(primary.status)}
          onMouseLeave={() => setHoveredStatus(null)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-bold transition-colors bg-primary text-white hover:bg-primary/90 shadow-sm"
        >
          <span className="text-lg">{primary.icon}</span>
          {primary.label}
        </button>
      )}

      {/* Secondary recommendations — smaller buttons */}
      {secondaries.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {secondaries.map((d) => (
            <button
              key={d.status}
              onClick={() => onDisposition(d.status)}
              onMouseEnter={() => setHoveredStatus(d.status)}
              onMouseLeave={() => setHoveredStatus(null)}
              className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[11px] font-medium transition-colors ${
                d.confidence === "medium"
                  ? "bg-bg-hover text-text-primary hover:bg-bg-card border border-border"
                  : "bg-bg-body text-text-secondary hover:bg-bg-hover border border-transparent"
              }`}
            >
              <span>{d.icon}</span> {d.label}
            </button>
          ))}
        </div>
      )}

      {/* Note template chips */}
      <div>
        <div className="text-[10px] text-text-tertiary font-medium mb-1.5">
          Quick Notes
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
          {noteTemplates.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTemplateClick(t.text)}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium bg-bg-hover text-text-secondary hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20 transition-colors"
            >
              {t.text}
            </button>
          ))}
        </div>
      </div>

      {/* More options expander */}
      <div>
        <button
          onClick={() => setShowAllDispositions(!showAllDispositions)}
          className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-secondary font-medium transition-colors"
        >
          {showAllDispositions ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
          {showAllDispositions ? "Hide options" : "More options"}
        </button>

        {showAllDispositions && (
          <div className="grid grid-cols-3 gap-1.5 mt-2">
            {allStatuses.map((status) => {
              const conf = CALL_STATUS_CONFIG[status];
              return (
                <button
                  key={status}
                  onClick={() => onDisposition(status)}
                  className={`px-2 py-2 rounded-lg text-[11px] font-medium transition-colors ${conf.color} hover:opacity-80`}
                >
                  {conf.icon} {conf.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
