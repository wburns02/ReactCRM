import { useState, useRef, useCallback, useEffect } from "react";
import { jsPDF } from "jspdf";
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
  useInspectionAIAnalysis,
  type AIInspectionAnalysis,
} from "@/api/hooks/useTechPortal.ts";
import { useWorkOrderPhotos, type PhotoResponse } from "@/api/hooks/useWorkOrderPhotos.ts";
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

// ─── Photo type labels for the PDF ──────────────────────────────────────────

const PHOTO_TYPE_LABELS: Record<string, string> = {
  before: "Before Inspection",
  after: "After Inspection (Clean Up)",
  lid: "Tank Lids",
  tank: "Tank Interior",
  inlet: "Inlet",
  outlet: "Outlet",
  control_panel: "Control Panel",
  breaker: "Breaker Panel",
  disc_filter: "Disc Filter",
  pump_intake: "Pump Intake",
  driveway: "Driveway / Access",
  atu_refill: "ATU Refill",
  inspection_location: "Property / Location",
  inspection_tank_location: "Tank Location",
  inspection_float_test: "Float & Pump Test",
  inspection_timer: "Timer Settings",
  inspection_alarm: "Alarm Test",
  inspection_corrosion: "Corrosion Check",
  inspection_spray_drip: "Spray / Drip System",
  psi_reading: "PSI Reading",
  sludge_level: "Sludge Level",
};

// ─── PDF Report Generation (client-side, premium design) ─────────────────────

interface PDFPhoto {
  data: string; // base64 data URL
  type: string;
  label: string;
}

