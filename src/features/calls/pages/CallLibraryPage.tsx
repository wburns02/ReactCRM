import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import {
  Trophy, TrendingDown, Lightbulb, Play, Pause, Clock,
  Phone, PhoneIncoming, PhoneOutgoing, Star, ChevronDown,
  ChevronUp, User, Calendar, MessageSquare, Filter,
  BarChart3, Headphones, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────

interface CallRecord {
  id: string;
  caller_number: string;
  called_number: string;
  direction: string;
  duration_seconds: number;
  call_date: string;
  call_time: string;
  call_disposition: string | null;
  recording_url: string | null;
  transcription: string | null;
  ai_summary: string | null;
  sentiment: string | null;
  sentiment_score: number | null;
  quality_score: number | null;
  notes: string | null;
  customer_name?: string;
  customer_id?: string;
}

type LibraryTab = "wins" | "pitches" | "losses" | "all";

// ── Component ─────────────────────────────────────────────────────

export function CallLibraryPage() {
  const [activeTab, setActiveTab] = useState<LibraryTab>("wins");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  // Fetch pre-categorized library from backend
  const { data, isLoading } = useQuery({
    queryKey: ["call-library"],
    queryFn: async () => {
      const resp = await apiClient.get("/calls/library");
      return resp.data;
    },
  });

  const wins: CallRecord[] = data?.wins || [];
  const bestPitches: CallRecord[] = data?.pitches || [];
  const losses: CallRecord[] = data?.losses || [];
  const calls: CallRecord[] = data?.all || [];

  const currentList = activeTab === "wins" ? wins
    : activeTab === "pitches" ? bestPitches
    : activeTab === "losses" ? losses
    : calls;

  // Audio playback — use proxy endpoint to avoid RC auth issues
  const getProxyUrl = (call: CallRecord) => {
    // Extract recording ID from RC contentUri
    const url = call.recording_url || "";
    const match = url.match(/\/recording\/(\d+)\/content/);
    if (match) {
      return `${apiClient.defaults.baseURL}/ringcentral/recording/${match[1]}/content`;
    }
    return url;
  };

  const togglePlay = async (call: CallRecord) => {
    if (playingId === call.id) {
      audioRef?.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef) {
      audioRef.pause();
    }

    setPlayingId(call.id);

    try {
      // Fetch recording via proxy with auth
      const resp = await apiClient.get(`/ringcentral/calls/${call.id}/recording`);
      const secureUrl = `${apiClient.defaults.baseURL}${resp.data.secure_url}`;

      // Fetch audio blob with auth cookie
      const audioResp = await apiClient.get(resp.data.secure_url, { responseType: "blob" });
      const blobUrl = URL.createObjectURL(audioResp.data);

      const audio = new Audio(blobUrl);
      audio.onended = () => { setPlayingId(null); URL.revokeObjectURL(blobUrl); };
      audio.play().catch(() => setPlayingId(null));
      setAudioRef(audio);
    } catch {
      setPlayingId(null);
    }
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const formatPhone = (p: string) => {
    const d = p.replace(/\D/g, "").replace(/^1/, "");
    if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    return p;
  };

  const dispositionLabel = (d: string | null) => {
    const key = (d || "").toLowerCase();
    const map: Record<string, { label: string; color: string }> = {
      "call connected": { label: "Connected", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
      "accepted": { label: "Accepted", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
      "voicemail": { label: "Voicemail", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
      "no answer": { label: "No Answer", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
      "missed": { label: "Missed", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
      "busy": { label: "Busy", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
      "rejected": { label: "Rejected", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
      "hang up": { label: "Hang Up", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
      "unknown": { label: "Unknown", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
    };
    return map[key] || { label: d || "Unknown", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" };
  };

  const sentimentIcon = (s: string | null) => {
    if (s === "positive") return "text-emerald-500";
    if (s === "negative") return "text-red-500";
    return "text-gray-400";
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-primary" />
          Call Library
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Review real calls to learn pitches, closing techniques, and customer objections
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Headphones} label="Total Recordings" value={calls.length} color="text-blue-600" />
        <StatCard icon={Trophy} label="Closed Deals" value={wins.length} color="text-emerald-600" />
        <StatCard icon={Star} label="Top Quality" value={bestPitches.length} color="text-amber-600" />
        <StatCard icon={TrendingDown} label="Lost / No Sale" value={losses.length} color="text-red-600" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-hover rounded-lg p-1">
        {([
          { key: "wins" as const, label: "Closed Deals", icon: Trophy, count: wins.length },
          { key: "pitches" as const, label: "Best Pitches", icon: Star, count: bestPitches.length },
          { key: "losses" as const, label: "Lost / No Sale", icon: TrendingDown, count: losses.length },
          { key: "all" as const, label: "All Recordings", icon: Headphones, count: calls.length },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-bg-card text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="text-xs text-text-muted">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Tab description */}
      <div className="bg-bg-card border border-border rounded-lg p-4">
        {activeTab === "wins" && (
          <p className="text-sm text-text-secondary">
            <Trophy className="w-4 h-4 inline mr-1 text-emerald-500" />
            Calls that resulted in a booked appointment or accepted quote. Listen to these to learn what closing sounds like.
          </p>
        )}
        {activeTab === "pitches" && (
          <p className="text-sm text-text-secondary">
            <Star className="w-4 h-4 inline mr-1 text-amber-500" />
            Highest quality calls based on AI scoring. Great examples of professionalism, empathy, and clear communication.
          </p>
        )}
        {activeTab === "losses" && (
          <p className="text-sm text-text-secondary">
            <TrendingDown className="w-4 h-4 inline mr-1 text-red-500" />
            Calls where the customer declined or didn't convert. Listen to understand objections and how to handle them better.
          </p>
        )}
        {activeTab === "all" && (
          <p className="text-sm text-text-secondary">
            <Headphones className="w-4 h-4 inline mr-1 text-blue-500" />
            Every recorded call over 30 seconds, sorted by date. Browse the full history.
          </p>
        )}
      </div>

      {/* Call List */}
      {isLoading ? (
        <div className="text-center py-12 text-text-muted">Loading recordings...</div>
      ) : currentList.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          No recordings in this category yet. Calls are recorded automatically through the Web Phone.
        </div>
      ) : (
        <div className="space-y-3">
          {currentList.map((call) => {
            const disp = dispositionLabel(call.call_disposition);
            const isExpanded = expandedId === call.id;
            const isPlaying = playingId === call.id;

            return (
              <div
                key={call.id}
                className="bg-bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors"
              >
                {/* Main row */}
                <div className="flex items-center gap-4 p-4">
                  {/* Play button */}
                  <button
                    onClick={() => togglePlay(call)}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                      isPlaying
                        ? "bg-primary text-white"
                        : "bg-bg-hover text-text-secondary hover:bg-primary/10 hover:text-primary"
                    )}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  {/* Call info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {call.direction === "inbound" ? (
                        <PhoneIncoming className="w-3.5 h-3.5 text-blue-500" />
                      ) : (
                        <PhoneOutgoing className="w-3.5 h-3.5 text-emerald-500" />
                      )}
                      <span className="text-sm font-medium text-text-primary">
                        {call.customer_name || formatPhone(call.direction === "inbound" ? call.caller_number : call.called_number)}
                      </span>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", disp.color)}>
                        {disp.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {call.call_date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(call.duration_seconds)}
                      </span>
                      {call.quality_score && (
                        <span className="flex items-center gap-1">
                          <BarChart3 className="w-3 h-3" />
                          {Math.round(call.quality_score)}/100
                        </span>
                      )}
                      {call.sentiment && (
                        <span className={cn("flex items-center gap-1", sentimentIcon(call.sentiment))}>
                          <MessageSquare className="w-3 h-3" />
                          {call.sentiment}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expand button */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : call.id)}
                    className="p-2 rounded-md hover:bg-bg-hover text-text-secondary"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-border space-y-3">
                    {/* AI Summary */}
                    {call.ai_summary && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
                        <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase mb-1">AI Summary</p>
                        <p className="text-sm text-text-primary leading-relaxed">{call.ai_summary}</p>
                      </div>
                    )}

                    {/* Transcript */}
                    {call.transcription && (
                      <div className="bg-bg-body rounded-lg p-3">
                        <p className="text-[10px] font-semibold text-text-secondary uppercase mb-1">Transcript</p>
                        <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {call.transcription}
                        </p>
                      </div>
                    )}

                    {/* Notes */}
                    {call.notes && (
                      <div>
                        <p className="text-[10px] font-semibold text-text-secondary uppercase mb-1">Notes</p>
                        <p className="text-xs text-text-primary">{call.notes}</p>
                      </div>
                    )}

                    {/* Audio player */}
                    {call.recording_url && (
                      <AudioPlayer callId={call.id} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AudioPlayer({ callId }: { callId: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAudio = async () => {
    if (blobUrl) return;
    setLoading(true);
    try {
      const resp = await apiClient.get(`/ringcentral/calls/${callId}/recording`);
      const audioResp = await apiClient.get(resp.data.secure_url, { responseType: "blob" });
      setBlobUrl(URL.createObjectURL(audioResp.data));
    } catch {
      // silent fail
    }
    setLoading(false);
  };

  if (!blobUrl) {
    return (
      <button
        onClick={loadAudio}
        disabled={loading}
        className="text-xs text-primary hover:underline"
      >
        {loading ? "Loading audio..." : "Load recording"}
      </button>
    );
  }

  return <audio controls src={blobUrl} className="w-full h-8" />;
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: typeof Trophy;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("w-4 h-4", color)} />
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
    </div>
  );
}
