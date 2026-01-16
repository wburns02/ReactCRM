/**
 * Call Detail Modal Component
 *
 * Full-screen modal showing comprehensive call details including:
 * - Call metadata (phone numbers, direction, duration, timestamp)
 * - Recording player with audio controls
 * - AI analysis summary (sentiment, quality scores, CSAT prediction)
 * - Quality breakdown with progress bars
 * - Topics and keywords as badges
 * - Coaching insights (strengths/improvements)
 * - Disposition history timeline
 * - Transcript with speaker labels
 */

import { useEffect, useCallback, useState, useMemo } from "react";
import {
  X,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Mic,
  Brain,
  User,
  Headphones,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  MessageSquare,
  History,
  FileText,
  Star,
  Activity,
  Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs, TabList, TabTrigger } from "@/components/ui/Tabs";
import { cn } from "@/lib/utils";
import { SecureCallRecordingPlayer } from "@/features/calls/components/SecureCallRecordingPlayer.tsx";
import { useCallTranscript } from "../api";
import type { CallWithAnalysis, SentimentLevel, EscalationRisk } from "../types";

interface CallDetailModalProps {
  call: CallWithAnalysis | null;
  isOpen: boolean;
  onClose: () => void;
}

// Helper functions
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

// Sentiment configuration
const SENTIMENT_CONFIG: Record<SentimentLevel, { label: string; color: string; bgColor: string; icon: typeof TrendingUp }> = {
  positive: {
    label: "Positive",
    color: "text-success",
    bgColor: "bg-success/10",
    icon: TrendingUp,
  },
  neutral: {
    label: "Neutral",
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    icon: Activity,
  },
  negative: {
    label: "Negative",
    color: "text-danger",
    bgColor: "bg-danger/10",
    icon: TrendingDown,
  },
  mixed: {
    label: "Mixed",
    color: "text-warning",
    bgColor: "bg-warning/10",
    icon: Activity,
  },
};