async function generateReportPDF(
  state: InspectionState,
  customerName: string,
  jobId: string,
  aiAnalysis?: AIInspectionAnalysis | null,
  includePumping?: boolean,
  photos?: PDFPhoto[],
): Promise<Blob> {
  const doc = new jsPDF();
  const steps = INSPECTION_STEPS;
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 0;
  const pageH = 297;

  // Brand colors
  const BRAND = {
    navy: { r: 15, g: 23, b: 42 },       // slate-900
    blue: { r: 30, g: 64, b: 175 },       // brand primary
    accent: { r: 59, g: 130, b: 246 },    // blue-500
    success: { r: 22, g: 163, b: 74 },    // green-600
    warning: { r: 234, g: 179, b: 8 },    // yellow-500
    danger: { r: 220, g: 38, b: 38 },     // red-600
    text: { r: 30, g: 41, b: 59 },        // slate-800
    muted: { r: 100, g: 116, b: 139 },    // slate-500
    light: { r: 241, g: 245, b: 249 },    // slate-100
    white: { r: 255, g: 255, b: 255 },
    divider: { r: 226, g: 232, b: 240 },  // slate-200
    cardBg: { r: 248, g: 250, b: 252 },   // slate-50
  };

  function setC(c: { r: number; g: number; b: number }) { doc.setTextColor(c.r, c.g, c.b); }
  function setF(c: { r: number; g: number; b: number }) { doc.setFillColor(c.r, c.g, c.b); }
  function setD(c: { r: number; g: number; b: number }) { doc.setDrawColor(c.r, c.g, c.b); }
  function newPage() { doc.addPage(); y = 20; addPageDecoration(); }
  function ensureSpace(need: number) { if (y + need > pageH - 25) newPage(); }

  // Side accent stripe on every page
  function addPageDecoration() {
    setF(BRAND.blue);
    doc.rect(0, 0, 4, pageH, "F");
    // Thin bottom line
    setF(BRAND.divider);
    doc.rect(0, pageH - 12, pageW, 12, "F");
    setC(BRAND.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("MAC Septic Services  |  (512) 392-1232  |  macseptic.com", pageW / 2, pageH - 5, { align: "center" });
    doc.text(`Page ${doc.getNumberOfPages()}`, pageW - margin, pageH - 5, { align: "right" });
  }

  // Section header with accent bar
  function sectionHeader(title: string, color: { r: number; g: number; b: number } = BRAND.blue) {
    ensureSpace(16);
    y += 4;
    setF(color);
    doc.rect(margin, y - 1, 4, 12, "F");
    setC(color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(title, margin + 8, y + 8);
    y += 16;
  }

  // ═══ PAGE 1: COVER / HEADER ═══
  addPageDecoration();

  // Top banner — full-width navy bar
  setF(BRAND.navy);
  doc.rect(0, 0, pageW, 50, "F");
  // Blue accent overlay on left
  setF(BRAND.blue);
  doc.rect(0, 0, 70, 50, "F");
  // Company name in accent area
  setC(BRAND.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("MAC", 10, 20);
  doc.text("SEPTIC", 10, 30);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("SERVICES", 10, 37);
  // Report title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Inspection Report", 80, 22);
  // Metadata line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  doc.text(dateStr, 80, 32);
  doc.setFontSize(9);
  setC({ r: 148, g: 163, b: 184 }); // slate-400
  doc.text(`Ref: WO-${jobId.slice(0, 8).toUpperCase()}`, 80, 40);
  y = 58;

  // Customer info card
  setF(BRAND.cardBg);
  setD(BRAND.divider);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentW, 18, 3, 3, "FD");
  setC(BRAND.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("PREPARED FOR", margin + 5, y + 6);
  setC(BRAND.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(customerName, margin + 5, y + 13);
  // System type badge
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setC(BRAND.accent);
  doc.text("Aerobic System", pageW - margin - 5, y + 10, { align: "right" });
  y += 24;

  // ═══ CONDITION SUMMARY ═══
  const condition = state.summary?.overallCondition || "unknown";
  const issues = state.summary?.totalIssues || 0;
  const criticalCount = state.summary?.criticalIssues || 0;
  const condColor = condition === "good" ? BRAND.success : condition === "fair" ? BRAND.warning : BRAND.danger;
  const condBg = condition === "good"
    ? { r: 220, g: 252, b: 231 }
    : condition === "fair"
    ? { r: 254, g: 249, b: 195 }
    : { r: 254, g: 226, b: 226 };
  const condLabel = condition === "good" ? "GOOD" : condition === "fair" ? "FAIR" : condition === "poor" ? "NEEDS ATTENTION" : "CRITICAL";
  const condText = condition === "good"
    ? "Your septic system is working great! No issues were found."
    : condition === "fair"
    ? "Your system is functional but has some items that need attention."
    : "Your system needs repairs. Please review the items below carefully.";

  setF(condBg);
  setD(condColor);
  doc.setLineWidth(1.5);
  doc.roundedRect(margin, y, contentW, 28, 3, 3, "FD");
  // Big condition badge
  setF(condColor);
  doc.roundedRect(margin + 4, y + 4, 36, 20, 2, 2, "F");
  setC(BRAND.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(condLabel, margin + 22, y + 16, { align: "center" });
  // Description text
  setC(BRAND.text);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const condLines = doc.splitTextToSize(condText, contentW - 50);
  doc.text(condLines, margin + 44, y + 10);
  // Issue count
  if (issues > 0) {
    setC(BRAND.muted);
    doc.setFontSize(8);
    doc.text(`${issues} issue${issues > 1 ? "s" : ""} found${criticalCount > 0 ? ` (${criticalCount} critical)` : ""}`, margin + 44, y + 22);
  }
  y += 34;

  // ═══ KEY READINGS (PSI / Sludge) ═══
  const psi = state.steps[8]?.psiReading;
  const sludge = state.steps[7]?.sludgeLevel;
  if (psi || sludge) {
    ensureSpace(20);
    const boxW = (contentW - 4) / 2;
    if (psi) {
      setF(BRAND.light);
      doc.roundedRect(margin, y, boxW, 16, 2, 2, "F");
      setC(BRAND.muted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text("PSI READING", margin + boxW / 2, y + 5, { align: "center" });
      setC(BRAND.blue);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(psi, margin + boxW / 2, y + 13, { align: "center" });
    }
    if (sludge) {
      const sx = psi ? margin + boxW + 4 : margin;
      setF(BRAND.light);
      doc.roundedRect(sx, y, boxW, 16, 2, 2, "F");
      setC(BRAND.muted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text("SLUDGE LEVEL", sx + boxW / 2, y + 5, { align: "center" });
      setC(BRAND.blue);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(sludge, sx + boxW / 2, y + 13, { align: "center" });
    }
    y += 20;
  }

  // ═══ INSPECTION RESULTS ═══
  sectionHeader("Inspection Results");

  for (const step of steps) {
    ensureSpace(18);
    const ss = state.steps[step.stepNumber];
    const finding = ss?.findings || "pending";
    const fc = findingColor(finding);
    const label = findingLabel(finding);

    // Alternating row background
    if (step.stepNumber % 2 === 0) {
      setF(BRAND.cardBg);
      doc.rect(margin, y - 4, contentW, 12, "F");
    }
    // Left color dot
    setF(fc);
    doc.circle(margin + 4, y + 1, 2.5, "F");
    // Step number + title
    setC(BRAND.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`${step.stepNumber}. ${step.title}`, margin + 10, y + 2);
    // Badge on right
    setC(fc);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(label, pageW - margin - 2, y + 2, { align: "right" });
    y += 8;

    // Finding details + notes (compact)
    if (ss?.findingDetails) {
      ensureSpace(8);
      setC(BRAND.muted);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      const lines = doc.splitTextToSize(ss.findingDetails, contentW - 14);
      doc.text(lines, margin + 10, y);
      y += lines.length * 3.5 + 1;
    }
    if (ss?.notes && ss.notes !== ss.findingDetails) {
      ensureSpace(6);
      setC(BRAND.muted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      const nLines = doc.splitTextToSize(`Tech notes: ${ss.notes}`, contentW - 14);
      doc.text(nLines, margin + 10, y);
      y += nLines.length * 3 + 1;
    }
    y += 2;
  }

  // ═══ PHOTO EVIDENCE ═══
  if (photos && photos.length > 0) {
    newPage();
    sectionHeader("Photo Evidence");
    setC(BRAND.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${photos.length} photo${photos.length > 1 ? "s" : ""} captured during inspection`, margin + 8, y - 6);
    y += 2;

    const photoW = (contentW - 6) / 2; // 2-column grid with 6mm gap
    const photoH = 55;
    let col = 0;

    for (const photo of photos) {
      ensureSpace(photoH + 14);
      const x = margin + col * (photoW + 6);

      try {
        // Photo frame with shadow effect
        setF(BRAND.divider);
        doc.roundedRect(x + 1, y + 1, photoW, photoH, 2, 2, "F");
        // White border
        setF(BRAND.white);
        setD(BRAND.divider);
        doc.setLineWidth(0.5);
        doc.roundedRect(x, y, photoW, photoH, 2, 2, "FD");
        // Image (inset by 2mm)
        doc.addImage(photo.data, "JPEG", x + 2, y + 2, photoW - 4, photoH - 12);
        // Label bar at bottom of photo
        setF(BRAND.navy);
        doc.roundedRect(x, y + photoH - 10, photoW, 10, 0, 0, "F");
        // Round only bottom corners by drawing over top
        doc.rect(x, y + photoH - 10, photoW, 5, "F");
        setC(BRAND.white);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text(photo.label, x + photoW / 2, y + photoH - 4, { align: "center" });
      } catch {
        // If image fails to load, show placeholder
        setF(BRAND.light);
        doc.roundedRect(x, y, photoW, photoH, 2, 2, "F");
        setC(BRAND.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`[${photo.label}]`, x + photoW / 2, y + photoH / 2, { align: "center" });
      }

      col++;
      if (col >= 2) {
        col = 0;
        y += photoH + 6;
      }
    }
    if (col !== 0) y += photoH + 6; // finish partial row
  }

  // ═══ AI EXPERT ANALYSIS ═══
  if (aiAnalysis) {
    newPage();
    // Expert analysis banner
    setF(BRAND.navy);
    doc.rect(margin, y - 4, contentW, 24, "F");
    // Blue accent stripe
    setF(BRAND.blue);
    doc.rect(margin, y - 4, 5, 24, "F");
    setC(BRAND.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Expert Analysis", margin + 10, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setC({ r: 148, g: 163, b: 184 });
    doc.text("AI-powered professional assessment by MAC Septic", margin + 10, y + 14);
    y += 28;

    // Overall Assessment
    ensureSpace(30);
    setC(BRAND.text);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const assessLines = doc.splitTextToSize(aiAnalysis.overall_assessment || "", contentW - 4);
    doc.text(assessLines, margin + 2, y);
    y += assessLines.length * 4.5 + 6;

    // What to Expect — in a highlight card
    if (aiAnalysis.what_to_expect) {
      ensureSpace(30);
      setF({ r: 239, g: 246, b: 255 }); // blue-50
      setD(BRAND.accent);
      doc.setLineWidth(0.5);
      const expectLines = doc.splitTextToSize(aiAnalysis.what_to_expect, contentW - 16);
      const boxH = expectLines.length * 4 + 12;
      doc.roundedRect(margin, y, contentW, boxH, 2, 2, "FD");
      setC(BRAND.blue);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("What to Expect Over the Next 6-12 Months", margin + 5, y + 7);
      setC(BRAND.text);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(expectLines, margin + 5, y + 14);
      y += boxH + 4;
    }

    // Priority Repairs
    if (aiAnalysis.priority_repairs?.length) {
      ensureSpace(20);
      sectionHeader("Priority Repairs", BRAND.danger);
      for (const repair of aiAnalysis.priority_repairs) {
        ensureSpace(18);
        const urgColor = repair.urgency === "Fix today" ? BRAND.danger
          : repair.urgency === "Schedule this week" ? BRAND.warning
          : BRAND.accent;
        // Urgency badge
        setF(urgColor);
        const badgeW = doc.getTextWidth(repair.urgency) + 6;
        doc.roundedRect(margin, y - 3, badgeW, 7, 1.5, 1.5, "F");
        setC(BRAND.white);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text(repair.urgency, margin + 3, y + 1);
        // Issue title
        setC(BRAND.text);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(repair.issue, margin + badgeW + 4, y + 1);
        y += 6;
        // Why it matters
        setC(BRAND.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const whyLines = doc.splitTextToSize(repair.why_it_matters, contentW - 8);
        doc.text(whyLines, margin + 4, y);
        y += whyLines.length * 3.5 + 4;
      }
    }

    // Maintenance Schedule
    if (aiAnalysis.maintenance_schedule?.length) {
      ensureSpace(20);
      sectionHeader("Maintenance Schedule");
      // Table header
      setF(BRAND.blue);
      doc.rect(margin, y - 3, contentW, 8, "F");
      setC(BRAND.white);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("TIMEFRAME", margin + 4, y + 2);
      doc.text("ACTION NEEDED", margin + 42, y + 2);
      y += 9;
      for (let i = 0; i < aiAnalysis.maintenance_schedule.length; i++) {
        const item = aiAnalysis.maintenance_schedule[i];
        ensureSpace(12);
        if (i % 2 === 0) {
          setF(BRAND.cardBg);
          doc.rect(margin, y - 3, contentW, 10, "F");
        }
        setC(BRAND.blue);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(item.timeframe, margin + 4, y + 2);
        setC(BRAND.text);
        doc.setFont("helvetica", "normal");
        const taskLines = doc.splitTextToSize(item.task, contentW - 46);
        doc.text(taskLines, margin + 42, y + 2);
        y += Math.max(10, taskLines.length * 3.5 + 4);
      }
      y += 4;
    }

    // Seasonal Tips — 2x2 grid of cards
    if (aiAnalysis.seasonal_tips?.length) {
      ensureSpace(60);
      sectionHeader("Seasonal Care Guide");
      const tipW = (contentW - 4) / 2;
      const seasonColors: Record<string, { r: number; g: number; b: number }> = {
        "Spring": { r: 22, g: 163, b: 74 },
        "Summer": { r: 234, g: 179, b: 8 },
        "Fall": { r: 234, g: 88, b: 12 },
        "Winter": { r: 59, g: 130, b: 246 },
      };
      let tipCol = 0;
      let tipRowY = y;
      let maxH = 0;
      for (const tip of aiAnalysis.seasonal_tips) {
        const tx = margin + tipCol * (tipW + 4);
        const color = seasonColors[tip.season.replace(":", "")] || BRAND.accent;
        const tipLines = doc.splitTextToSize(tip.tip, tipW - 10);
        const tipH = tipLines.length * 3.5 + 14;
        ensureSpace(tipH);
        // Card background
        setF(BRAND.cardBg);
        setD(BRAND.divider);
        doc.setLineWidth(0.3);
        doc.roundedRect(tx, tipRowY, tipW, tipH, 2, 2, "FD");
        // Color top stripe
        setF(color);
        doc.rect(tx, tipRowY, tipW, 3, "F");
        // Season label
        setC(color);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(tip.season.replace(":", ""), tx + 4, tipRowY + 10);
        // Tip text
        setC(BRAND.text);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text(tipLines, tx + 4, tipRowY + 16);
        maxH = Math.max(maxH, tipH);
        tipCol++;
        if (tipCol >= 2) {
          tipCol = 0;
          tipRowY += maxH + 4;
          maxH = 0;
        }
      }
      y = tipRowY + (tipCol > 0 ? maxH + 4 : 0);
    }
  }

  // ═══ ESTIMATED COSTS TABLE ═══
  const estimate = calculateEstimate(state, { includePumping });
  if (estimate.items.length > 0) {
    ensureSpace(40);
    sectionHeader("Estimated Repair Costs");

    // Table header
    setF(BRAND.navy);
    doc.rect(margin, y - 3, contentW, 9, "F");
    setC(BRAND.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Service / Part", margin + 4, y + 3);
    doc.text("Amount", pageW - margin - 4, y + 3, { align: "right" });
    y += 10;

    for (let i = 0; i < estimate.items.length; i++) {
      ensureSpace(9);
      const item = estimate.items[i];
      if (i % 2 === 0) {
        setF(BRAND.cardBg);
        doc.rect(margin, y - 3, contentW, 8, "F");
      }
      setC(BRAND.text);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(item.name, margin + 4, y + 2);
      doc.text(`$${item.cost.toFixed(2)}`, pageW - margin - 4, y + 2, { align: "right" });
      y += 8;
    }

    // Total bar
    y += 2;
    setF(BRAND.blue);
    doc.roundedRect(margin, y - 3, contentW, 12, 2, 2, "F");
    setC(BRAND.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("ESTIMATED TOTAL", margin + 6, y + 4);
    doc.text(`$${estimate.total.toFixed(2)}`, pageW - margin - 6, y + 4, { align: "right" });
    y += 16;

    // Disclaimer
    setC(BRAND.muted);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.text("* Estimates are approximate. Final costs may vary based on actual conditions found during repair.", margin, y);
    y += 8;
  }

  // ═══ SIGNATURE LINE ═══
  ensureSpace(35);
  y += 6;
  setD(BRAND.divider);
  doc.setLineWidth(0.3);
  // Signature
  setC(BRAND.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Customer Signature", margin, y);
  doc.line(margin, y + 3, margin + 75, y + 3);
  // Date
  doc.text("Date", margin + 85, y);
  doc.line(margin + 85, y + 3, pageW - margin, y + 3);
  y += 12;
  doc.text("Technician Signature", margin, y);
  doc.line(margin, y + 3, margin + 75, y + 3);
  doc.text("License #", margin + 85, y);
  doc.line(margin + 85, y + 3, pageW - margin, y + 3);

  // ═══ FINAL FOOTER with thank you ═══
  y += 14;
  ensureSpace(18);
  setF(BRAND.navy);
  doc.roundedRect(margin, y, contentW, 16, 2, 2, "F");
  setC(BRAND.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Thank you for choosing MAC Septic Services!", pageW / 2, y + 6, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setC({ r: 148, g: 163, b: 184 });
  doc.text("(512) 392-1232  |  macseptic.com  |  San Marcos, TX", pageW / 2, y + 12, { align: "center" });

  return doc.output("blob");
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function InspectionChecklist({ jobId, customerPhone, customerName, customerEmail, onPhotoUploaded }: Props) {
  const { data: serverState, isLoading } = useInspectionState(jobId);
  const { data: workOrderPhotos } = useWorkOrderPhotos(jobId);
  const startMutation = useStartInspection();
  const updateStepMutation = useUpdateInspectionStep();
  const completeMutation = useCompleteInspection();
  const saveMutation = useSaveInspectionState();
  const uploadPhotoMutation = useUploadJobPhoto();
  const createEstimateMutation = useCreateEstimateFromInspection();
  const aiAnalysisMutation = useInspectionAIAnalysis();

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
  const [aiAnalysis, setAiAnalysis] = useState<AIInspectionAnalysis | null>(null);
  const [includePumping, setIncludePumping] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sludgePhotoRef = useRef<HTMLInputElement>(null);
  const psiPhotoRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Sync from server
  useEffect(() => {
    if (serverState) {
      setLocalState(serverState);
      if (serverState.currentStep) setCurrentStep(serverState.currentStep);
      if (serverState.completedAt) setShowSummary(true);
      // Restore persisted AI analysis
      if (serverState.aiAnalysis) setAiAnalysis(serverState.aiAnalysis);
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

  const updateStepField = (field: keyof StepState, value: string | string[] | undefined) => {
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
        selected_parts: update.selectedParts,
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

  const handleEvidencePhoto = (ref: React.RefObject<HTMLInputElement | null>) => {
    ref.current?.click();
  };

  const handleEvidenceFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
    photoType: string,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        await uploadPhotoMutation.mutateAsync({ jobId, photo: base64, photoType });
        const existing = localState.steps[currentStep]?.photos || [];
        updateStepField("photos", [...existing, photoType]);
        onPhotoUploaded?.();
        toastSuccess("Evidence photo captured!");
        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toastError("Failed to upload photo");
      setUploadingPhoto(false);
    }
    e.target.value = "";
  };

  const togglePartSelection = (partName: string) => {
    const current = currentStepState.selectedParts || [];
    const updated = current.includes(partName)
      ? current.filter((p) => p !== partName)
      : [...current, partName];
    updateStepField("selectedParts", updated);
  };

  const handleAIAnalysis = async () => {
    try {
      const result = await aiAnalysisMutation.mutateAsync(jobId);
      setAiAnalysis(result);
      toastSuccess("AI analysis complete!");
    } catch { /* error toast from hook */ }
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

  // Prepare photos array for PDF embedding
  const getPDFPhotos = (): PDFPhoto[] => {
    if (!workOrderPhotos || workOrderPhotos.length === 0) return [];
    return workOrderPhotos
      .filter((p) => p.data) // only photos with actual data
      .map((p) => ({
        data: p.data,
        type: p.metadata?.photoType || "other",
        label: PHOTO_TYPE_LABELS[p.metadata?.photoType || ""] || p.metadata?.photoType || "Photo",
      }));
  };

  const handleDownloadPDF = async () => {
    setSendingReport("pdf");
    try {
      const pdfPhotos = getPDFPhotos();
      const blob = await generateReportPDF(localState, customerName || "Customer", jobId, aiAnalysis, localState.recommendPumping ? includePumping : false, pdfPhotos);
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
      const pdfPhotos = getPDFPhotos();
      const blob = await generateReportPDF(localState, customerName || "Customer", jobId, aiAnalysis, localState.recommendPumping ? includePumping : false, pdfPhotos);
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
      const pdfPhotos = getPDFPhotos();
      const blob = await generateReportPDF(localState, customerName || "Customer", jobId, aiAnalysis, localState.recommendPumping ? includePumping : false, pdfPhotos);
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
        // Backend email failed — auto-download PDF and open mailto fallback
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `MAC-Septic-Inspection-${jobId.slice(0, 8)}.pdf`;
        a.click();
        URL.revokeObjectURL(url);

        const s = localState.summary!;
        const condition = s.overallCondition === "good" ? "Good" : s.overallCondition === "fair" ? "Needs Attention" : "Needs Repair";
        const subject = `Your Septic Inspection Report — ${condition}`;
        const body = [
          `Hi ${customerName || ""},`,
          "",
          "Thank you for choosing MAC Septic Services. Please find your septic inspection report attached to this email.",
          "",
          `Overall Condition: ${condition}`,
          `Issues found: ${s.totalIssues || 0}`,
          "",
          "Please attach the downloaded PDF to this email before sending.",
          "",
          "Questions? Call us at (512) 392-1232",
          "MAC Septic Services — San Marcos, TX",
        ].join("\n");

        window.open(`mailto:${customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_self");
        toastSuccess("PDF downloaded — attach it to the email that just opened!");
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

    const estimate = calculateEstimate(localState, { includePumping: localState.recommendPumping ? includePumping : false });
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
    const estimate = calculateEstimate(localState, { includePumping: localState.recommendPumping ? includePumping : false });
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

        {/* AI-Powered Report — PRIMARY ACTION */}
        <div className="border-2 border-primary/30 bg-primary/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📝</span>
            <h4 className="font-semibold text-text-primary text-base">Customer Report</h4>
            {aiAnalysis?.generated_at && (
              <span className="ml-auto text-[10px] text-text-tertiary">
                Generated {new Date(aiAnalysis.generated_at).toLocaleTimeString()}
              </span>
            )}
          </div>
          {!aiAnalysis ? (
            <div>
              <p className="text-sm text-text-secondary mb-3">
                Generate a professional AI-powered report with personalized recommendations, maintenance schedule, and seasonal tips.
              </p>
              <button
                onClick={handleAIAnalysis}
                disabled={aiAnalysisMutation.isPending}
                className="w-full py-4 rounded-xl bg-primary text-white font-bold text-base hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {aiAnalysisMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⚙️</span> Generating Report with Claude...
                  </span>
                ) : "Generate AI Report"}
              </button>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {/* Overall Assessment */}
              <div>
                <p className="font-semibold text-primary text-xs mb-1">Overall Assessment</p>
                <p className="text-text-primary">{aiAnalysis.overall_assessment}</p>
              </div>

              {/* What to Expect */}
              {aiAnalysis.what_to_expect && (
                <div>
                  <p className="font-semibold text-primary text-xs mb-1">🔮 What to Expect</p>
                  <p className="text-text-primary text-xs">{aiAnalysis.what_to_expect}</p>
                </div>
              )}

              {/* Priority Repairs */}
              {aiAnalysis.priority_repairs?.length > 0 && (
                <div>
                  <p className="font-semibold text-primary text-xs mb-1">Priority Repairs</p>
                  {aiAnalysis.priority_repairs.map((repair, i) => (
                    <div key={i} className="ml-2 mb-2 border-l-2 border-primary/30 pl-2">
                      <p className="font-medium text-text-primary text-xs">{repair.issue}</p>
                      <p className="text-text-secondary text-xs">{repair.why_it_matters}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        repair.urgency === "Fix today" ? "bg-red-100 text-red-700" :
                        repair.urgency === "Schedule this week" ? "bg-yellow-100 text-yellow-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>{repair.urgency}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Maintenance Schedule */}
              {aiAnalysis.maintenance_schedule && aiAnalysis.maintenance_schedule.length > 0 && (
                <div>
                  <p className="font-semibold text-primary text-xs mb-1">📅 Maintenance Schedule</p>
                  <div className="space-y-1">
                    {aiAnalysis.maintenance_schedule.map((item, i) => (
                      <div key={i} className="flex gap-2 text-xs bg-bg-secondary/50 rounded p-2">
                        <span className="font-bold text-primary whitespace-nowrap">{item.timeframe}</span>
                        <div>
                          <span className="text-text-primary">{item.task}</span>
                          <span className="text-text-tertiary"> — {item.why}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seasonal Tips */}
              {aiAnalysis.seasonal_tips && aiAnalysis.seasonal_tips.length > 0 && (
                <div>
                  <p className="font-semibold text-primary text-xs mb-1">🌡️ Seasonal Care Tips</p>
                  <div className="grid grid-cols-2 gap-1">
                    {aiAnalysis.seasonal_tips.map((tip, i) => (
                      <div key={i} className="text-xs bg-bg-secondary/50 rounded p-2">
                        <span className="font-bold text-text-primary">{tip.season}: </span>
                        <span className="text-text-secondary">{tip.tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* What to Say */}
              <div>
                <p className="font-semibold text-primary text-xs mb-1">💬 What to Tell the Customer</p>
                <div className="bg-white dark:bg-bg-body rounded-lg p-3 text-xs text-text-primary whitespace-pre-line border border-primary/10">
                  {aiAnalysis.homeowner_script}
                </div>
              </div>

              {/* Maintenance */}
              <div>
                <p className="font-semibold text-primary text-xs mb-1">🔧 Maintenance Recommendation</p>
                <p className="text-text-primary text-xs">{aiAnalysis.maintenance_recommendation}</p>
              </div>

              {/* Cost Notes */}
              {aiAnalysis.cost_notes && (
                <div>
                  <p className="font-semibold text-primary text-xs mb-1">💰 Cost Notes</p>
                  <p className="text-text-secondary text-xs">{aiAnalysis.cost_notes}</p>
                </div>
              )}

              <p className="text-[10px] text-text-tertiary text-right">Powered by {aiAnalysis.model_used || "Claude Sonnet"}</p>

              <button
                onClick={handleAIAnalysis}
                disabled={aiAnalysisMutation.isPending}
                className="w-full py-2 rounded-lg border border-primary/30 text-primary text-xs font-medium hover:bg-primary/10"
              >
                {aiAnalysisMutation.isPending ? "Re-generating..." : "🔄 Re-generate Report"}
              </button>
            </div>
          )}
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
            {/* Pumping toggle — visible when tech recommended pumping */}
            {localState.recommendPumping && (
              <label className="flex items-center gap-3 mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg cursor-pointer border border-blue-200 dark:border-blue-800">
                <input
                  type="checkbox"
                  checked={includePumping}
                  onChange={(e) => setIncludePumping(e.target.checked)}
                  className="w-5 h-5 rounded accent-primary"
                />
                <div className="flex-1">
                  <p className="font-medium text-text-primary text-sm">🚛 Septic Tank Pumping</p>
                  <p className="text-xs text-text-secondary">Standard pump out — up to 2,000 gal</p>
                </div>
                <span className="font-bold text-primary text-sm">$595.00</span>
              </label>
            )}
            <button
              onClick={async () => {
                try {
                  const result = await createEstimateMutation.mutateAsync({
                    jobId,
                    includePumping: localState.recommendPumping ? includePumping : false,
                  });
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

        {/* AI Analysis — moved to top, see above condition card */}

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

            {/* Parts — selectable when finding is Attention or Critical */}
            {currentStepDef.parts && currentStepDef.parts.length > 0 && (
              <div className="bg-bg-hover rounded-lg p-3">
                <p className="text-xs font-semibold text-text-primary mb-1">
                  🔩 Parts {currentStepState.findings !== "ok" ? "(select needed)" : "(if needed)"}
                </p>
                {currentStepDef.parts.map((part, i) => {
                  const isSelectable = currentStepState.findings !== "ok";
                  const isSelected = (currentStepState.selectedParts || []).includes(part.name);
                  return (
                    <label
                      key={i}
                      className={`flex items-center gap-2 py-1 ${isSelectable ? "cursor-pointer" : ""}`}
                    >
                      {isSelectable && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePartSelection(part.name)}
                          className="w-4 h-4 rounded accent-primary"
                        />
                      )}
                      <span className={`flex-1 text-xs ${isSelected ? "text-text-primary font-medium" : "text-text-secondary"}`}>
                        {part.name} {part.partNumber && <span className="text-text-muted">({part.partNumber})</span>}
                      </span>
                      {part.estimatedCost && (
                        <span className={`text-xs ${isSelected ? "text-primary font-medium" : "text-text-primary"}`}>
                          ${part.estimatedCost}
                        </span>
                      )}
                    </label>
                  );
                })}
                {currentStepState.findings !== "ok" && (currentStepState.selectedParts?.length || 0) > 0 && (
                  <p className="text-xs text-primary font-medium mt-1">
                    {currentStepState.selectedParts!.length} part{currentStepState.selectedParts!.length > 1 ? "s" : ""} selected
                  </p>
                )}
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

            {/* Sludge Level Input + Evidence Photo */}
            {currentStepDef.hasSludgeLevel && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-text-primary">📏 Sludge Level</p>
                <input
                  type="text"
                  value={currentStepState.sludgeLevel || ""}
                  onChange={(e) => updateStepField("sludgeLevel", e.target.value)}
                  placeholder='e.g., "8 inches" or "1/3 full"'
                  className="w-full p-3 rounded-lg border border-border bg-bg-body text-sm text-text-primary"
                />
                <input
                  ref={sludgePhotoRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleEvidenceFileSelected(e, "sludge_level_evidence")}
                />
                <button
                  onClick={() => handleEvidencePhoto(sludgePhotoRef)}
                  disabled={uploadingPhoto}
                  className="w-full py-2 rounded-lg border border-dashed border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-medium flex items-center justify-center gap-1 active:scale-[0.98] transition-transform"
                >
                  📸 Photo of Sludge Level {(currentStepState.photos || []).includes("sludge_level_evidence") ? "✅" : "(required)"}
                </button>
              </div>
            )}

            {/* PSI Reading Input + Evidence Photo */}
            {currentStepDef.hasPsiReading && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-text-primary">🔧 PSI Reading</p>
                <input
                  type="text"
                  value={currentStepState.psiReading || ""}
                  onChange={(e) => updateStepField("psiReading", e.target.value)}
                  placeholder="e.g., 25 PSI"
                  className="w-full p-3 rounded-lg border border-border bg-bg-body text-sm text-text-primary"
                />
                <input
                  ref={psiPhotoRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleEvidenceFileSelected(e, "psi_reading_evidence")}
                />
                <button
                  onClick={() => handleEvidencePhoto(psiPhotoRef)}
                  disabled={uploadingPhoto}
                  className="w-full py-2 rounded-lg border border-dashed border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium flex items-center justify-center gap-1 active:scale-[0.98] transition-transform"
                >
                  📸 Photo of PSI Gauge {(currentStepState.photos || []).includes("psi_reading_evidence") ? "✅" : "(required)"}
                </button>
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
                    onClick={() => {
                      updateStepField("findings", opt.value);
                      // Auto-select all parts when changing to non-OK
                      if (opt.value !== "ok" && currentStepDef?.parts?.length) {
                        const allPartNames = currentStepDef.parts.map((p) => p.name);
                        updateStepField("selectedParts", allPartNames);
                      } else if (opt.value === "ok") {
                        updateStepField("selectedParts", []);
                      }
                    }}
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
