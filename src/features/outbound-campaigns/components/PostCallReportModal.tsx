import { useState } from "react";
import type { CampaignContact, ContactCallStatus } from "../types";
import { CALL_STATUS_CONFIG } from "../types";
import {
  X,
  Clock,
  FileText,
  MessageSquare,
  Sparkles,
  StickyNote,
  Phone,
} from "lucide-react";

interface PostCallReportModalProps {
  contact: CampaignContact;
  campaignId: string;
  callDuration: number;
  callSid: string | null;
  callStartTime: number;
  agentTranscript: string;
  customerTranscript: string;
  aiSummary: string[];
  notes: string;
  detectedQuestions: { question: string; confidence: number }[];
  assistMessages: { role: string; content: string }[];
  twoSidedTranscription: boolean;
  onDisposition: (status: ContactCallStatus, editedNotes?: string) => void;
  onClose: () => void;
}

export function PostCallReportModal({
  contact,
  callDuration,
  agentTranscript,
  customerTranscript,
  aiSummary,
  notes,
  twoSidedTranscription,
  onDisposition,
  onClose,
}: PostCallReportModalProps) {
  const [editedNotes, setEditedNotes] = useState(notes);
  const [activeSection, setActiveSection] = useState<"summary" | "transcript">("summary");

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const dispositions: ContactCallStatus[] = [
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Post-Call Report
            </h2>
            <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary">
              <span className="font-medium">{contact.account_name}</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(callDuration)}
              </span>
              {contact.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {contact.phone}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section tabs */}
        <div className="flex border-b border-border px-5">
          <button
            onClick={() => setActiveSection("summary")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
              activeSection === "summary"
                ? "border-b-2 border-primary text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Summary
          </button>
          <button
            onClick={() => setActiveSection("transcript")}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors ${
              activeSection === "transcript"
                ? "border-b-2 border-primary text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Transcript
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {activeSection === "summary" && (
            <>
              {/* AI Summary */}
              {aiSummary.length > 0 && (
                <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                      AI Summary
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {aiSummary.map((point, i) => (
                      <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                        <span className="text-purple-400 mt-0.5">&#8226;</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Notes */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <StickyNote className="w-4 h-4 text-text-tertiary" />
                  <span className="text-sm font-medium text-text-primary">
                    Call Notes
                  </span>
                </div>
                <textarea
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  rows={3}
                  placeholder="Add notes about this call..."
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg-body text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </>
          )}

          {activeSection === "transcript" && (
            <div className="space-y-3">
              {twoSidedTranscription ? (
                <>
                  {agentTranscript && (
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                          Agent
                        </span>
                      </div>
                      <div className="rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 text-sm text-text-secondary whitespace-pre-wrap">
                        {agentTranscript}
                      </div>
                    </div>
                  )}
                  {customerTranscript && (
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                          Customer
                        </span>
                      </div>
                      <div className="rounded-lg bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3 text-sm text-text-secondary whitespace-pre-wrap">
                        {customerTranscript}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  {agentTranscript ? (
                    <div className="rounded-lg bg-bg-hover border border-border p-3 text-sm text-text-secondary whitespace-pre-wrap">
                      {agentTranscript}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-text-tertiary">
                      No transcript available for this call.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Disposition buttons */}
        <div className="border-t border-border px-5 py-4">
          <div className="text-xs text-text-tertiary mb-2 font-medium">
            Disposition
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {dispositions.map((status) => {
              const conf = CALL_STATUS_CONFIG[status];
              return (
                <button
                  key={status}
                  onClick={() => onDisposition(status, editedNotes)}
                  className={`px-2 py-2 rounded-lg text-[11px] font-medium transition-colors ${conf.color} hover:opacity-80`}
                >
                  {conf.icon} {conf.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
