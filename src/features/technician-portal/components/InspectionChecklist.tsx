import { useState, useRef, useCallback, useEffect } from "react";
import {
  EQUIPMENT_ITEMS,
  INSPECTION_STEPS,
  getCompletionPercent,
  createDefaultInspectionState,
  createDefaultStepState,
  calculateEstimate,
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
  useSaveInspectionState,
  useUploadJobPhoto,
  useCreateEstimateFromInspection,
} from "@/api/hooks/useTechPortal.ts";
import { EstimateSignature } from "./EstimateSignature.tsx";
import { toastSuccess, toastError, toastInfo } from "@/components/ui/Toast.tsx";

interface Props {
  jobId: string;
  customerPhone?: string;
  customerName?: string;
  customerEmail?: string;
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

// ─── PDF Colors ──────────────────────────────────────────────────────────────

const PDF_COLORS = {
  green: { r: 34, g: 197, b: 94 },   // #22c55e
  yellow: { r: 245, g: 158, b: 11 },  // #f59e0b
  red: { r: 239, g: 68, b: 68 },      // #ef4444
  blue: { r: 30, g: 64, b: 175 },     // #1e40af
  lightGreen: { r: 220, g: 252, b: 231 },
  lightYellow: { r: 254, g: 249, b: 195 },
  lightRed: { r: 254, g: 226, b: 226 },
  gray: { r: 107, g: 114, b: 128 },
  lightGray: { r: 243, g: 244, b: 246 },
  white: { r: 255, g: 255, b: 255 },
  black: { r: 30, g: 30, b: 30 },
};

function findingColor(f: string) {
  if (f === "ok") return PDF_COLORS.green;
  if (f === "needs_attention") return PDF_COLORS.yellow;
  if (f === "critical") return PDF_COLORS.red;
  return PDF_COLORS.gray;
}

function findingBg(f: string) {
  if (f === "ok") return PDF_COLORS.lightGreen;
  if (f === "needs_attention") return PDF_COLORS.lightYellow;
  if (f === "critical") return PDF_COLORS.lightRed;
  return PDF_COLORS.lightGray;
}

function findingLabel(f: string) {
  if (f === "ok") return "All Good!";
  if (f === "needs_attention") return "Needs Attention";
  if (f === "critical") return "Needs Fixing Now";
  return "Not Checked";
}

// Simple language mappings for step titles
const SIMPLE_DESCRIPTIONS: Record<number, string> = {
  1: "We checked that all our tools and safety equipment are ready.",
  2: "We let the homeowner know we arrived.",
  3: "We confirmed we are at the right address.",
  4: "We knocked on the door and introduced ourselves.",
  5: "We explained what the inspection covers.",
  6: "We found where the septic tank and control panel are located.",
  7: "We carefully opened the tank lids to look inside.",
  8: "We tested the switches that turn the pump on and off.",
  9: "We checked the control panel for any warning lights or damage.",
  10: "We tested the timer that controls when the pump runs.",
  11: "We checked that the alarm light bulb and buzzer work.",
  12: "We looked for rust, damage, and made sure everything is sealed properly.",
  13: "We turned the power back on to the system.",
  14: "We checked the valve and the spray or drip system that spreads treated water.",
  15: "We put all the lids back on securely and cleaned up.",
  16: "We discussed everything we found with you.",
};

// ─── PDF Report Generation (client-side) ────────────────────────────────────

async function generateReportPDF(
  state: InspectionState,
  customerName: string,
  jobId: string,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const steps = INSPECTION_STEPS;
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 0;

  function setC(c: { r: number; g: number; b: number }) {
    doc.setTextColor(c.r, c.g, c.b);
  }
  function setF(c: { r: number; g: number; b: number }) {
    doc.setFillColor(c.r, c.g, c.b);
  }
  function setD(c: { r: number; g: number; b: number }) {
    doc.setDrawColor(c.r, c.g, c.b);
  }
  function newPageIfNeeded(need: number) {
    if (y + need > 275) { doc.addPage(); y = 15; }
  }

  // ═══ HEADER BAR ═══
  setF(PDF_COLORS.blue);
  doc.rect(0, 0, pageW, 35, "F");
  setC(PDF_COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("MAC Septic Services", pageW / 2, 14, { align: "center" });
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text("Septic System Inspection Report", pageW / 2, 24, { align: "center" });
  doc.setFontSize(9);
  doc.text(`${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, pageW / 2, 31, { align: "center" });
  y = 42;

  // ═══ CUSTOMER INFO ═══
  setC(PDF_COLORS.black);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Prepared for: ${customerName}`, margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setC(PDF_COLORS.gray);
  doc.text(`Reference: WO-${jobId.slice(0, 8).toUpperCase()}`, pageW - margin, y, { align: "right" });
  y += 10;

  // ═══ QUICK SUMMARY BOX ═══
  const condition = state.summary?.overallCondition || "unknown";
  const issues = state.summary?.totalIssues || 0;
  const bannerColor = condition === "good" ? PDF_COLORS.green : condition === "fair" ? PDF_COLORS.yellow : PDF_COLORS.red;
  const bannerBg = condition === "good" ? PDF_COLORS.lightGreen : condition === "fair" ? PDF_COLORS.lightYellow : PDF_COLORS.lightRed;
  const bannerText = condition === "good"
    ? "Your septic system is working great!"
    : condition === "fair"
    ? "Your system needs some attention — see details below."
    : "Your system needs repairs — please review the items below.";

  setF(bannerBg);
  setD(bannerColor);
  doc.setLineWidth(1);
  doc.roundedRect(margin, y, contentW, 22, 3, 3, "FD");
  setC(bannerColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(bannerText, pageW / 2, y + 10, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const issueText = issues === 0 ? "No issues found" : `${issues} item${issues > 1 ? "s" : ""} noted during inspection`;
  doc.text(issueText, pageW / 2, y + 18, { align: "center" });
  y += 30;

  // ═══ INSPECTION RESULTS ═══
  setC(PDF_COLORS.blue);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("What We Checked", margin, y);
  y += 3;
  setD(PDF_COLORS.blue);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + 50, y);
  y += 7;

  for (const step of steps) {
    newPageIfNeeded(20);
    const ss = state.steps[step.stepNumber];
    const finding = ss?.findings || "pending";
    const fc = findingColor(finding);
    const bg = findingBg(finding);
    const label = findingLabel(finding);
    const desc = SIMPLE_DESCRIPTIONS[step.stepNumber] || step.description;

    // Row background
    setF(bg);
    doc.rect(margin, y - 3, contentW, 14, "F");

    // Color bar on left
    setF(fc);
    doc.rect(margin, y - 3, 3, 14, "F");

    // Step title
    setC(PDF_COLORS.black);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${step.stepNumber}. ${step.title}`, margin + 6, y + 2);

    // Finding badge on right
    setC(fc);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(label, pageW - margin - 2, y + 2, { align: "right" });

    y += 11;

    // Simple description
    setC(PDF_COLORS.gray);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(desc, margin + 6, y);
    y += 5;

    // Notes / details / sludge / PSI
    if (ss?.notes) {
      newPageIfNeeded(8);
      setC(PDF_COLORS.black);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const noteLines = doc.splitTextToSize(`Notes: ${ss.notes}`, contentW - 10);
      doc.text(noteLines, margin + 6, y);
      y += noteLines.length * 3.5 + 2;
    }
    if (ss?.findingDetails) {
      newPageIfNeeded(8);
      setC(fc);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      const detailLines = doc.splitTextToSize(`Detail: ${ss.findingDetails}`, contentW - 10);
      doc.text(detailLines, margin + 6, y);
      y += detailLines.length * 3.5 + 2;
    }
    if (ss?.sludgeLevel) {
      setC(PDF_COLORS.blue);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(`Sludge Level: ${ss.sludgeLevel}`, margin + 6, y);
      y += 4;
    }
    if (ss?.psiReading) {
      setC(PDF_COLORS.blue);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(`PSI Reading: ${ss.psiReading}`, margin + 6, y);
      y += 4;
    }
    y += 2;
  }

  // ═══ WHAT NEEDS TO BE DONE ═══
  const actionItems = steps.filter((s) => {
    const ss = state.steps[s.stepNumber];
    return ss && ss.findings !== "ok" && ss.findings !== "pending";
  });

  if (actionItems.length > 0) {
    newPageIfNeeded(25);
    y += 5;
    setC(PDF_COLORS.red);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("What Needs To Be Done", margin, y);
    y += 3;
    setD(PDF_COLORS.red);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 55, y);
    y += 7;

    for (const step of actionItems) {
      newPageIfNeeded(16);
      const ss = state.steps[step.stepNumber]!;
      const fc = findingColor(ss.findings);
      const urgency = ss.findings === "critical" ? "Fix Right Away" : "Fix Soon";

      // Colored bullet
      setF(fc);
      doc.circle(margin + 3, y - 1, 2, "F");

      // Item text
      setC(PDF_COLORS.black);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(step.title, margin + 8, y);

      // Urgency tag
      setC(fc);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(`[${urgency}]`, pageW - margin, y, { align: "right" });
      y += 5;

      if (ss.findingDetails) {
        setC(PDF_COLORS.gray);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const lines = doc.splitTextToSize(ss.findingDetails, contentW - 12);
        doc.text(lines, margin + 8, y);
        y += lines.length * 3.5 + 2;
      }
      y += 3;
    }
  }

  // ═══ RECOMMENDATIONS ═══
  if (state.summary?.recommendations?.length) {
    newPageIfNeeded(20);
    y += 5;
    setC(PDF_COLORS.blue);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("What To Watch For", margin, y);
    y += 3;
    setD(PDF_COLORS.blue);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 48, y);
    y += 7;

    setC(PDF_COLORS.black);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const rec of state.summary.recommendations) {
      newPageIfNeeded(8);
      const lines = doc.splitTextToSize(`  •  ${rec}`, contentW - 5);
      doc.text(lines, margin, y);
      y += lines.length * 4 + 2;
    }
  }

  // ═══ ESTIMATED COSTS TABLE ═══
  const estimate = calculateEstimate(state);
  if (estimate.items.length > 0) {
    newPageIfNeeded(30);
    y += 5;
    setC(PDF_COLORS.blue);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Estimated Repair Costs", margin, y);
    y += 3;
    setD(PDF_COLORS.blue);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 55, y);
    y += 7;

    // Table header
    setF(PDF_COLORS.blue);
    doc.rect(margin, y - 3, contentW, 8, "F");
    setC(PDF_COLORS.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Item", margin + 4, y + 2);
    doc.text("Cost", pageW - margin - 4, y + 2, { align: "right" });
    y += 9;

    // Table rows (alternating)
    for (let i = 0; i < estimate.items.length; i++) {
      newPageIfNeeded(8);
      const item = estimate.items[i];
      if (i % 2 === 0) {
        setF(PDF_COLORS.lightGray);
        doc.rect(margin, y - 3, contentW, 7, "F");
      }
      setC(PDF_COLORS.black);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(item.name, margin + 4, y + 1);
      doc.text(`$${item.cost.toFixed(2)}`, pageW - margin - 4, y + 1, { align: "right" });
      y += 7;
    }

    // Total row
    y += 2;
    setF(PDF_COLORS.blue);
    doc.rect(margin, y - 3, contentW, 10, "F");
    setC(PDF_COLORS.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Estimated Total", margin + 4, y + 3);
    doc.text(`$${estimate.total.toFixed(2)}`, pageW - margin - 4, y + 3, { align: "right" });
    y += 14;
  }

  // ═══ SIGNATURE LINE ═══
  newPageIfNeeded(30);
  y += 10;
  setC(PDF_COLORS.gray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Customer Signature:", margin, y);
  setD(PDF_COLORS.gray);
  doc.setLineWidth(0.3);
  doc.line(margin + 38, y, margin + 110, y);
  doc.text("Date:", margin + 118, y);
  doc.line(margin + 130, y, pageW - margin, y);

  // ═══ FOOTER ═══
  y += 15;
  newPageIfNeeded(15);
  setF(PDF_COLORS.lightGray);
  doc.rect(margin, y - 3, contentW, 16, "F");
  setC(PDF_COLORS.gray);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Questions? Call MAC Septic Services at (512) 555-0100", pageW / 2, y + 2, { align: "center" });
  doc.text("We're here to help keep your septic system running smoothly.", pageW / 2, y + 7, { align: "center" });
  doc.setFontSize(7);
  doc.text(`Report generated: ${new Date().toLocaleString()}`, pageW / 2, y + 12, { align: "center" });

  return doc.output("blob");
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function InspectionChecklist({ jobId, customerPhone, customerName, customerEmail, onPhotoUploaded }: Props) {
  const { data: serverState, isLoading } = useInspectionState(jobId);
  const startMutation = useStartInspection();
  const updateStepMutation = useUpdateInspectionStep();
  const completeMutation = useCompleteInspection();
  const saveMutation = useSaveInspectionState();
  const uploadPhotoMutation = useUploadJobPhoto();
  const createEstimateMutation = useCreateEstimateFromInspection();

  // Local state (mirrors server, syncs on changes)
  const [localState, setLocalState] = useState<InspectionState>(createDefaultInspectionState());
  const [currentStep, setCurrentStep] = useState(1);
  const [showStepList, setShowStepList] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [sendingReport, setSendingReport] = useState<string | null>(null);
  const [estimateQuoteId, setEstimateQuoteId] = useState<string | null>(null);
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
        sludge_level: update.sludgeLevel,
        psi_reading: update.psiReading,
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

  const handleNotifyHomeowner = () => {
    if (!customerPhone) return;
    const msg = `Hi${customerName ? ` ${customerName}` : ""}, this is your technician from MAC Septic Services. I've arrived and will be checking your septic system — should take about 25 minutes.`;
    window.open(`sms:${customerPhone}?body=${encodeURIComponent(msg)}`, "_self");
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
    await completeMutation.mutateAsync({
      jobId,
      techNotes,
      recommendPumping: localState.recommendPumping,
    });
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
    setShowStepList(false);
    setShowSummary(false);
  };

  // ─── Report Handlers ──────────────────────────────────────────────────────

  const handleDownloadPDF = async () => {
    setSendingReport("pdf");
    try {
      const blob = await generateReportPDF(localState, customerName || "Customer", jobId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MAC-Septic-Inspection-${jobId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toastSuccess("Report downloaded!");
    } catch (err) {
      toastError("Failed to generate PDF");
    }
    setSendingReport(null);
  };

  const handlePrintReport = async () => {
    setSendingReport("print");
    try {
      const blob = await generateReportPDF(localState, customerName || "Customer", jobId);
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 1000);
      };
      toastSuccess("Sending to printer...");
    } catch {
      toastError("Failed to print report");
    }
    setSendingReport(null);
  };

  const handleEmailReport = async () => {
    if (!customerEmail) {
      toastInfo("No customer email on file");
      return;
    }
    setSendingReport("email");
    try {
      const blob = await generateReportPDF(localState, customerName || "Customer", jobId);
      const base64 = await blobToBase64(blob);
      const result = await saveMutation.mutateAsync({
        jobId,
        state: {
          ...localState,
          summary: {
            ...localState.summary!,
            reportSentVia: [...(localState.summary?.reportSentVia || []), "email"],
            reportSentAt: new Date().toISOString(),
          },
        },
        sendReport: { method: "email", to: customerEmail, pdfBase64: base64 },
      });
      if (result?.report_sent === false) {
        toastError("Email service unavailable — download PDF instead");
      } else {
        toastSuccess(`Report emailed to ${customerEmail}!`);
      }
    } catch {
      toastError("Failed to send email");
    }
    setSendingReport(null);
  };

  const handleTextReport = () => {
    if (!customerPhone) {
      toastInfo("No customer phone on file");
      return;
    }
    const s = localState.summary!;
    const condition = s.overallCondition === "good" ? "Good"
      : s.overallCondition === "fair" ? "Fair — needs attention"
      : s.overallCondition === "poor" ? "Poor — multiple issues"
      : "Critical — repairs needed";

    const issues = s.recommendations?.filter((r: string) => r.startsWith("URGENT") || r.startsWith("Step")).slice(0, 3) || [];
    const issueLines = issues.length > 0
      ? "\n\nFindings:\n" + issues.map((r: string) => `- ${r}`).join("\n")
      : "";

    const estimate = calculateEstimate(localState);
    const estimateLine = estimate.total > 0
      ? `\n\nEstimated repairs: $${estimate.total.toFixed(2)}`
      : "";

    const msg = `MAC Septic Services — Inspection Report\n\nHi${customerName ? ` ${customerName}` : ""}, your septic inspection is complete.\n\nCondition: ${condition}${issueLines}${estimateLine}\n\nWe'll send a detailed PDF report by email. Questions? Call us at (512) 392-1232.`;

    window.open(`sms:${customerPhone}?body=${encodeURIComponent(msg)}`, "_self");

    // Track that report was sent
    setLocalState((prev) => ({
      ...prev,
      summary: {
        ...prev.summary!,
        reportSentVia: [...(prev.summary?.reportSentVia || []), "sms"],
        reportSentAt: new Date().toISOString(),
      },
    }));
    toastSuccess("Opening text message...");
  };

  // ─── Estimate Signature Modal (overlay — renders above all views) ────────

  if (estimateQuoteId) {
    return (
      <EstimateSignature
        quoteId={estimateQuoteId}
        onClose={() => setEstimateQuoteId(null)}
      />
    );
  }

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
    const estimate = calculateEstimate(localState);
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
          <h3 className="text-xl font-bold text-text-primary">Inspection Report</h3>
          <p className="text-xs text-text-secondary">For {customerName || "Customer"}</p>
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

        {/* Sludge Level & PSI Summary */}
        {(localState.steps[7]?.sludgeLevel || localState.steps[8]?.psiReading) && (
          <div className="grid grid-cols-2 gap-3">
            {localState.steps[7]?.sludgeLevel && (
              <div className="border border-border rounded-lg p-3 text-center">
                <p className="text-xs text-text-muted">Sludge Level</p>
                <p className="text-lg font-bold text-text-primary">{localState.steps[7].sludgeLevel}</p>
              </div>
            )}
            {localState.steps[8]?.psiReading && (
              <div className="border border-border rounded-lg p-3 text-center">
                <p className="text-xs text-text-muted">PSI Reading</p>
                <p className="text-lg font-bold text-text-primary">{localState.steps[8].psiReading}</p>
              </div>
            )}
          </div>
        )}

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

        {/* Estimate */}
        {estimate.items.length > 0 && (
          <div className="border border-border rounded-lg p-4">
            <h4 className="font-semibold text-text-primary mb-2">💰 Estimated Repairs</h4>
            <div className="space-y-1">
              {estimate.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-text-secondary">{item.name}</span>
                  <span className="font-medium text-text-primary">${item.cost.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 mt-2 flex justify-between">
                <span className="font-bold text-text-primary">Estimated Total</span>
                <span className="font-bold text-primary">${estimate.total.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  const result = await createEstimateMutation.mutateAsync(jobId);
                  setEstimateQuoteId(result.quote_id);
                } catch { /* error toast from hook */ }
              }}
              disabled={createEstimateMutation.isPending}
              className="w-full mt-3 py-3 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {createEstimateMutation.isPending ? "⏳ Creating..." : "📋 Create Estimate for Customer"}
            </button>
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

        {/* ─── Send Report to Customer ─────────────────────────────── */}
        <div className="border border-border rounded-lg p-4">
          <h4 className="font-semibold text-text-primary mb-3">📤 Send Report to Customer</h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={sendingReport === "pdf"}
              className="py-3 rounded-lg border border-border text-sm font-medium text-text-primary hover:bg-bg-hover active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {sendingReport === "pdf" ? "⏳ Generating..." : "📄 Download PDF"}
            </button>
            <button
              onClick={handlePrintReport}
              disabled={sendingReport === "print"}
              className="py-3 rounded-lg border border-border text-sm font-medium text-text-primary hover:bg-bg-hover active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {sendingReport === "print" ? "⏳ Printing..." : "🖨️ Print Report"}
            </button>
            <button
              onClick={handleEmailReport}
              disabled={sendingReport === "email" || !customerEmail}
              className="py-3 rounded-lg border border-primary/30 bg-primary/5 text-sm font-medium text-primary hover:bg-primary/10 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {sendingReport === "email" ? "⏳ Sending..." : `📧 Email${customerEmail ? "" : " (no email)"}`}
            </button>
            <button
              onClick={handleTextReport}
              disabled={!customerPhone}
              className="py-3 rounded-lg border border-blue-300 bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 active:scale-[0.98] transition-all disabled:opacity-50 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300"
            >
              {`💬 Text${customerPhone ? "" : " (no phone)"}`}
            </button>
          </div>
          {s.reportSentVia && s.reportSentVia.length > 0 && (
            <p className="text-xs text-success mt-2 text-center">
              ✅ Report sent via {s.reportSentVia.join(", ")} at{" "}
              {s.reportSentAt ? new Date(s.reportSentAt).toLocaleTimeString() : ""}
            </p>
          )}
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
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-4xl">🎉</div>
          <h3 className="text-xl font-bold text-text-primary">All Steps Complete!</h3>
          <p className="text-text-secondary text-sm">Generate the customer inspection report.</p>
        </div>

        {/* Recommend Pumping toggle */}
        <label className="flex items-center gap-3 p-4 bg-bg-hover rounded-lg cursor-pointer border border-border">
          <input
            type="checkbox"
            checked={localState.recommendPumping || false}
            onChange={(e) => setLocalState((s) => ({ ...s, recommendPumping: e.target.checked }))}
            className="w-5 h-5 rounded accent-primary"
          />
          <div>
            <p className="font-medium text-text-primary text-sm">🚛 Recommend Pumping</p>
            <p className="text-xs text-text-secondary">Include pumping recommendation in customer report</p>
          </div>
        </label>

        <button
          onClick={handleCompleteInspection}
          disabled={completeMutation.isPending}
          className="w-full py-4 rounded-xl text-lg font-bold text-white bg-success disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {completeMutation.isPending ? "Generating..." : "📊 Generate Customer Report"}
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

            {/* Video Link (placeholder for future) */}
            {currentStepDef.videoLink && (
              <a
                href={currentStepDef.videoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-sm font-medium"
              >
                🎥 Watch Tutorial Video
              </a>
            )}

            {/* Parts needed for this step */}
            {currentStepDef.parts && currentStepDef.parts.length > 0 && (
              <div className="bg-bg-hover rounded-lg p-3">
                <p className="text-xs font-semibold text-text-primary mb-1">🔩 Parts (if needed)</p>
                {currentStepDef.parts.map((part, i) => (
                  <div key={i} className="flex justify-between text-xs text-text-secondary">
                    <span>{part.name} {part.partNumber && <span className="text-text-muted">({part.partNumber})</span>}</span>
                    {part.estimatedCost && <span className="text-text-primary">${part.estimatedCost}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Step 2: Homeowner Notification */}
            {currentStep === 2 && (
              <div className="space-y-2">
                <button
                  onClick={handleNotifyHomeowner}
                  disabled={!!localState.homeownerNotifiedAt}
                  className="w-full py-3 rounded-lg text-sm font-bold text-white bg-blue-600 disabled:opacity-50 active:scale-[0.98] transition-transform"
                >
                  {localState.homeownerNotifiedAt
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

            {/* Sludge Level Input */}
            {currentStepDef.hasSludgeLevel && (
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">📏 Sludge Level</p>
                <input
                  type="text"
                  value={currentStepState.sludgeLevel || ""}
                  onChange={(e) => updateStepField("sludgeLevel", e.target.value)}
                  placeholder='e.g., "8 inches" or "1/3 full"'
                  className="w-full p-3 rounded-lg border border-border bg-bg-body text-sm text-text-primary"
                />
              </div>
            )}

            {/* PSI Reading Input */}
            {currentStepDef.hasPsiReading && (
              <div>
                <p className="text-xs font-semibold text-text-primary mb-1">🔧 PSI Reading</p>
                <input
                  type="text"
                  value={currentStepState.psiReading || ""}
                  onChange={(e) => updateStepField("psiReading", e.target.value)}
                  placeholder="e.g., 25 PSI"
                  className="w-full p-3 rounded-lg border border-border bg-bg-body text-sm text-text-primary"
                />
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

// ─── Utility ────────────────────────────────────────────────────────────────

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
