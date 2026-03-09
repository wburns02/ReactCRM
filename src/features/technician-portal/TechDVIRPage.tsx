import { useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";
import { SignaturePad } from "@/components/SignaturePad.tsx";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Truck,
  ChevronDown,
  ChevronUp,
  Plus,
  PenLine,
  AlertTriangle,
  Shield,
  Wrench,
  FileCheck,
  Info,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────

interface ChecklistItem {
  key: string;
  label: string;
  cfrRef?: string; // CFR reference if federally mandated
  status: "pass" | "fail" | "na";
}

interface RepairCertification {
  mechanicName: string;
  mechanicSignature: string;
  repairDate: string;
  repairNotes: string;
}

interface ReviewCertification {
  reviewerName: string;
  reviewerSignature: string;
  reviewDate: string;
  repairsVerified: boolean;
}

interface DVIRRecord {
  id: string;
  date: string;
  inspectionType: "pre-trip" | "post-trip";
  // Vehicle identification
  carrierName: string;
  truckNumber: string;
  tractorNumber: string;
  trailerNumbers: string;
  vin: string;
  licensePlate: string;
  odometer: string;
  location: string;
  // Checklists
  fmcsaChecklist: ChecklistItem[];
  septicChecklist: ChecklistItem[];
  // Condition report
  overallResult: "SATISFACTORY" | "DEFECTS_NOTED" | "UNSAFE";
  defectNotes: string;
  conditionStatement: "no_defects" | "defects_noted" | "defects_need_correction";
  // Driver certification
  driverConfirmed: boolean;
  driverName: string;
  driverSignature: string;
  driverLicense: string;
  // Repair & review chain
  repairCert: RepairCertification | null;
  reviewCert: ReviewCertification | null;
}

// ── Constants ────────────────────────────────────────────────

const STORAGE_KEY = "dvir_inspections";
const CARRIER_NAME = "MAC Septic Services";
const RETENTION_DAYS = 90; // 49 CFR 396.11 requires 3 months

// FMCSA mandated inspection items per 49 CFR 396.11(a)(1)
const FMCSA_CHECKLIST_DEFAULTS: Omit<ChecklistItem, "status">[] = [
  { key: "service_brakes", label: "Service Brakes (including trailer brake connections)", cfrRef: "396.11(a)(1)(i)" },
  { key: "parking_brake", label: "Parking (Hand) Brake", cfrRef: "396.11(a)(1)(ii)" },
  { key: "steering", label: "Steering Mechanism", cfrRef: "396.11(a)(1)(iii)" },
  { key: "lighting", label: "Lighting Devices and Reflectors", cfrRef: "396.11(a)(1)(iv)" },
  { key: "tires", label: "Tires", cfrRef: "396.11(a)(1)(v)" },
  { key: "horn", label: "Horn", cfrRef: "396.11(a)(1)(vi)" },
  { key: "wipers", label: "Windshield Wipers", cfrRef: "396.11(a)(1)(vii)" },
  { key: "mirrors", label: "Rear Vision Mirrors", cfrRef: "396.11(a)(1)(viii)" },
  { key: "coupling", label: "Coupling Devices", cfrRef: "396.11(a)(1)(ix)" },
  { key: "wheels_rims", label: "Wheels and Rims", cfrRef: "396.11(a)(1)(x)" },
  { key: "emergency_equipment", label: "Emergency Equipment (fire extinguisher, spare fuses, warning devices)", cfrRef: "396.11(a)(1)(xi)" },
];

// Company-specific septic equipment (beyond FMCSA requirements)
const SEPTIC_CHECKLIST_DEFAULTS: Omit<ChecklistItem, "status">[] = [
  { key: "vacuum_pump", label: "Vacuum Pump Operational" },
  { key: "hoses_connections", label: "Hoses and Connections Secure" },
  { key: "tank_integrity", label: "Tank Integrity (no cracks or leaks)" },
  { key: "pto", label: "PTO (Power Take-Off)" },
  { key: "valves_fittings", label: "Valves and Fittings" },
  { key: "pressure_gauge", label: "Pressure / Vacuum Gauge" },
  { key: "spill_kit", label: "Spill Kit On Board" },
];

// ── Helpers ──────────────────────────────────────────────────

function loadInspections(): DVIRRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const records = JSON.parse(raw) as DVIRRecord[];
    // Purge records older than retention period
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    return records.filter((r) => new Date(r.date).getTime() > cutoff);
  } catch {
    return [];
  }
}

