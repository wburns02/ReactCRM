/**
 * PlaybookPanel Component
 *
 * Displays the playbook content including objective, script, key questions, and objection handlers.
 */

import { useState } from "react";
import type { CSMPlaybook } from "../../../../api/types/customerSuccess";

interface PlaybookPanelProps {
  playbook: CSMPlaybook;
  customerName?: string;
}

export function PlaybookPanel({
  playbook,
  customerName = "[name]",
}: PlaybookPanelProps) {
  const [expandedObjection, setExpandedObjection] = useState<string | null>(
    null,
  );
  const [copiedScript, setCopiedScript] = useState(false);

  // Replace placeholders in script
  const processScript = (script: string) => {
    return script
      .replace(/\[name\]/g, customerName)
      .replace(/\[csm\]/g, "CSM")
      .replace(/\[company\]/g, "ECBTX");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(processScript(text));
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Objective */}
      <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg
            className="w-5 h-5 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="font-semibold text-primary">Objective</h3>
        </div>
        <p className="text-text-primary">{processScript(playbook.objective)}</p>
      </div>

      {/* Opening Script */}
      <div className="bg-bg-secondary rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <h3 className="font-semibold text-text-primary">Opening Script</h3>
          </div>
          <button
            onClick={() => copyToClipboard(playbook.opening_script)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            {copiedScript ? (
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Copied!
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
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
        <div className="bg-bg-primary rounded-lg p-4 border-l-4 border-primary">
          <p className="text-text-primary italic leading-relaxed">
            "{processScript(playbook.opening_script)}"
          </p>
        </div>
      </div>

      {/* Key Questions */}
      {playbook.key_questions && playbook.key_questions.length > 0 && (
        <div className="bg-bg-secondary rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg
              className="w-5 h-5 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="font-semibold text-text-primary">
              Key Questions to Ask
            </h3>
          </div>
          <ul className="space-y-2">
            {playbook.key_questions.map((question, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-sm flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="text-text-primary">{question}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Objection Handlers */}
      {playbook.objection_handlers &&
        playbook.objection_handlers.length > 0 && (
          <div className="bg-bg-secondary rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="w-5 h-5 text-text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h3 className="font-semibold text-text-primary">
                Objection Handlers
              </h3>
            </div>
            <div className="space-y-2">
              {playbook.objection_handlers.map((handler) => (
                <div
                  key={handler.id}
                  className="bg-bg-primary rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedObjection(
                        expandedObjection === handler.id ? null : handler.id,
                      )
                    }
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-bg-card transition-colors"
                  >
                    <span className="text-orange-400 font-medium">
                      If they say: "{handler.trigger}"
                    </span>
                    <svg
                      className={`w-5 h-5 text-text-muted transition-transform ${expandedObjection === handler.id ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {expandedObjection === handler.id && (
                    <div className="px-3 pb-3">
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <span className="text-xs text-green-400 font-medium mb-1 block">
                          Your Response:
                        </span>
                        <p className="text-text-primary">
                          {processScript(handler.response)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Success Criteria */}
      <div className="bg-bg-secondary rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg
            className="w-5 h-5 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="font-semibold text-text-primary">Success Criteria</h3>
        </div>
        <p className="text-text-muted">
          {processScript(playbook.success_criteria)}
        </p>
      </div>

      {/* Estimated Duration */}
      <div className="flex items-center gap-2 text-sm text-text-muted">
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
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>
          Estimated duration: {playbook.estimated_duration_minutes} minutes
        </span>
      </div>
    </div>
  );
}

export default PlaybookPanel;
