import { useState } from "react";
import { Voicemail, Settings } from "lucide-react";
import { useDanniaStore } from "../danniaStore";
import { isVoicemailDropReady, executeVoicemailDrop } from "../voicemailDrop";
import { showToast } from "@/components/ui/Toast";
import type { ContactCallStatus } from "../../types";

interface VoicemailDropButtonProps {
  isOnCall: boolean;
  transferFn: (extension: string) => Promise<void>;
  onDisposition: (status: ContactCallStatus) => void;
}

export function VoicemailDropButton({
  isOnCall,
  transferFn,
  onDisposition,
}: VoicemailDropButtonProps) {
  const vmConfig = useDanniaStore((s) => s.voicemailDropConfig);
  const updateVmConfig = useDanniaStore((s) => s.updateVoicemailDropConfig);
  const [showSetup, setShowSetup] = useState(false);
  const [extensionInput, setExtensionInput] = useState(vmConfig.vmExtension);
  const [dropping, setDropping] = useState(false);

  if (!isOnCall) return null;

  const isReady = isVoicemailDropReady(vmConfig);

  const handleDrop = async () => {
    if (!isReady || dropping) return;
    setDropping(true);

    const result = await executeVoicemailDrop(vmConfig, transferFn);

    if (result.success) {
      // Increment drop count
      updateVmConfig({ dropCount: vmConfig.dropCount + 1 });
      showToast({
        title: "VM Dropped",
        description: "Voicemail dropped \u2014 advancing to next contact",
        variant: "success",
        duration: 3000,
      });
      // Auto-disposition as voicemail and advance
      onDisposition("voicemail");
    } else {
      showToast({
        title: "VM Drop Failed",
        description: result.error ?? "Transfer failed",
        variant: "error",
        duration: 4000,
      });
    }

    setDropping(false);
  };

  const handleSaveSetup = () => {
    updateVmConfig({
      vmExtension: extensionInput.trim(),
      enabled: extensionInput.trim().length > 0,
    });
    setShowSetup(false);
    showToast({
      title: "VM Drop Configured",
      description: `Extension: ${extensionInput.trim()}`,
      variant: "success",
      duration: 3000,
    });
  };

  // Setup prompt when not configured
  if (!isReady && !showSetup) {
    return (
      <button
        onClick={() => setShowSetup(true)}
        className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
        title="Configure voicemail drop"
      >
        <Voicemail className="w-4 h-4" />
        <Settings className="w-3 h-3" />
        VM Drop
      </button>
    );
  }

  // Setup form
  if (showSetup) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          placeholder="VM ext #"
          value={extensionInput}
          onChange={(e) => setExtensionInput(e.target.value)}
          className="w-20 px-2 py-1.5 rounded-lg border border-border bg-bg-body text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={handleSaveSetup}
          disabled={!extensionInput.trim()}
          className="px-2 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-40"
        >
          Save
        </button>
        <button
          onClick={() => setShowSetup(false)}
          className="px-2 py-1.5 rounded-lg text-xs text-text-tertiary hover:bg-bg-hover"
        >
          Cancel
        </button>
      </div>
    );
  }

  // Active VM drop button
  return (
    <button
      onClick={handleDrop}
      disabled={dropping}
      className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
        dropping
          ? "bg-amber-200 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300"
          : "bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
      }`}
      title="Drop pre-recorded voicemail and advance"
    >
      <Voicemail className="w-4 h-4" />
      {dropping ? "Dropping..." : "VM Drop"}
    </button>
  );
}