function saveInspections(records: DVIRRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function generateId(): string {
  return `dvir_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function initChecklist(
  defaults: Omit<ChecklistItem, "status">[],
): ChecklistItem[] {
  return defaults.map((item) => ({ ...item, status: "pass" as const }));
}

function getMostRecentDVIR(records: DVIRRecord[]): DVIRRecord | null {
  if (records.length === 0) return null;
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  return sorted[0];
}

// ── Toggle Button ────────────────────────────────────────────

function PassFailToggle({
  status,
  onToggle,
}: {
  status: "pass" | "fail" | "na";
  onToggle: (newStatus: "pass" | "fail" | "na") => void;
}) {
  return (
    <div className="flex gap-1">
      <button
        type="button"
        onClick={() => onToggle("pass")}
        className={`
          flex items-center gap-1 px-2.5 py-1 rounded-l-lg text-xs font-semibold
          transition-colors duration-150 border
          ${
            status === "pass"
              ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700"
              : "bg-bg-surface text-text-muted border-border hover:bg-bg-muted/50"
          }
        `}
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        OK
      </button>
      <button
        type="button"
        onClick={() => onToggle("fail")}
        className={`
          flex items-center gap-1 px-2.5 py-1 text-xs font-semibold
          transition-colors duration-150 border-y
          ${
            status === "fail"
              ? "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700"
              : "bg-bg-surface text-text-muted border-border hover:bg-bg-muted/50"
          }
        `}
      >
        <XCircle className="w-3.5 h-3.5" />
        Defect
      </button>
      <button
        type="button"
        onClick={() => onToggle("na")}
        className={`
          flex items-center gap-1 px-2.5 py-1 rounded-r-lg text-xs font-semibold
          transition-colors duration-150 border
          ${
            status === "na"
              ? "bg-gray-200 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
              : "bg-bg-surface text-text-muted border-border hover:bg-bg-muted/50"
          }
        `}
      >
        N/A
      </button>
    </div>
  );
}

// ── Checklist Section ────────────────────────────────────────

function ChecklistSection({
  title,
  subtitle,
  items,
  onToggle,
}: {
  title: string;
  subtitle?: string;
  items: ChecklistItem[];
  onToggle: (key: string, status: "pass" | "fail" | "na") => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-1">
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs text-text-muted mb-3">{subtitle}</p>
      )}
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.key}
            className={`
              flex items-center justify-between px-3 py-2.5 rounded-lg border
              ${
                item.status === "fail"
                  ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20"
                  : "border-border bg-bg-surface"
              }
            `}
          >
            <div className="flex-1 min-w-0 mr-3">
              <span className="text-sm font-medium text-text-primary">
                {item.label}
              </span>
              {item.cfrRef && (
                <span className="ml-1.5 text-[10px] text-text-muted">
                  [{item.cfrRef}]
                </span>
              )}
            </div>
            <PassFailToggle
              status={item.status}
              onToggle={(s) => onToggle(item.key, s)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Previous DVIR Review ─────────────────────────────────────

function PreviousDVIRReview({
  previousDVIR,
  onAcknowledge,
}: {
  previousDVIR: DVIRRecord;
  onAcknowledge: (name: string, signature: string) => void;
}) {
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerSignature, setReviewerSignature] = useState("");
  const [repairsVerified, setRepairsVerified] = useState(false);

  const hasDefects = previousDVIR.overallResult !== "SATISFACTORY";
  const failedItems = [
    ...previousDVIR.fmcsaChecklist.filter((i) => i.status === "fail"),
    ...previousDVIR.septicChecklist.filter((i) => i.status === "fail"),
  ];

  const handleAcknowledge = () => {
    if (!reviewerName.trim()) {
      toastError("Please type your name to acknowledge the review.");
      return;
    }
    if (!reviewerSignature) {
      toastError("Please sign to acknowledge the previous DVIR review.");
      return;
    }
    if (hasDefects && !repairsVerified) {
      toastError("You must verify that all noted repairs have been completed or the vehicle is unsafe to operate.");
      return;
    }
    onAcknowledge(reviewerName.trim(), reviewerSignature);
  };

  return (
    <Card>
      <CardContent className="py-5 space-y-4">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="text-sm font-bold uppercase tracking-wide">
            Previous DVIR Review Required (49 CFR 396.13)
          </h3>
        </div>

        <p className="text-sm text-text-secondary">
          Before operating this vehicle, you must review the most recent Driver
          Vehicle Inspection Report filed on{" "}
          <strong>{formatDate(previousDVIR.date)}</strong> for vehicle{" "}
          <strong>{previousDVIR.truckNumber}</strong>.
        </p>

        {hasDefects && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-3 space-y-2">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              Defects were noted on the previous DVIR:
            </p>
            <ul className="text-sm text-red-600 dark:text-red-300 space-y-1 list-disc pl-5">
              {failedItems.map((item) => (
                <li key={item.key}>{item.label}</li>
              ))}
            </ul>
            {previousDVIR.defectNotes && (
              <p className="text-sm text-red-600 dark:text-red-300 italic">
                Notes: {previousDVIR.defectNotes}
              </p>
            )}

            {previousDVIR.repairCert ? (
              <div className="mt-2 p-2 rounded bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-sm">
                <p className="text-green-700 dark:text-green-400 font-medium">
                  Repairs certified by: {previousDVIR.repairCert.mechanicName} on{" "}
                  {formatDate(previousDVIR.repairCert.repairDate)}
                </p>
                {previousDVIR.repairCert.repairNotes && (
                  <p className="text-green-600 dark:text-green-300 mt-1">
                    {previousDVIR.repairCert.repairNotes}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm font-bold text-red-700 dark:text-red-400 mt-1">
                No repair certification on file. Do not operate this vehicle
                until repairs are completed and certified.
              </p>
            )}

            <label className="flex items-start gap-3 cursor-pointer mt-3">
              <input
                type="checkbox"
                checked={repairsVerified}
                onChange={(e) => setRepairsVerified(e.target.checked)}
                className="mt-0.5 h-5 w-5 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-text-secondary leading-snug">
                I have reviewed the above defects and certify that repairs have
                been completed satisfactorily, OR I am reporting that the vehicle
                condition is satisfactory for operation.
              </span>
            </label>
          </div>
        )}

        {!hasDefects && (
          <div className="p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
            <p className="text-sm text-green-700 dark:text-green-400 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              No defects were reported on the previous DVIR.
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">
            Your Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            placeholder="Type your full legal name"
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {reviewerSignature ? (
          <div className="space-y-2">
            <div className="border-2 border-green-300 dark:border-green-700 rounded-lg p-2 bg-white">
              <img
                src={reviewerSignature}
                alt="Reviewer signature"
                className="w-full h-[120px] object-contain"
              />
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                Signature captured
              </span>
              <button
                type="button"
                onClick={() => setReviewerSignature("")}
                className="ml-auto text-xs text-text-muted hover:text-red-500 transition-colors"
              >
                Re-sign
              </button>
            </div>
          </div>
        ) : (
          <SignaturePad
            onSignature={(b64) => setReviewerSignature(b64)}
            height={120}
          />
        )}

        <Button variant="primary" size="lg" className="w-full" onClick={handleAcknowledge}>
          <FileCheck className="w-4 h-4" />
          Acknowledge Previous DVIR and Proceed
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Repair Certification Form ────────────────────────────────

function RepairCertForm({
  dvir,
  onCertify,
}: {
  dvir: DVIRRecord;
  onCertify: (cert: RepairCertification) => void;
}) {
  const [mechanicName, setMechanicName] = useState("");
  const [mechanicSignature, setMechanicSignature] = useState("");
  const [repairNotes, setRepairNotes] = useState("");

  const failedItems = [
    ...dvir.fmcsaChecklist.filter((i) => i.status === "fail"),
    ...dvir.septicChecklist.filter((i) => i.status === "fail"),
  ];

  const handleCertify = () => {
    if (!mechanicName.trim()) {
      toastError("Mechanic name is required.");
      return;
    }
    if (!mechanicSignature) {
      toastError("Mechanic signature is required.");
      return;
    }
    onCertify({
      mechanicName: mechanicName.trim(),
      mechanicSignature,
      repairDate: new Date().toISOString(),
      repairNotes: repairNotes.trim(),
    });
  };

  return (
    <Card>
      <CardContent className="py-5 space-y-4">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <Wrench className="w-5 h-5" />
          <h3 className="text-sm font-bold uppercase tracking-wide">
            Repair Certification (49 CFR 396.11(b)(2))
          </h3>
        </div>

        <p className="text-sm text-text-secondary">
          The following defects were reported on {formatDate(dvir.date)} for
          vehicle <strong>{dvir.truckNumber}</strong>:
        </p>

        <ul className="text-sm text-red-600 dark:text-red-300 space-y-1 list-disc pl-5">
          {failedItems.map((item) => (
            <li key={item.key}>{item.label}</li>
          ))}
        </ul>
        {dvir.defectNotes && (
          <p className="text-sm text-text-secondary italic">
            Driver notes: {dvir.defectNotes}
          </p>
        )}

        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">
            Describe Repairs Performed <span className="text-red-500">*</span>
          </label>
          <textarea
            value={repairNotes}
            onChange={(e) => setRepairNotes(e.target.value)}
            rows={3}
            placeholder="Describe all repairs completed for each defect..."
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <div className="rounded-lg border border-border bg-bg-muted/30 p-3">
          <p className="text-xs text-text-secondary leading-relaxed">
            I hereby certify that the above-listed defects have been repaired
            and/or that repair is unnecessary to the safe operation of this
            vehicle, in accordance with 49 CFR 396.11(b)(2).
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">
            Mechanic / Authorized Representative Name{" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={mechanicName}
            onChange={(e) => setMechanicName(e.target.value)}
            placeholder="Full legal name"
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {mechanicSignature ? (
          <div className="space-y-2">
            <div className="border-2 border-green-300 dark:border-green-700 rounded-lg p-2 bg-white">
              <img
                src={mechanicSignature}
                alt="Mechanic signature"
                className="w-full h-[120px] object-contain"
              />
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                Signature captured
              </span>
              <button
                type="button"
                onClick={() => setMechanicSignature("")}
                className="ml-auto text-xs text-text-muted hover:text-red-500 transition-colors"
              >
                Re-sign
              </button>
            </div>
          </div>
        ) : (
          <SignaturePad
            onSignature={(b64) => setMechanicSignature(b64)}
            height={120}
          />
        )}

        <Button variant="primary" size="lg" className="w-full" onClick={handleCertify}>
          <Wrench className="w-4 h-4" />
          Certify Repairs Complete
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Inspection Form ──────────────────────────────────────────

function InspectionForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (record: DVIRRecord) => void;
  onCancel: () => void;
}) {
  const [inspectionType, setInspectionType] = useState<"pre-trip" | "post-trip">("pre-trip");
  const [truckNumber, setTruckNumber] = useState("");
  const [tractorNumber, setTractorNumber] = useState("");
  const [trailerNumbers, setTrailerNumbers] = useState("");
  const [vin, setVin] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [odometer, setOdometer] = useState("");
  const [location, setLocation] = useState("");
  const [driverLicense, setDriverLicense] = useState("");
  const [fmcsaChecklist, setFmcsaChecklist] = useState<ChecklistItem[]>(
    () => initChecklist(FMCSA_CHECKLIST_DEFAULTS),
  );
  const [septicChecklist, setSepticChecklist] = useState<ChecklistItem[]>(
    () => initChecklist(SEPTIC_CHECKLIST_DEFAULTS),
  );
  const [defectNotes, setDefectNotes] = useState("");
  const [conditionStatement, setConditionStatement] = useState<
    "no_defects" | "defects_noted" | "defects_need_correction"
  >("no_defects");
  const [driverConfirmed, setDriverConfirmed] = useState(false);
  const [driverName, setDriverName] = useState("");
  const [driverSignature, setDriverSignature] = useState("");

  const failedFmcsa = useMemo(
    () => fmcsaChecklist.filter((i) => i.status === "fail"),
    [fmcsaChecklist],
  );
  const failedSeptic = useMemo(
    () => septicChecklist.filter((i) => i.status === "fail"),
    [septicChecklist],
  );
  const hasDefects = failedFmcsa.length > 0 || failedSeptic.length > 0;

  const overallResult: DVIRRecord["overallResult"] = useMemo(() => {
    if (conditionStatement === "defects_need_correction") return "UNSAFE";
    if (hasDefects || conditionStatement === "defects_noted") return "DEFECTS_NOTED";
    return "SATISFACTORY";
  }, [hasDefects, conditionStatement]);

  const toggleFmcsaItem = useCallback((key: string, status: "pass" | "fail" | "na") => {
    setFmcsaChecklist((prev) =>
      prev.map((item) => (item.key === key ? { ...item, status } : item)),
    );
  }, []);

  const toggleSepticItem = useCallback((key: string, status: "pass" | "fail" | "na") => {
    setSepticChecklist((prev) =>
      prev.map((item) => (item.key === key ? { ...item, status } : item)),
    );
  }, []);

  const handleSubmit = useCallback(() => {
    if (!truckNumber.trim()) {
      toastError("Vehicle / Truck number is required.");
      return;
    }
    if (!driverConfirmed) {
      toastError("You must check the driver certification statement.");
      return;
    }
    if (!driverName.trim()) {
      toastError("Driver's full legal name is required.");
      return;
    }
    if (!driverSignature) {
      toastError("Driver signature is required.");
      return;
    }
    if (hasDefects && !defectNotes.trim()) {
      toastError("Defect notes are required when defects are reported.");
      return;
    }

    const record: DVIRRecord = {
      id: generateId(),
      date: new Date().toISOString(),
      inspectionType,
      carrierName: CARRIER_NAME,
      truckNumber: truckNumber.trim(),
      tractorNumber: tractorNumber.trim(),
      trailerNumbers: trailerNumbers.trim(),
      vin: vin.trim(),
      licensePlate: licensePlate.trim(),
      odometer: odometer.trim(),
      location: location.trim(),
      fmcsaChecklist,
      septicChecklist,
      overallResult,
      defectNotes: defectNotes.trim(),
      conditionStatement,
      driverConfirmed,
      driverName: driverName.trim(),
      driverSignature,
      driverLicense: driverLicense.trim(),
      repairCert: null,
      reviewCert: null,
    };

    onSubmit(record);
  }, [
    inspectionType, truckNumber, tractorNumber, trailerNumbers, vin,
    licensePlate, odometer, location, driverLicense, fmcsaChecklist,
    septicChecklist, overallResult, defectNotes, conditionStatement,
    driverConfirmed, driverName, driverSignature, hasDefects, onSubmit,
  ]);

  return (
    <Card>
      <CardContent className="py-5 space-y-6">
        {/* Regulation Notice */}
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            <strong>FMCSA Compliant DVIR</strong> &mdash; This form complies
            with 49 CFR 396.11 (Driver Vehicle Inspection Reports) and 49 CFR
            396.13 (Driver Inspection). Records retained for 90 days per federal
            requirements. Electronic signatures authorized per FMCSA final rule
            effective March 23, 2026.
          </p>
        </div>

        {/* Inspection Type */}
        <div>
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-3">
            Inspection Type
          </h3>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setInspectionType("pre-trip")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                inspectionType === "pre-trip"
                  ? "bg-primary text-white border-primary"
                  : "bg-bg-surface text-text-secondary border-border hover:bg-bg-muted/50"
              }`}
            >
              Pre-Trip
            </button>
            <button
              type="button"
              onClick={() => setInspectionType("post-trip")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                inspectionType === "post-trip"
                  ? "bg-primary text-white border-primary"
                  : "bg-bg-surface text-text-secondary border-border hover:bg-bg-muted/50"
              }`}
            >
              Post-Trip
            </button>
          </div>
        </div>

        {/* Vehicle & Carrier Identification */}
        <div>
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Vehicle Identification
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Motor Carrier
              </label>
              <input
                type="text"
                value={CARRIER_NAME}
                disabled
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-muted/50 text-text-secondary text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Vehicle / Truck # <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={truckNumber}
                onChange={(e) => setTruckNumber(e.target.value)}
                placeholder="e.g. T-101"
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Tractor #
              </label>
              <input
                type="text"
                value={tractorNumber}
                onChange={(e) => setTractorNumber(e.target.value)}
                placeholder="If applicable"
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Trailer #(s)
              </label>
              <input
                type="text"
                value={trailerNumbers}
                onChange={(e) => setTrailerNumbers(e.target.value)}
                placeholder="If applicable"
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                VIN
              </label>
              <input
                type="text"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                placeholder="Vehicle identification number"
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                License Plate
              </label>
              <input
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="e.g. ABC-1234"
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Odometer
              </label>
              <input
                type="text"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                placeholder="Current mileage"
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Yard, address, or GPS location"
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* FMCSA Mandatory Inspection Items */}
        <ChecklistSection
          title="FMCSA Required Inspection Items"
          subtitle="Per 49 CFR 396.11(a)(1) - All items must be inspected"
          items={fmcsaChecklist}
          onToggle={toggleFmcsaItem}
        />

        {/* Company Septic Equipment */}
        <ChecklistSection
          title="Septic Equipment (Company Policy)"
          subtitle="Additional company-required equipment checks"
          items={septicChecklist}
          onToggle={toggleSepticItem}
        />

        {/* Defect Notes */}
        {hasDefects && (
          <div>
            <label className="block text-sm font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Defect Description (Required)
            </label>
            <p className="text-xs text-text-muted mb-2">
              Describe each defect or deficiency that would affect the safe
              operation of the vehicle or result in its mechanical breakdown.
            </p>
            <textarea
              value={defectNotes}
              onChange={(e) => setDefectNotes(e.target.value)}
              rows={4}
              placeholder="Describe each defect in detail. Include location, severity, and whether the vehicle is safe to operate..."
              className="w-full px-3 py-2 rounded-lg border border-red-300 dark:border-red-700 bg-bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
          </div>
        )}

        {/* Vehicle Condition Statement */}
        <div>
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-3">
            Vehicle Condition Statement
          </h3>
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-bg-muted/30 transition-colors">
              <input
                type="radio"
                name="condition"
                checked={conditionStatement === "no_defects"}
                onChange={() => setConditionStatement("no_defects")}
                className="mt-0.5 h-4 w-4 text-primary focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium text-text-primary">
                  No Defects or Deficiencies
                </span>
                <p className="text-xs text-text-muted mt-0.5">
                  Vehicle is in satisfactory condition.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-amber-200 dark:border-amber-800 hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-colors">
              <input
                type="radio"
                name="condition"
                checked={conditionStatement === "defects_noted"}
                onChange={() => setConditionStatement("defects_noted")}
                className="mt-0.5 h-4 w-4 text-primary focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Defects Noted — Vehicle Operable
                </span>
                <p className="text-xs text-text-muted mt-0.5">
                  Defects found but vehicle can be safely operated. Repairs
                  should be scheduled.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50/30 dark:hover:bg-red-950/10 transition-colors">
              <input
                type="radio"
                name="condition"
                checked={conditionStatement === "defects_need_correction"}
                onChange={() => setConditionStatement("defects_need_correction")}
                className="mt-0.5 h-4 w-4 text-primary focus:ring-primary"
              />
              <div>
                <span className="text-sm font-medium text-red-700 dark:text-red-400">
                  Defects Require Correction Before Operation
                </span>
                <p className="text-xs text-text-muted mt-0.5">
                  Vehicle is UNSAFE to operate until defects are repaired.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Overall Result Badge */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-bg-muted/50">
          <span className="text-sm font-semibold text-text-secondary">
            Overall Result:
          </span>
          <Badge
            variant={
              overallResult === "SATISFACTORY"
                ? "success"
                : overallResult === "DEFECTS_NOTED"
                  ? "warning"
                  : "danger"
            }
            size="lg"
          >
            {overallResult.replace("_", " ")}
          </Badge>
        </div>

        {/* Driver Certification */}
        <div className="rounded-lg border border-border bg-bg-muted/20 p-4 space-y-4">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wide flex items-center gap-2">
            <PenLine className="w-4 h-4" />
            Driver Certification
          </h3>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={driverConfirmed}
              onChange={(e) => setDriverConfirmed(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-text-secondary leading-snug">
              I certify that I have prepared this report and that, to the best of
              my knowledge, it is true and correct. I have personally conducted
              this inspection in accordance with 49 CFR 396.11 and 49 CFR 396.13.
              I understand that any defects or deficiencies listed may affect the
              safe operation of this motor vehicle and that federal regulations
              prohibit operating an unsafe vehicle.
            </span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Driver Full Legal Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="First and last name"
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                CDL / Driver License #
              </label>
              <input
                type="text"
                value={driverLicense}
                onChange={(e) => setDriverLicense(e.target.value)}
                placeholder="License number"
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-2">
              Driver Signature <span className="text-red-500">*</span>
            </label>
            {driverSignature ? (
              <div className="space-y-2">
                <div className="border-2 border-green-300 dark:border-green-700 rounded-lg p-2 bg-white">
                  <img
                    src={driverSignature}
                    alt="Driver signature"
                    className="w-full h-[150px] object-contain"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                    Signature captured
                  </span>
                  <button
                    type="button"
                    onClick={() => setDriverSignature("")}
                    className="ml-auto text-xs text-text-muted hover:text-red-500 transition-colors"
                  >
                    Re-sign
                  </button>
                </div>
              </div>
            ) : (
              <SignaturePad
                onSignature={(base64) => setDriverSignature(base64)}
                height={150}
              />
            )}
          </div>

          <p className="text-[11px] text-text-muted leading-relaxed">
            Date and time of signature: {new Date().toLocaleString("en-US")}.
            This electronic signature is legally binding under 49 CFR 396.11
            and the FMCSA eDVIR final rule.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="primary" size="lg" className="flex-1" onClick={handleSubmit}>
            <ClipboardCheck className="w-4 h-4" />
            Submit DVIR
          </Button>
          <Button variant="outline" size="lg" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── History Row ──────────────────────────────────────────────

function HistoryRow({
  record,
  onCertifyRepair,
}: {
  record: DVIRRecord;
  onCertifyRepair: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const needsRepairCert =
    record.overallResult !== "SATISFACTORY" && !record.repairCert;

  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-muted/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-text-primary">
              {formatDate(record.date)}
            </span>
            <Badge
              variant={
                record.overallResult === "SATISFACTORY"
                  ? "success"
                  : record.overallResult === "DEFECTS_NOTED"
                    ? "warning"
                    : "danger"
              }
              size="sm"
            >
              {(record.overallResult || "PASS").replace("_", " ")}
            </Badge>
            <Badge
              variant="default"
              size="sm"
            >
              {record.inspectionType === "post-trip" ? "Post-Trip" : "Pre-Trip"}
            </Badge>
            {needsRepairCert && (
              <Badge variant="danger" size="sm">
                Needs Repair Cert
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <Truck className="w-3 h-3" />
              {record.truckNumber}
            </span>
            {record.odometer && <span>Odo: {record.odometer}</span>}
            {record.driverName && <span>Driver: {record.driverName}</span>}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-text-muted shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Vehicle info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-text-muted">Carrier:</span>{" "}
              <span className="font-medium text-text-primary">
                {record.carrierName || CARRIER_NAME}
              </span>
            </div>
            <div>
              <span className="text-text-muted">Vehicle #:</span>{" "}
              <span className="font-medium text-text-primary">
                {record.truckNumber}
              </span>
            </div>
            <div>
              <span className="text-text-muted">VIN:</span>{" "}
              <span className="font-medium text-text-primary">
                {record.vin || "--"}
              </span>
            </div>
            <div>
              <span className="text-text-muted">License Plate:</span>{" "}
              <span className="font-medium text-text-primary">
                {record.licensePlate || "--"}
              </span>
            </div>
            <div>
              <span className="text-text-muted">Odometer:</span>{" "}
              <span className="font-medium text-text-primary">
                {record.odometer || "--"}
              </span>
            </div>
            <div>
              <span className="text-text-muted">Location:</span>{" "}
              <span className="font-medium text-text-primary">
                {record.location || "--"}
              </span>
            </div>
          </div>

          {/* FMCSA checklist */}
          {record.fmcsaChecklist && (
            <div>
              <p className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-1.5">
                FMCSA Items (49 CFR 396.11)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {record.fmcsaChecklist.map((item) => (
                  <span
                    key={item.key}
                    className={`
                      inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
                      ${
                        item.status === "pass"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : item.status === "fail"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }
                    `}
                  >
                    {item.status === "pass" ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : item.status === "fail" ? (
                      <XCircle className="w-3 h-3" />
                    ) : null}
                    {item.label.split("(")[0].trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Septic checklist */}
          {record.septicChecklist && (
            <div>
              <p className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-1.5">
                Septic Equipment
              </p>
              <div className="flex flex-wrap gap-1.5">
                {record.septicChecklist.map((item) => (
                  <span
                    key={item.key}
                    className={`
                      inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
                      ${
                        item.status === "pass"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : item.status === "fail"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }
                    `}
                  >
                    {item.status === "pass" ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : item.status === "fail" ? (
                      <XCircle className="w-3 h-3" />
                    ) : null}
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Defect notes */}
          {record.defectNotes && (
            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-1">
                Defect Description
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                {record.defectNotes}
              </p>
            </div>
          )}

          {/* Driver Signature */}
          <div className="px-3 py-2 rounded-lg bg-bg-muted/50 border border-border">
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-2">
              Driver Certification
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-2">
              <div>
                <span className="text-text-muted">Driver:</span>{" "}
                <span className="font-semibold">{record.driverName || "--"}</span>
              </div>
              <div>
                <span className="text-text-muted">CDL #:</span>{" "}
                <span className="font-medium">{record.driverLicense || "--"}</span>
              </div>
            </div>
            {record.driverSignature && (
              <div className="bg-white rounded border border-border p-1 inline-block">
                <img
                  src={record.driverSignature}
                  alt={`Signature of ${record.driverName || "driver"}`}
                  className="h-[60px] object-contain"
                />
              </div>
            )}
          </div>

          {/* Repair Certification */}
          {record.repairCert && (
            <div className="px-3 py-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wide mb-2">
                Repair Certification (49 CFR 396.11(b)(2))
              </p>
              <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                <p>Certified by: <strong>{record.repairCert.mechanicName}</strong></p>
                <p>Date: {formatDate(record.repairCert.repairDate)}</p>
                {record.repairCert.repairNotes && (
                  <p>Repairs: {record.repairCert.repairNotes}</p>
                )}
              </div>
              {record.repairCert.mechanicSignature && (
                <div className="bg-white rounded border border-green-300 p-1 inline-block mt-2">
                  <img
                    src={record.repairCert.mechanicSignature}
                    alt={`Mechanic signature`}
                    className="h-[50px] object-contain"
                  />
                </div>
              )}
            </div>
          )}

          {/* Review Certification */}
          {record.reviewCert && (
            <div className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">
                Next-Driver Review (49 CFR 396.13)
              </p>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <p>Reviewed by: <strong>{record.reviewCert.reviewerName}</strong></p>
                <p>Date: {formatDate(record.reviewCert.reviewDate)}</p>
              </div>
            </div>
          )}

          {/* Certify Repairs Button */}
          {needsRepairCert && (
            <Button
              variant="outline"
              size="md"
              className="w-full"
              onClick={() => onCertifyRepair(record.id)}
            >
              <Wrench className="w-4 h-4" />
              Certify Repairs for This DVIR
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

export function TechDVIRPage() {
  const [showForm, setShowForm] = useState(false);
  const [certifyingRepairId, setCertifyingRepairId] = useState<string | null>(null);
  const [inspections, setInspections] = useState<DVIRRecord[]>(
    () => loadInspections(),
  );
  const [previousDVIRReviewed, setPreviousDVIRReviewed] = useState(false);

  const sortedInspections = useMemo(
    () => [...inspections].sort((a, b) => b.date.localeCompare(a.date)),
    [inspections],
  );

  const mostRecentDVIR = useMemo(
    () => getMostRecentDVIR(inspections),
    [inspections],
  );

  // Check if previous DVIR needs review before starting new inspection
  const needsPreviousReview = useMemo(() => {
    if (!mostRecentDVIR || previousDVIRReviewed) return false;
    // Only require review if previous DVIR had defects and was filed today or recently
    const lastDate = new Date(mostRecentDVIR.date);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24 && mostRecentDVIR.overallResult !== "SATISFACTORY";
  }, [mostRecentDVIR, previousDVIRReviewed]);

  const handleSubmit = useCallback((record: DVIRRecord) => {
    setInspections((prev) => {
      const updated = [record, ...prev];
      saveInspections(updated);
      return updated;
    });
    setShowForm(false);
    setPreviousDVIRReviewed(false);
    toastSuccess("DVIR submitted and filed. Record retained for 90 days per 49 CFR 396.11.");
  }, []);

  const handleCancel = useCallback(() => {
    setShowForm(false);
  }, []);

  const handlePreviousDVIRAcknowledged = useCallback(
    (name: string, signature: string) => {
      if (!mostRecentDVIR) return;
      // Save review cert on the previous DVIR
      setInspections((prev) => {
        const updated = prev.map((r) =>
          r.id === mostRecentDVIR.id
            ? {
                ...r,
                reviewCert: {
                  reviewerName: name,
                  reviewerSignature: signature,
                  reviewDate: new Date().toISOString(),
                  repairsVerified: true,
                },
              }
            : r,
        );
        saveInspections(updated);
        return updated;
      });
      setPreviousDVIRReviewed(true);
      toastSuccess("Previous DVIR review acknowledged.");
    },
    [mostRecentDVIR],
  );

  const handleRepairCert = useCallback(
    (cert: RepairCertification) => {
      if (!certifyingRepairId) return;
      setInspections((prev) => {
        const updated = prev.map((r) =>
          r.id === certifyingRepairId ? { ...r, repairCert: cert } : r,
        );
        saveInspections(updated);
        return updated;
      });
      setCertifyingRepairId(null);
      toastSuccess("Repair certification recorded per 49 CFR 396.11(b)(2).");
    },
    [certifyingRepairId],
  );

  const certifyingDVIR = useMemo(
    () => inspections.find((r) => r.id === certifyingRepairId) || null,
    [inspections, certifyingRepairId],
  );

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4 pb-20">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Driver Vehicle Inspection Report
            </h1>
            <p className="text-sm text-text-muted flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              49 CFR 396.11 / 396.13 Compliant
            </p>
          </div>
        </div>
        {!showForm && !certifyingRepairId && (
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowForm(true)}
          >
            <Plus className="w-4 h-4" />
            New DVIR
          </Button>
        )}
      </div>

      {/* Previous DVIR Review Gate */}
      {showForm && needsPreviousReview && mostRecentDVIR && (
        <PreviousDVIRReview
          previousDVIR={mostRecentDVIR}
          onAcknowledge={handlePreviousDVIRAcknowledged}
        />
      )}

      {/* Repair Certification Form */}
      {certifyingDVIR && (
        <RepairCertForm
          dvir={certifyingDVIR}
          onCertify={handleRepairCert}
        />
      )}

      {/* Inspection Form */}
      {showForm && !needsPreviousReview && !certifyingRepairId && (
        <InspectionForm onSubmit={handleSubmit} onCancel={handleCancel} />
      )}

      {/* Retention Notice */}
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-bg-muted/50 border border-border">
        <Info className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
        <p className="text-xs text-text-muted leading-relaxed">
          DVIRs are retained for 90 days per 49 CFR 396.11. Older records are
          automatically purged. The motor carrier must maintain the original of
          each DVIR, the certification of repairs, and the certification of the
          driver's review for a period of three months from the date the report
          was prepared.
        </p>
      </div>

      {/* History */}
      <Card>
        <CardContent className="py-5">
          <h2 className="text-lg font-bold text-text-primary mb-3">
            DVIR History (90-Day Retention)
          </h2>

          {sortedInspections.length === 0 ? (
            <div className="py-8 text-center">
              <ClipboardCheck className="w-10 h-10 text-text-muted mx-auto mb-2" />
              <p className="text-text-secondary text-sm">
                No DVIRs on file.
              </p>
              <p className="text-text-muted text-xs mt-1">
                Tap "New DVIR" to file a Driver Vehicle Inspection Report.
              </p>
            </div>
          ) : (
            <div>
              {sortedInspections.map((record) => (
                <HistoryRow
                  key={record.id}
                  record={record}
                  onCertifyRepair={setCertifyingRepairId}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
