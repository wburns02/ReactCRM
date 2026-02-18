import { useState, useRef, useCallback, useEffect } from "react";
import {
  EQUIPMENT_ITEMS,
  INSPECTION_STEPS,
  getCompletionPercent,
  createDefaultInspectionState,
  createDefaultStepState,
  type InspectionState,
  type StepState,
  type FindingLevel,
  type InspectionStep,
} from "../inspectionSteps.ts";
import {
  useInspectionState,
  useStartInspection,
  useUpdateInspectionStep,
  useCompleteInspection,
  useNotifyArrival,
  useSaveInspectionState,
  useUploadJobPhoto,
} from "@/api/hooks/useTechPortal.ts";
import { toastSuccess, toastError, toastInfo } from "@/components/ui/Toast.tsx";

interface Props {
  jobId: string;
  customerPhone?: string;
  customerName?: string;
  onPhotoUploaded?: () => void;
}

// ─── Voice helpers ──────────────────────────────────────────────────────────

function speak(text: string) {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  }
}

// ─── Progress Ring SVG ──────────────────────────────────────────────────────

function ProgressRing({ percent, size = 80 }: { percent: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  const color = percent === 100 ? "#22c55e" : percent >= 50 ? "#eab308" : "#ef4444";
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={6} className="text-border opacity-30" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6} strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-500" />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" className="rotate-[90deg] origin-center fill-current text-text-primary" style={{ fontSize: size * 0.22 }} fontWeight="bold">
        {percent}%
      </text>
    </svg>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function InspectionChecklist({ jobId, customerPhone, customerName, onPhotoUploaded }: Props) {
  const { data: serverState, isLoading } = useInspectionState(jobId);
  const startMutation = useStartInspection();
  const updateStepMutation = useUpdateInspectionStep();
  const completeMutation = useCompleteInspection();
  const notifyMutation = useNotifyArrival();
  const saveMutation = useSaveInspectionState();
  const uploadPhotoMutation = useUploadJobPhoto();

  // Local state (mirrors server, syncs on changes)
  const [localState, setLocalState] = useState<InspectionState>(createDefaultInspectionState());
  const [currentStep, setCurrentStep] = useState(1);
  const [showStepList, setShowStepList] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Sync from server
  useEffect(() => {
    if (serverState) {
      setLocalState(serverState);
      if (serverState.currentStep) setCurrentStep(serverState.currentStep);
      if (serverState.completedAt) setShowSummary(true);
    }
  }, [serverState]);

  const steps = INSPECTION_STEPS;
  const totalSteps = steps.length;
  const percent = getCompletionPercent(localState);
  const currentStepDef = steps.find((s) => s.stepNumber === currentStep);
  const currentStepState: StepState =
    localState.steps[currentStep] || createDefaultStepState();
  const allEquipmentChecked = EQUIPMENT_ITEMS.every(
    (item) => localState.equipmentItems[item.id],
  );

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleStartInspection = async () => {
    await startMutation.mutateAsync({
      jobId,
      equipmentItems: localState.equipmentItems,
    });
    setLocalState((s) => ({
      ...s,
      startedAt: new Date().toISOString(),
      equipmentVerified: true,
    }));
    setCurrentStep(2);
    if (voiceEnabled) speak("Inspection started. Step 2: Contact Homeowner.");
  };

  const toggleEquipment = (itemId: string) => {
    setLocalState((s) => ({
      ...s,
      equipmentItems: {
        ...s.equipmentItems,
        [itemId]: !s.equipmentItems[itemId],
      },
    }));
  };

  const checkAllEquipment = () => {
    const all: Record<string, boolean> = {};
    for (const item of EQUIPMENT_ITEMS) all[item.id] = true;
    setLocalState((s) => ({ ...s, equipmentItems: all }));
  };

  const updateStepField = (field: keyof StepState, value: string | string[]) => {
    setLocalState((s) => ({
      ...s,
      steps: {
        ...s.steps,
        [currentStep]: {
          ...(s.steps[currentStep] || createDefaultStepState()),
          [field]: value,
        },
      },
    }));
  };

  const handleCompleteStep = async () => {
    const update = {
      ...(localState.steps[currentStep] || createDefaultStepState()),
      status: "completed" as const,
      completedAt: new Date().toISOString(),
    };
    setLocalState((s) => ({
      ...s,
      steps: { ...s.steps, [currentStep]: update },
    }));

    // Save to server
    await updateStepMutation.mutateAsync({
      jobId,
      stepNumber: currentStep,
      update: {
        status: "completed",
        notes: update.notes,
        voice_notes: update.voiceNotes,
        findings: update.findings,
        finding_details: update.findingDetails,
        photos: update.photos,
      },
    });

    // Advance
    if (currentStep < totalSteps) {
      const next = currentStep + 1;
      setCurrentStep(next);
      const nextDef = steps.find((s) => s.stepNumber === next);
      if (voiceEnabled && nextDef) {
        speak(`Step ${next}: ${nextDef.title}. ${nextDef.description}`);
      }
    } else {
      setShowSummary(true);
    }
  };

  const handleNotifyHomeowner = async () => {
    await notifyMutation.mutateAsync({ jobId, customerPhone });
    setLocalState((s) => ({
      ...s,
      homeownerNotifiedAt: new Date().toISOString(),
    }));
  };

  const handlePhotoCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const photoType = currentStepDef?.photoType || `inspection_step_${currentStep}`;
        await uploadPhotoMutation.mutateAsync({
          jobId,
          photo: base64,
          photoType,
        });
        // Track photo in step state
        const existing = localState.steps[currentStep]?.photos || [];
        updateStepField("photos", [...existing, photoType]);
        onPhotoUploaded?.();
        toastSuccess("Photo captured!");
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toastError("Failed to upload photo");
      setUploadingPhoto(false);
    }
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  // Voice input (Web Speech API)
  const startVoiceInput = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toastInfo("Voice input not supported in this browser");
      return;
    }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("");
      updateStepField("voiceNotes", transcript);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => {
      setIsRecording(false);
      toastError("Voice input error");
    };
    recognition.start();
    setIsRecording(true);
  }, [currentStep]);

  const stopVoiceInput = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const handleCompleteInspection = async () => {
    const techNotes = Object.values(localState.steps)
      .filter((s) => s.notes)
      .map((s) => s.notes)
      .join("\n");
    await completeMutation.mutateAsync({ jobId, techNotes });
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
    setShowStepList(false);
    setShowSummary(false);
  };

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // ─── Not Started State ────────────────────────────────────────────────────

  if (!localState.startedAt) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-2">🔍</div>
          <h3 className="text-xl font-bold text-text-primary">
            Aerobic System Inspection
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            {totalSteps} steps &bull; ~{steps.reduce((s, x) => s + x.estimatedMinutes, 0)} min estimated
          </p>
        </div>

        {/* Voice guidance toggle */}
        <label className="flex items-center gap-3 p-3 bg-bg-hover rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={voiceEnabled}
            onChange={(e) => setVoiceEnabled(e.target.checked)}
            className="w-5 h-5 rounded accent-primary"
          />
          <div>
            <p className="font-medium text-text-primary text-sm">🔊 Voice Guidance</p>
            <p className="text-xs text-text-secondary">Read each step aloud</p>
          </div>
        </label>

        {/* Equipment Checklist */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="bg-bg-hover p-3 flex items-center justify-between">
            <h4 className="font-semibold text-text-primary">🧰 Equipment Check</h4>
            <button
              onClick={checkAllEquipment}
              className="text-xs text-primary font-medium"
            >
              Check All
            </button>
          </div>
          <div className="p-3 grid grid-cols-2 gap-2">
            {EQUIPMENT_ITEMS.map((item) => (
              <label
                key={item.id}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                  localState.equipmentItems[item.id]
                    ? "bg-success/10 border border-success/30"
                    : "bg-bg-body border border-border"
                }`}
              >
                <input
                  type="checkbox"
                  checked={localState.equipmentItems[item.id] || false}
                  onChange={() => toggleEquipment(item.id)}
                  className="w-4 h-4 rounded accent-success"
                />
                <span className="text-sm">{item.emoji}</span>
                <span className="text-xs text-text-primary truncate">{item.label}</span>
              </label>
            ))}
          </div>
          <div className="px-3 pb-3">
            <div className="text-xs text-text-secondary text-center">
              {EQUIPMENT_ITEMS.filter((i) => localState.equipmentItems[i.id]).length}/{EQUIPMENT_ITEMS.length} verified
            </div>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartInspection}
          disabled={!allEquipmentChecked || startMutation.isPending}
          className="w-full py-4 rounded-xl text-lg font-bold text-white bg-primary disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
        >
          {startMutation.isPending ? "Starting..." : allEquipmentChecked ? "▶️ Start Inspection" : "✅ Check All Equipment First"}
        </button>
      </div>
    );
  }

  // ─── Summary View ─────────────────────────────────────────────────────────

  if (showSummary && localState.summary) {
    const s = localState.summary;
    const conditionColors = {
      good: "text-success bg-success/10 border-success/30",
      fair: "text-yellow-600 bg-yellow-50 border-yellow-300",
      poor: "text-orange-600 bg-orange-50 border-orange-300",
      critical: "text-red-600 bg-red-50 border-red-300",
    };
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <h3 className="text-xl font-bold text-text-primary">Inspection Summary</h3>
        </div>

        {/* Overall Condition */}
        <div className={`p-4 rounded-lg border ${conditionColors[s.overallCondition]}`}>
          <div className="text-center">
            <p className="text-lg font-bold capitalize">{s.overallCondition} Condition</p>
            <p className="text-sm mt-1">
              {s.totalIssues} issue{s.totalIssues !== 1 ? "s" : ""} found
              {s.criticalIssues > 0 && ` (${s.criticalIssues} critical)`}
            </p>
          </div>
        </div>

        {/* Recommendations */}
        {s.recommendations.length > 0 && (
          <div className="border border-border rounded-lg p-4">
            <h4 className="font-semibold text-text-primary mb-2">📋 Findings</h4>
            <ul className="space-y-2">
              {s.recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-text-secondary flex gap-2">
                  <span className={rec.startsWith("URGENT") ? "text-red-500" : "text-yellow-500"}>
                    {rec.startsWith("URGENT") ? "🔴" : "🟡"}
                  </span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Upsell */}
        {s.upsellOpportunities.length > 0 && (
          <div className="border border-primary/20 bg-primary/5 rounded-lg p-4">
            <h4 className="font-semibold text-text-primary mb-2">💡 Recommended Services</h4>
            <ul className="space-y-1">
              {s.upsellOpportunities.map((opp, i) => (
                <li key={i} className="text-sm text-text-secondary">• {opp}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Step Review */}
        <div className="border border-border rounded-lg p-4">
          <h4 className="font-semibold text-text-primary mb-2">Steps Completed</h4>
          <div className="space-y-1">
            {steps.map((step) => {
              const ss = localState.steps[step.stepNumber];
              const icon = ss?.status === "completed" ? "✅" : ss?.status === "skipped" ? "⏭️" : "⬜";
              const findingIcon = ss?.findings === "critical" ? "🔴" : ss?.findings === "needs_attention" ? "🟡" : "";
              return (
                <div key={step.stepNumber} className="flex items-center gap-2 text-sm">
                  <span>{icon}</span>
                  <span className="text-text-primary flex-1">{step.title}</span>
                  {findingIcon && <span>{findingIcon}</span>}
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => { setShowSummary(false); setCurrentStep(1); }}
          className="w-full py-3 rounded-lg text-sm font-medium border border-border text-text-secondary"
        >
          ← Review Steps
        </button>
      </div>
    );
  }

  // ─── Summary Not Generated Yet (all steps done) ──────────────────────────

  if (showSummary && !localState.summary) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-4xl">🎉</div>
        <h3 className="text-xl font-bold text-text-primary">All Steps Complete!</h3>
        <p className="text-text-secondary">Generate the inspection summary report.</p>
        <button
          onClick={handleCompleteInspection}
          disabled={completeMutation.isPending}
          className="w-full py-4 rounded-xl text-lg font-bold text-white bg-success disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {completeMutation.isPending ? "Generating..." : "📊 Generate Summary Report"}
        </button>
        <button
          onClick={() => { setShowSummary(false); setCurrentStep(totalSteps); }}
          className="w-full py-3 rounded-lg text-sm font-medium border border-border text-text-secondary"
        >
          ← Back to Steps
        </button>
      </div>
    );
  }

  // ─── Active Inspection Step View ──────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Hidden file input for photos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ProgressRing percent={percent} size={56} />
          <div>
            <p className="text-sm font-semibold text-text-primary">
              Step {currentStep}/{totalSteps}
            </p>
            <p className="text-xs text-text-secondary">
              {steps.filter((s) => localState.steps[s.stepNumber]?.status === "completed").length} completed
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2 rounded-lg text-sm ${voiceEnabled ? "bg-primary/10 text-primary" : "bg-bg-hover text-text-muted"}`}
            title="Toggle voice guidance"
          >
            {voiceEnabled ? "🔊" : "🔇"}
          </button>
          <button
            onClick={() => setShowStepList(!showStepList)}
            className="p-2 rounded-lg bg-bg-hover text-text-secondary text-sm"
          >
            📋
          </button>
        </div>
      </div>

      {/* Step List Drawer */}
      {showStepList && (
        <div className="border border-border rounded-lg p-3 bg-bg-body max-h-64 overflow-y-auto">
          {steps.map((step) => {
            const ss = localState.steps[step.stepNumber];
            const isActive = step.stepNumber === currentStep;
            const isDone = ss?.status === "completed";
            return (
              <button
                key={step.stepNumber}
                onClick={() => goToStep(step.stepNumber)}
                className={`w-full flex items-center gap-2 p-2 rounded text-left text-sm transition-colors ${
                  isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-bg-hover"
                }`}
              >
                <span className="w-5 text-center">
                  {isDone ? "✅" : isActive ? "▶️" : "⬜"}
                </span>
                <span className="flex-1 truncate">{step.emoji} {step.title}</span>
                {ss?.findings === "critical" && <span>🔴</span>}
                {ss?.findings === "needs_attention" && <span>🟡</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Current Step Card */}
      {currentStepDef && (
        <div className="border border-border rounded-xl overflow-hidden">
          {/* Step Header */}
          <div className="bg-bg-hover p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{currentStepDef.emoji}</span>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-text-primary">
                  {currentStepDef.title}
                </h3>
                <p className="text-sm text-text-secondary">
                  {currentStepDef.description}
                </p>
              </div>
              {currentStepState.status === "completed" && (
                <span className="text-2xl">✅</span>
              )}
            </div>
          </div>

          {/* Safety Warning */}
          {currentStepDef.safetyWarning && (
            <div className="mx-4 mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm font-bold text-red-700 dark:text-red-400">
                ⚠️ {currentStepDef.safetyWarning}
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="p-4 space-y-3">
            <div className="space-y-1">
              {currentStepDef.detailedInstructions.map((inst, i) => (
                <p key={i} className="text-sm text-text-secondary flex gap-2">
                  <span className="text-text-muted">{i + 1}.</span>
                  {inst}
                </p>
              ))}
            </div>

            {/* Step 2: Homeowner Notification */}
            {currentStep === 2 && (
              <div className="space-y-2">
                <button
                  onClick={handleNotifyHomeowner}
                  disabled={!!localState.homeownerNotifiedAt || notifyMutation.isPending}
                  className="w-full py-3 rounded-lg text-sm font-bold text-white bg-blue-600 disabled:opacity-50 active:scale-[0.98] transition-transform"
                >
                  {notifyMutation.isPending
                    ? "Sending..."
                    : localState.homeownerNotifiedAt
                      ? "✅ Homeowner Notified"
                      : `📱 Send Arrival Text${customerName ? ` to ${customerName}` : ""}`}
                </button>
                {localState.homeownerNotifiedAt && (
                  <p className="text-xs text-success text-center">
                    Sent at {new Date(localState.homeownerNotifiedAt).toLocaleTimeString()}
                  </p>
                )}
              </div>
            )}

            {/* Talking Points (customer-facing steps) */}
            {currentStepDef.talkingPoints && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
                  💬 Talking Points
                </p>
                {currentStepDef.talkingPoints.map((point, i) => (
                  <p key={i} className="text-xs text-blue-600 dark:text-blue-300 italic mt-1">
                    "{point}"
                  </p>
                ))}
              </div>
            )}

            {/* Avoid Phrases */}
            {currentStepDef.avoidPhrases && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">
                  🚫 Avoid Saying
                </p>
                {currentStepDef.avoidPhrases.map((phrase, i) => (
                  <p key={i} className="text-xs text-red-600 dark:text-red-300 line-through mt-1">
                    "{phrase}"
                  </p>
                ))}
              </div>
            )}

            {/* Photo Capture */}
            {currentStepDef.requiresPhoto && (
              <div>
                <button
                  onClick={handlePhotoCapture}
                  disabled={uploadingPhoto}
                  className="w-full py-3 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 text-primary font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  {uploadingPhoto ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <span className="text-lg">📸</span>
                  )}
                  {uploadingPhoto ? "Uploading..." : "Take Photo"}
                </button>
                {currentStepDef.photoGuidance && (
                  <p className="text-xs text-text-muted mt-1 text-center">
                    {currentStepDef.photoGuidance}
                  </p>
                )}
                {(currentStepState.photos?.length || 0) > 0 && (
                  <p className="text-xs text-success mt-1 text-center">
                    ✅ {currentStepState.photos.length} photo{currentStepState.photos.length > 1 ? "s" : ""} captured
                  </p>
                )}
              </div>
            )}

            {/* Findings */}
            <div>
              <p className="text-xs font-semibold text-text-primary mb-2">Findings</p>
              <div className="flex gap-2">
                {([
                  { value: "ok", label: "OK", emoji: "✅", color: "bg-success/10 border-success/30 text-success" },
                  { value: "needs_attention", label: "Attention", emoji: "🟡", color: "bg-yellow-50 border-yellow-300 text-yellow-700" },
                  { value: "critical", label: "Critical", emoji: "🔴", color: "bg-red-50 border-red-300 text-red-700" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateStepField("findings", opt.value)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      currentStepState.findings === opt.value
                        ? opt.color
                        : "bg-bg-body border-border text-text-muted"
                    }`}
                  >
                    {opt.emoji} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Finding Details (when not OK) */}
            {currentStepState.findings !== "ok" && (
              <textarea
                value={currentStepState.findingDetails || ""}
                onChange={(e) => updateStepField("findingDetails", e.target.value)}
                placeholder="Describe the issue..."
                className="w-full p-3 rounded-lg border border-border bg-bg-body text-sm text-text-primary resize-none"
                rows={2}
              />
            )}

            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-text-primary">Notes</p>
                <button
                  onClick={isRecording ? stopVoiceInput : startVoiceInput}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    isRecording
                      ? "bg-red-100 text-red-700 animate-pulse"
                      : "bg-bg-hover text-text-secondary"
                  }`}
                >
                  {isRecording ? "🔴 Stop" : "🎙️ Voice"}
                </button>
              </div>
              <textarea
                value={currentStepState.notes || ""}
                onChange={(e) => updateStepField("notes", e.target.value)}
                placeholder="Add notes for this step..."
                className="w-full p-3 rounded-lg border border-border bg-bg-body text-sm text-text-primary resize-none"
                rows={2}
              />
              {currentStepState.voiceNotes && (
                <p className="text-xs text-text-muted mt-1 italic">
                  🎙️ {currentStepState.voiceNotes}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={() => currentStep > 1 && setCurrentStep(currentStep - 1)}
          disabled={currentStep <= 1}
          className="flex-1 py-3 rounded-lg border border-border text-text-secondary font-medium text-sm disabled:opacity-30"
        >
          ← Previous
        </button>
        {currentStep < totalSteps ? (
          <button
            onClick={handleCompleteStep}
            disabled={updateStepMutation.isPending || (currentStepDef?.requiresPhoto && (currentStepState.photos?.length || 0) === 0)}
            className="flex-1 py-3 rounded-lg bg-primary text-white font-bold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {updateStepMutation.isPending ? "Saving..." : "Complete & Next →"}
          </button>
        ) : (
          <button
            onClick={() => {
              handleCompleteStep();
              setShowSummary(true);
            }}
            disabled={updateStepMutation.isPending}
            className="flex-1 py-3 rounded-lg bg-success text-white font-bold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {updateStepMutation.isPending ? "Saving..." : "✅ Finish Inspection"}
          </button>
        )}
      </div>
    </div>
  );
}