// Escalation risk configuration
const ESCALATION_CONFIG: Record<EscalationRisk, { label: string; color: string; bgColor: string }> = {
  low: {
    label: "Low Risk",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  medium: {
    label: "Medium Risk",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  high: {
    label: "High Risk",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  critical: {
    label: "Critical Risk",
    color: "text-danger",
    bgColor: "bg-danger/10",
  },
};

// Progress bar component for quality metrics
function QualityProgressBar({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof CheckCircle;
}) {
  const getColor = (val: number) => {
    if (val >= 80) return "bg-success";
    if (val >= 60) return "bg-warning";
    return "bg-danger";
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-text-secondary">
          <Icon className="w-4 h-4" />
          {label}
        </span>
        <span className="font-semibold text-text-primary">{value}%</span>
      </div>
      <div className="h-2 bg-bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", getColor(value))}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// Transcript entry interface for parsed transcripts
interface TranscriptEntry {
  speaker: "customer" | "agent";
  text: string;
  timestamp: string;
}

/**
 * Parse a transcript string into structured entries
 * Tries to detect speaker labels and timestamps from various formats
 */
function parseTranscript(transcriptText: string | null): TranscriptEntry[] {
  if (!transcriptText) return [];

  const entries: TranscriptEntry[] = [];

  // Try to parse as structured format (Speaker: text or [timestamp] Speaker: text)
  const lines = transcriptText.split(/\n+/).filter(line => line.trim());

  // Pattern: [timestamp] Speaker: text or Speaker: text or Speaker (timestamp): text
  const speakerPattern = /^(?:\[?(\d+:\d+(?::\d+)?)\]?\s*)?(?:(Agent|Customer|Speaker\s*\d*|Rep|Representative|Caller|CSR)[\s:]+)?(.+)$/i;

  let lineIndex = 0;
  for (const line of lines) {
    const match = line.match(speakerPattern);
    if (match) {
      const timestamp = match[1] || formatTimeFromIndex(lineIndex);
      const speakerRaw = match[2] || "";
      const text = match[3]?.trim() || line.trim();

      // Determine speaker type based on keywords
      const speakerLower = speakerRaw.toLowerCase();
      const isAgent = speakerLower.includes("agent") ||
                      speakerLower.includes("rep") ||
                      speakerLower.includes("csr");
      const isCustomer = speakerLower.includes("customer") ||
                         speakerLower.includes("caller");

      // Alternate speakers if no clear label
      let speaker: "customer" | "agent";
      if (isAgent) {
        speaker = "agent";
      } else if (isCustomer) {
        speaker = "customer";
      } else {
        // Alternate based on position
        speaker = lineIndex % 2 === 0 ? "agent" : "customer";
      }

      entries.push({ speaker, text, timestamp });
    }
    lineIndex++;
  }

  // If parsing didn't work well, just show as single block
  if (entries.length === 0 && transcriptText.length > 0) {
    entries.push({
      speaker: "agent",
      text: transcriptText,
      timestamp: "0:00"
    });
  }

  return entries;
}

function formatTimeFromIndex(index: number): string {
  // Estimate ~10 seconds per line
  const totalSeconds = index * 10;
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Mock disposition history
interface DispositionHistoryEntry {
  disposition: string;
  timestamp: string;
  source: "ai" | "manual";
  confidence?: number;
  user?: string;
}

function getMockDispositionHistory(): DispositionHistoryEntry[] {
  return [
    { disposition: "Service Request", timestamp: "2026-01-14T10:35:00Z", source: "ai", confidence: 94 },
    { disposition: "Scheduled Appointment", timestamp: "2026-01-14T10:36:00Z", source: "ai", confidence: 98 },
  ];
}

// Mock coaching insights
interface CoachingData {
  strengths: string[];
  improvements: string[];
}

function getMockCoachingInsights(): CoachingData {
  return {
    strengths: [
      "Excellent empathy shown to customer",
      "Clear and professional communication",
      "Efficient problem resolution",
      "Proper account verification",
    ],
    improvements: [
      "Consider offering additional services",
      "Could confirm customer contact info",
    ],
  };
}

export function CallDetailModal({ call, isOpen, onClose }: CallDetailModalProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch real transcript data from API
  const { data: transcriptData, isLoading: isTranscriptLoading } = useCallTranscript(
    isOpen && call ? call.id : null
  );

  // Parse transcript into structured entries
  const parsedTranscript = useMemo(() => {
    return parseTranscript(transcriptData?.transcript ?? null);
  }, [transcriptData?.transcript]);

  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [handleEscape]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Reset tab when call changes
  useEffect(() => {
    if (call) {
      setActiveTab("overview");
    }
  }, [call?.id]);

  if (!isOpen) return null;

  // Loading state
  if (!call) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-bg-card rounded-xl p-8 shadow-2xl">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-text-secondary">Loading call details...</p>
          </div>
        </div>
      </div>
    );
  }

  const sentimentConfig = SENTIMENT_CONFIG[call.sentiment];
  const escalationConfig = ESCALATION_CONFIG[call.escalation_risk];
  const SentimentIcon = sentimentConfig.icon;
  const DirectionIcon = call.direction === "inbound" ? PhoneIncoming : PhoneOutgoing;
  // Use real transcript from API, parsed into entries
  const transcript = parsedTranscript;
  const hasTranscriptData = transcriptData?.has_transcript || parsedTranscript.length > 0;
  const dispositionHistory = getMockDispositionHistory();
  const coaching = getMockCoachingInsights();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-4 px-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-bg-card border border-border rounded-xl shadow-2xl w-full max-w-5xl min-h-[80vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-border p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {/* Direction and Customer */}
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    call.direction === "inbound"
                      ? "bg-success/10 text-success"
                      : "bg-info/10 text-info"
                  )}
                >
                  <DirectionIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">
                    {call.customer_name || "Unknown Customer"}
                  </h2>
                  <p className="text-sm text-text-secondary">
                    {call.direction === "inbound" ? "Inbound" : "Outbound"} Call
                    {call.agent_name && ` - Agent: ${call.agent_name}`}
                  </p>
                </div>
              </div>

              {/* Phone Numbers, Duration, Timestamp */}
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-text-secondary">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>
                    {formatPhoneNumber(call.from_number)} → {formatPhoneNumber(call.to_number)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(call.duration_seconds)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{formatTimestamp(call.start_time)}</span>
                </div>
              </div>

              {/* Quick badges */}
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <Badge className={cn(sentimentConfig.bgColor, sentimentConfig.color)}>
                  <SentimentIcon className="w-3 h-3 mr-1" />
                  {sentimentConfig.label}
                </Badge>
                <Badge className={cn(escalationConfig.bgColor, escalationConfig.color)}>
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {escalationConfig.label}
                </Badge>
                {call.disposition && (
                  <Badge variant="outline">
                    <Target className="w-3 h-3 mr-1" />
                    {call.disposition}
                  </Badge>
                )}
                {call.has_analysis && (
                  <Badge variant="info">
                    <Brain className="w-3 h-3 mr-1" />
                    AI Analyzed
                  </Badge>
                )}
              </div>
            </div>

            {/* Close button */}
            <Button variant="ghost" size="sm" onClick={onClose} className="flex-shrink-0">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex-shrink-0 border-b border-border px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabList className="border-b-0">
              <TabTrigger value="overview">
                <Brain className="w-4 h-4 mr-2" />
                Overview
              </TabTrigger>
              <TabTrigger value="quality">
                <Star className="w-4 h-4 mr-2" />
                Quality
              </TabTrigger>
              <TabTrigger value="coaching">
                <Target className="w-4 h-4 mr-2" />
                Coaching
              </TabTrigger>
              <TabTrigger value="transcript">
                <FileText className="w-4 h-4 mr-2" />
                Transcript
              </TabTrigger>
              <TabTrigger value="history">
                <History className="w-4 h-4 mr-2" />
                History
              </TabTrigger>
            </TabList>
          </Tabs>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Recording Player */}
              {call.has_recording && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Mic className="w-5 h-5 text-primary" />
                      Call Recording
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SecureCallRecordingPlayer callId={call.id} />
                    <p className="text-sm text-text-secondary mt-2">
                      Duration: {formatDuration(call.duration_seconds)}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* AI Analysis Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Brain className="w-5 h-5 text-primary" />
                    AI Analysis Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Sentiment */}
                    <div className="text-center p-4 rounded-lg bg-bg-muted">
                      <SentimentIcon className={cn("w-8 h-8 mx-auto mb-2", sentimentConfig.color)} />
                      <p className="text-sm text-text-secondary mb-1">Sentiment</p>
                      <p className={cn("text-lg font-bold", sentimentConfig.color)}>
                        {sentimentConfig.label}
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        Score: {call.sentiment_score > 0 ? "+" : ""}{call.sentiment_score}
                      </p>
                    </div>

                    {/* Quality Score */}
                    <div className="text-center p-4 rounded-lg bg-bg-muted">
                      <CheckCircle
                        className={cn(
                          "w-8 h-8 mx-auto mb-2",
                          call.quality_score >= 80
                            ? "text-success"
                            : call.quality_score >= 60
                              ? "text-warning"
                              : "text-danger"
                        )}
                      />
                      <p className="text-sm text-text-secondary mb-1">Quality Score</p>
                      <p
                        className={cn(
                          "text-lg font-bold",
                          call.quality_score >= 80
                            ? "text-success"
                            : call.quality_score >= 60
                              ? "text-warning"
                              : "text-danger"
                        )}
                      >
                        {call.quality_score}%
                      </p>
                      <p className="text-xs text-text-muted mt-1">Excellent</p>
                    </div>

                    {/* CSAT Prediction */}
                    <div className="text-center p-4 rounded-lg bg-bg-muted">
                      <Star
                        className={cn(
                          "w-8 h-8 mx-auto mb-2",
                          (call.csat_prediction || 0) >= 4
                            ? "text-success"
                            : (call.csat_prediction || 0) >= 3
                              ? "text-warning"
                              : "text-danger"
                        )}
                      />
                      <p className="text-sm text-text-secondary mb-1">CSAT Prediction</p>
                      <p className="text-lg font-bold text-text-primary">
                        {call.csat_prediction?.toFixed(1) || "N/A"} / 5
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        {(call.csat_prediction || 0) >= 4 ? "Very Satisfied" : "Satisfied"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Topics & Keywords */}
              {(call.topics && call.topics.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MessageSquare className="w-5 h-5 text-primary" />
                      Topics & Keywords
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {call.primary_topic && (
                        <Badge variant="primary" size="lg">
                          {call.primary_topic}
                        </Badge>
                      )}
                      {call.topics.map((topic, index) => (
                        <Badge key={index} variant="outline">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Quality Tab */}
          {activeTab === "quality" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Star className="w-5 h-5 text-primary" />
                    Quality Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <QualityProgressBar
                    label="Professionalism"
                    value={call.professionalism_score || 0}
                    icon={User}
                  />
                  <QualityProgressBar
                    label="Empathy"
                    value={call.empathy_score || 0}
                    icon={Headphones}
                  />
                  <QualityProgressBar
                    label="Clarity"
                    value={call.clarity_score || 0}
                    icon={MessageSquare}
                  />
                  <QualityProgressBar
                    label="Resolution"
                    value={call.resolution_score || 0}
                    icon={CheckCircle}
                  />
                  <QualityProgressBar
                    label="Overall Quality"
                    value={call.quality_score}
                    icon={Star}
                  />
                </CardContent>
              </Card>

              {/* Escalation Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertTriangle className="w-5 h-5 text-primary" />
                    Escalation Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "p-4 rounded-xl",
                        escalationConfig.bgColor
                      )}
                    >
                      <AlertTriangle className={cn("w-8 h-8", escalationConfig.color)} />
                    </div>
                    <div>
                      <p className={cn("text-xl font-bold", escalationConfig.color)}>
                        {escalationConfig.label}
                      </p>
                      <p className="text-sm text-text-secondary">
                        Escalation Score: {call.escalation_score || 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Coaching Tab */}
          {activeTab === "coaching" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strengths */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-success">
                    <TrendingUp className="w-5 h-5" />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {coaching.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-text-primary">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Areas for Improvement */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-warning">
                    <Target className="w-5 h-5" />
                    Areas for Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {coaching.improvements.map((improvement, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                        <span className="text-text-primary">{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Transcript Tab */}
          {activeTab === "transcript" && (
            <div className="space-y-6">
              {/* AI Summary Card */}
              {transcriptData?.ai_summary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Brain className="w-5 h-5 text-primary" />
                      AI Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-text-secondary whitespace-pre-wrap">{transcriptData.ai_summary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Transcript Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5 text-primary" />
                    Call Transcript
                    {transcriptData?.transcription_status && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {transcriptData.transcription_status}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isTranscriptLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      <span className="ml-3 text-text-secondary">Loading transcript...</span>
                    </div>
                  ) : hasTranscriptData && transcript.length > 0 ? (
                    <div className="space-y-4">
                      {transcript.map((entry, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex gap-3 p-3 rounded-lg",
                            entry.speaker === "agent" ? "bg-primary/5" : "bg-bg-muted"
                          )}
                        >
                          <div
                            className={cn(
                              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                              entry.speaker === "agent"
                                ? "bg-primary text-white"
                                : "bg-gray-500 text-white"
                            )}
                          >
                            {entry.speaker === "agent" ? (
                              <Headphones className="w-4 h-4" />
                            ) : (
                              <User className="w-4 h-4" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm text-text-primary">
                                {entry.speaker === "agent" ? call.agent_name || "Agent" : "Customer"}
                              </span>
                              <span className="text-xs text-text-muted">{entry.timestamp}</span>
                            </div>
                            <p className="text-text-secondary">{entry.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : call.has_recording && transcriptData?.transcription_hint ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-text-muted mx-auto mb-4" />
                      <p className="text-text-secondary">{transcriptData.transcription_hint}</p>
                      <p className="text-sm text-text-muted mt-1">
                        Status: {transcriptData?.transcription_status || "pending"}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-text-muted mx-auto mb-4" />
                      <p className="text-text-secondary">No transcript available for this call.</p>
                      <p className="text-sm text-text-muted mt-1">
                        {call.has_recording
                          ? "Transcription may still be processing."
                          : "Transcripts are generated for calls with recordings."}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="w-5 h-5 text-primary" />
                  Disposition History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                  <div className="space-y-6">
                    {dispositionHistory.map((entry, index) => (
                      <div key={index} className="relative pl-10">
                        {/* Timeline dot */}
                        <div
                          className={cn(
                            "absolute left-2.5 w-3 h-3 rounded-full border-2 border-bg-card",
                            entry.source === "ai" ? "bg-primary" : "bg-success"
                          )}
                        />

                        <div className="bg-bg-muted rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={entry.source === "ai" ? "info" : "success"}>
                                {entry.source === "ai" ? (
                                  <>
                                    <Brain className="w-3 h-3 mr-1" />
                                    AI
                                  </>
                                ) : (
                                  <>
                                    <User className="w-3 h-3 mr-1" />
                                    Manual
                                  </>
                                )}
                              </Badge>
                              <span className="font-semibold text-text-primary">
                                {entry.disposition}
                              </span>
                            </div>
                            {entry.confidence && (
                              <span className="text-sm text-text-secondary">
                                {entry.confidence}% confidence
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-text-muted">
                            {new Date(entry.timestamp).toLocaleString()}
                            {entry.user && ` by ${entry.user}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-border p-4 flex items-center justify-between">
          <div className="text-sm text-text-muted">
            Call ID: {call.id}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {call.has_recording && (
              <Button variant="primary">
                <Mic className="w-4 h-4 mr-2" />
                Download Recording
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
