import { useState, useRef, useEffect } from "react";
import {
  useRCStatus,
  useCallLog,
  useInitiateCall,
  useSyncCalls,
  useMyExtension,
  useTwilioStatus,
  useTwilioCall,
} from "./api.ts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { formatDate } from "@/lib/utils.ts";
import { DialerModal } from "./components/DialerModal.tsx";
import { CallDispositionModal } from "./components/CallDispositionModal.tsx";
import {
  PhoneSettings,
  usePhoneProvider,
} from "./components/PhoneSettings.tsx";
import type { CallRecord } from "./types.ts";

/**
 * Phone Dashboard - World-class phone system
 * Features: Call stats, dialer, call log, recordings, AI transcriptions
 */
export function PhonePage() {
  const phoneProvider = usePhoneProvider();
  const { data: rcStatus, isLoading: rcStatusLoading } = useRCStatus();
  const { data: twilioStatus, isLoading: twilioStatusLoading } =
    useTwilioStatus();
  const { data: callsData, isLoading: callsLoading } = useCallLog({
    page_size: 50,
  });
  const { data: myExtension } = useMyExtension();
  const rcCallMutation = useInitiateCall();
  const twilioCallMutation = useTwilioCall();
  const syncMutation = useSyncCalls();

  // Get status based on selected provider
  const status = phoneProvider === "ringcentral" ? rcStatus : twilioStatus;
  const statusLoading =
    phoneProvider === "ringcentral" ? rcStatusLoading : twilioStatusLoading;

  // Get calls array from paginated response
  const calls = callsData?.items || [];

  const [dialerOpen, setDialerOpen] = useState(false);
  const [quickDialNumber, setQuickDialNumber] = useState("");
  const [activeTab, setActiveTab] = useState<
    "all" | "inbound" | "outbound" | "missed"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [dispositionModalOpen, setDispositionModalOpen] = useState(false);
  const [playingRecording, setPlayingRecording] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Calculate call statistics
  const stats =
    calls.length > 0
      ? {
          totalCalls: calls.length,
          inboundCalls: calls.filter((c) => c.direction === "inbound").length,
          outboundCalls: calls.filter((c) => c.direction === "outbound").length,
          totalDuration: calls.reduce(
            (sum, c) => sum + (c.duration_seconds || 0),
            0,
          ),
          avgDuration:
            calls.length > 0
              ? Math.round(
                  calls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) /
                    calls.length,
                )
              : 0,
          withRecordings: calls.filter((c) => c.recording_url).length,
          todayCalls: calls.filter((c) => {
            if (!c.start_time) return false;
            const callDate = new Date(c.start_time).toDateString();
            const today = new Date().toDateString();
            return callDate === today;
          }).length,
        }
      : null;

  // Filter calls based on tab and search
  const filteredCalls =
    calls?.filter((call) => {
      // Tab filter
      if (activeTab === "inbound" && call.direction !== "inbound") return false;
      if (activeTab === "outbound" && call.direction !== "outbound")
        return false;
      if (activeTab === "missed" && (call.duration_seconds || 0) > 0)
        return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          call.from_number.includes(query) ||
          call.to_number.includes(query) ||
          call.disposition?.toLowerCase().includes(query)
        );
      }
      return true;
    }) || [];

  // Use the current user's own extension (not first in list)
  const defaultFromNumber = myExtension?.extension_number || "";

  // Sync calls from RingCentral
  const handleSyncCalls = async () => {
    try {
      await syncMutation.mutateAsync(24);
    } catch (error) {
      console.error("Failed to sync calls:", error);
    }
  };

  // Quick dial handler - uses selected provider
  const handleQuickDial = async () => {
    if (!quickDialNumber.trim()) return;
    try {
      if (phoneProvider === "ringcentral") {
        await rcCallMutation.mutateAsync({
          to_number: quickDialNumber,
          from_number: defaultFromNumber || undefined,
        });
      } else {
        await twilioCallMutation.mutateAsync({
          to_number: quickDialNumber,
          record: true,
        });
      }
      setQuickDialNumber("");
    } catch (error) {
      console.error("Failed to initiate call:", error);
    }
  };

  const isCallPending =
    rcCallMutation.isPending || twilioCallMutation.isPending;

  // Format duration
  const formatDuration = (seconds: number | null | undefined): string => {
    if (!seconds || seconds === 0) return "Missed";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  // Format total duration for stats
  const formatTotalDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  // Format phone number
  const formatPhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11 && digits[0] === "1") {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return phone;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Phone System</h1>
          <p className="text-text-secondary">
            Manage calls, recordings, and communications
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Settings Button */}
          <Button
            variant="secondary"
            onClick={() => setShowSettings(!showSettings)}
            className="gap-2"
          >
            {showSettings ? "Hide Settings" : "Settings"}
          </Button>
          {/* Sync Button */}
          <Button
            variant="secondary"
            onClick={handleSyncCalls}
            disabled={syncMutation.isPending}
            className="gap-2"
          >
            {syncMutation.isPending ? "Syncing..." : "Sync Calls"}
          </Button>
          {/* Connection Status with Provider Badge */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              status?.connected
                ? "bg-success/10 border border-success/30"
                : "bg-danger/10 border border-danger/30"
            }`}
          >
            <Badge variant="default" className="text-xs">
              {phoneProvider === "ringcentral" ? "RC" : "Twilio"}
            </Badge>
            <div
              className={`w-3 h-3 rounded-full ${
                status?.connected ? "bg-success animate-pulse" : "bg-danger"
              }`}
            />
            <span
              className={`font-medium ${
                status?.connected ? "text-success" : "text-danger"
              }`}
            >
              {statusLoading
                ? "Checking..."
                : status?.connected
                  ? "Connected"
                  : "Disconnected"}
            </span>
          </div>
          <Button onClick={() => setDialerOpen(true)} className="gap-2">
            <span className="text-lg">📞</span>
            Open Dialer
          </Button>
        </div>
      </div>

      {/* Settings Panel (Collapsible) */}
      {showSettings && <PhoneSettings />}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-blue-600">
              {stats?.todayCalls || 0}
            </div>
            <div className="text-sm text-text-secondary">Today's Calls</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-green-600">
              {stats?.inboundCalls || 0}
            </div>
            <div className="text-sm text-text-secondary">Inbound</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-orange-600">
              {stats?.outboundCalls || 0}
            </div>
            <div className="text-sm text-text-secondary">Outbound</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-purple-600">
              {formatTotalDuration(stats?.totalDuration || 0)}
            </div>
            <div className="text-sm text-text-secondary">Total Duration</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-cyan-600">
              {formatDuration(stats?.avgDuration || 0)}
            </div>
            <div className="text-sm text-text-secondary">Avg Duration</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-pink-500/20">
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-pink-600">
              {stats?.withRecordings || 0}
            </div>
            <div className="text-sm text-text-secondary">Recordings</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-500/20">
          <CardContent className="p-4">
            <div className="text-3xl font-bold text-indigo-600">
              {stats?.totalCalls || 0}
            </div>
            <div className="text-sm text-text-secondary">Total Calls</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Dial & Dialer */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🔢</span> Quick Dial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quick Dial Input */}
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="Enter phone number..."
                value={quickDialNumber}
                onChange={(e) => setQuickDialNumber(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleQuickDial()}
                className="font-mono"
              />
              <Button
                onClick={handleQuickDial}
                disabled={!quickDialNumber.trim() || isCallPending}
                className="px-4"
              >
                {isCallPending ? "..." : "📞"}
              </Button>
            </div>

            {/* Mini Dialer Pad */}
            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map(
                (digit) => (
                  <button
                    key={digit}
                    onClick={() => setQuickDialNumber((prev) => prev + digit)}
                    className="h-12 rounded-lg bg-bg-hover hover:bg-bg-muted text-text-primary text-lg font-semibold transition-all hover:scale-105 active:scale-95"
                  >
                    {digit}
                  </button>
                ),
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setQuickDialNumber((prev) => prev.slice(0, -1))}
                className="flex-1"
                disabled={!quickDialNumber}
              >
                ⌫ Delete
              </Button>
              <Button
                variant="secondary"
                onClick={() => setQuickDialNumber("")}
                className="flex-1"
                disabled={!quickDialNumber}
              >
                ✕ Clear
              </Button>
            </div>

            {/* Recent Numbers */}
            <div className="pt-4 border-t border-border">
              <h4 className="text-sm font-medium text-text-secondary mb-2">
                Recent Numbers
              </h4>
              <div className="space-y-2">
                {calls?.slice(0, 5).map((call, idx) => {
                  const number =
                    call.direction === "inbound"
                      ? call.from_number
                      : call.to_number;
                  return (
                    <button
                      key={idx}
                      onClick={() => setQuickDialNumber(number)}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-bg-hover transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            call.direction === "inbound"
                              ? "text-green-500"
                              : "text-orange-500"
                          }
                        >
                          {call.direction === "inbound" ? "↙️" : "↗️"}
                        </span>
                        <span className="font-mono text-sm">
                          {formatPhone(number)}
                        </span>
                      </div>
                      <span className="text-xs text-text-muted">
                        {formatDuration(call.duration_seconds)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call Log */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span>📋</span> Call History
              </CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  type="search"
                  placeholder="Search calls..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48"
                />
              </div>
            </div>
            {/* Tabs */}
            <div className="flex gap-1 mt-4 bg-bg-hover p-1 rounded-lg">
              {[
                { id: "all", label: "All Calls", icon: "📞" },
                { id: "inbound", label: "Inbound", icon: "↙️" },
                { id: "outbound", label: "Outbound", icon: "↗️" },
                { id: "missed", label: "Missed", icon: "📵" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-bg-card text-text-primary shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {callsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-20 bg-bg-muted rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : filteredCalls.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📞</div>
                <p className="text-text-muted">No calls found</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {filteredCalls.map((call) => (
                  <CallLogItem
                    key={call.id}
                    call={call}
                    formatPhone={formatPhone}
                    formatDuration={formatDuration}
                    onAddDisposition={() => {
                      setSelectedCall(call);
                      setDispositionModalOpen(true);
                    }}
                    isPlaying={playingRecording === call.id}
                    onPlayRecording={() =>
                      setPlayingRecording(
                        playingRecording === call.id ? null : call.id,
                      )
                    }
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <DialerModal open={dialerOpen} onClose={() => setDialerOpen(false)} />

      {selectedCall && (
        <CallDispositionModal
          open={dispositionModalOpen}
          onClose={() => {
            setDispositionModalOpen(false);
            setSelectedCall(null);
          }}
          callId={selectedCall.id}
          phoneNumber={
            selectedCall.direction === "inbound"
              ? selectedCall.from_number
              : selectedCall.to_number
          }
        />
      )}
    </div>
  );
}

/**
 * Individual call log item with recording player
 */
function CallLogItem({
  call,
  formatPhone,
  formatDuration,
  onAddDisposition,
  isPlaying,
  onPlayRecording,
}: {
  call: CallRecord;
  formatPhone: (phone: string) => string;
  formatDuration: (seconds: number | null | undefined) => string;
  onAddDisposition: () => void;
  isPlaying: boolean;
  onPlayRecording: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setAudioProgress(
        (audioRef.current.currentTime / audioRef.current.duration) * 100,
      );
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const isMissed = !call.duration_seconds || call.duration_seconds === 0;
  const isInbound = call.direction === "inbound";

  return (
    <div
      className={`p-4 rounded-xl border transition-all hover:shadow-md ${
        isMissed
          ? "bg-danger/5 border-danger/20"
          : "bg-bg-card border-border hover:border-primary/30"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Direction Icon */}
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
            isMissed
              ? "bg-danger/10"
              : isInbound
                ? "bg-green-500/10"
                : "bg-orange-500/10"
          }`}
        >
          {isMissed ? "📵" : isInbound ? "↙️" : "↗️"}
        </div>

        {/* Call Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-text-primary font-mono">
              {formatPhone(isInbound ? call.from_number : call.to_number)}
            </span>
            <Badge
              variant={isMissed ? "danger" : isInbound ? "success" : "warning"}
            >
              {isMissed ? "Missed" : isInbound ? "Inbound" : "Outbound"}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-text-secondary">
            <span>⏱️ {formatDuration(call.duration_seconds)}</span>
            <span>📅 {formatDate(call.start_time)}</span>
          </div>

          {/* Recording Player */}
          {call.recording_url && (
            <div className="mt-3 p-3 bg-bg-hover rounded-lg">
              <div className="flex items-center gap-3">
                <button
                  onClick={onPlayRecording}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isPlaying
                      ? "bg-primary text-white"
                      : "bg-bg-muted hover:bg-primary/20 text-text-primary"
                  }`}
                >
                  {isPlaying ? "⏸️" : "▶️"}
                </button>
                <div className="flex-1">
                  <div className="h-2 bg-bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-100"
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-text-muted">
                    <span>
                      {Math.floor((audioProgress * audioDuration) / 100 / 60)}:
                      {String(
                        Math.floor((audioProgress * audioDuration) / 100) % 60,
                      ).padStart(2, "0")}
                    </span>
                    <span>
                      {Math.floor(audioDuration / 60)}:
                      {String(Math.floor(audioDuration) % 60).padStart(2, "0")}
                    </span>
                  </div>
                </div>
                <Badge variant="default" className="text-xs">
                  🎙️ Recording
                </Badge>
              </div>
              <audio
                ref={audioRef}
                src={call.recording_url}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={onPlayRecording}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-2">
          {call.disposition ? (
            <Badge variant="success" className="text-xs">
              ✓ {call.disposition}
            </Badge>
          ) : (
            <button
              onClick={onAddDisposition}
              className="text-xs text-primary hover:underline font-medium"
            >
              + Add Disposition
            </button>
          )}
          <button className="text-xs text-text-link hover:underline">
            📞 Call Back
          </button>
        </div>
      </div>
    </div>
  );
}
