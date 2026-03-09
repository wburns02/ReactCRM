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
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────

interface ChecklistItem {
  key: string;
  label: string;
  status: "pass" | "fail";
}

interface DVIRRecord {
  id: string;
  date: string;
  truckNumber: string;
  licensePlate: string;
  odometer: string;
  vehicleChecklist: ChecklistItem[];
  septicChecklist: ChecklistItem[];
  overallResult: "PASS" | "FAIL";
  defectNotes: string;
  driverConfirmed: boolean;
  driverName: string;
  driverSignature: string; // base64 PNG
}

// ── Constants ────────────────────────────────────────────────

const STORAGE_KEY = "dvir_inspections";

const VEHICLE_CHECKLIST_DEFAULTS: Omit<ChecklistItem, "status">[] = [
  { key: "tires_wheels", label: "Tires/Wheels" },
  { key: "brakes", label: "Brakes" },
  { key: "front_lights", label: "Front Lights" },
  { key: "rear_lights", label: "Rear Lights" },
  { key: "turn_signals", label: "Turn Signals/Hazards" },
  { key: "mirrors", label: "Mirrors" },
  { key: "horn", label: "Horn" },
  { key: "windshield_wipers", label: "Windshield Wipers" },
  { key: "steering", label: "Steering" },
  { key: "seatbelt", label: "Seatbelt" },
  { key: "fluid_levels", label: "Fluid Levels" },
  { key: "leaks", label: "Leaks" },
  { key: "body_damage", label: "Body Damage" },
  { key: "emergency_equipment", label: "Emergency Equipment" },
];

const SEPTIC_CHECKLIST_DEFAULTS: Omit<ChecklistItem, "status">[] = [
  { key: "vacuum_pump", label: "Vacuum Pump" },
  { key: "hoses_connections", label: "Hoses & Connections" },
  { key: "tank_integrity", label: "Tank Integrity" },
  { key: "pto", label: "PTO" },
  { key: "valves_fittings", label: "Valves & Fittings" },
  { key: "pressure_gauge", label: "Pressure Gauge" },
  { key: "spill_kit", label: "Spill Kit" },
];

// ── Helpers ──────────────────────────────────────────────────

function loadInspections(): DVIRRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DVIRRecord[];
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

// ── Toggle Button ────────────────────────────────────────────

function PassFailToggle({
  status,
  onToggle,
}: {
  status: "pass" | "fail";
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold
        transition-colors duration-150
        ${
          status === "pass"
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        }
      `}
    >
      {status === "pass" ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : (
        <XCircle className="w-4 h-4" />
      )}
      {status === "pass" ? "Pass" : "Fail"}
    </button>
  );
}

// ── Checklist Section ────────────────────────────────────────

function ChecklistSection({
  title,
  items,
  onToggle,
}: {
  title: string;
  items: ChecklistItem[];
  onToggle: (key: string) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-3">
        {title}
      </h3>
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
            <span className="text-sm font-medium text-text-primary">
              {item.label}
            </span>
            <PassFailToggle
              status={item.status}
              onToggle={() => onToggle(item.key)}
            />
          </div>
        ))}
      </div>
    </div>
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
  const [truckNumber, setTruckNumber] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [odometer, setOdometer] = useState("");
  const [vehicleChecklist, setVehicleChecklist] = useState<ChecklistItem[]>(
    () => initChecklist(VEHICLE_CHECKLIST_DEFAULTS),
  );
  const [septicChecklist, setSepticChecklist] = useState<ChecklistItem[]>(
    () => initChecklist(SEPTIC_CHECKLIST_DEFAULTS),
  );
  const [defectNotes, setDefectNotes] = useState("");
  const [driverConfirmed, setDriverConfirmed] = useState(false);
  const [driverName, setDriverName] = useState("");
  const [driverSignature, setDriverSignature] = useState("");

  const hasFailures = useMemo(() => {
    return (
      vehicleChecklist.some((i) => i.status === "fail") ||
      septicChecklist.some((i) => i.status === "fail")
    );
  }, [vehicleChecklist, septicChecklist]);

  const overallResult = hasFailures ? "FAIL" : "PASS";

  const toggleVehicleItem = useCallback((key: string) => {
    setVehicleChecklist((prev) =>
      prev.map((item) =>
        item.key === key
          ? { ...item, status: item.status === "pass" ? "fail" : "pass" }
          : item,
      ),
    );
  }, []);

  const toggleSepticItem = useCallback((key: string) => {
    setSepticChecklist((prev) =>
      prev.map((item) =>
        item.key === key
          ? { ...item, status: item.status === "pass" ? "fail" : "pass" }
          : item,
      ),
    );
  }, []);

  const handleSubmit = useCallback(() => {
    if (!truckNumber.trim()) {
      toastError("Truck # is required.");
      return;
    }
    if (!driverConfirmed) {
      toastError("You must confirm the driver inspection statement.");
      return;
    }
    if (!driverName.trim()) {
      toastError("Please type your full name.");
      return;
    }
    if (!driverSignature) {
      toastError("Please sign the inspection with your finger or mouse.");
      return;
    }

    const record: DVIRRecord = {
      id: generateId(),
      date: new Date().toISOString(),
      truckNumber: truckNumber.trim(),
      licensePlate: licensePlate.trim(),
      odometer: odometer.trim(),
      vehicleChecklist,
      septicChecklist,
      overallResult,
      defectNotes: defectNotes.trim(),
      driverConfirmed,
      driverName: driverName.trim(),
      driverSignature,
    };

    onSubmit(record);
  }, [
    truckNumber,
    licensePlate,
    odometer,
    vehicleChecklist,
    septicChecklist,
    overallResult,
    defectNotes,
    driverConfirmed,
    driverName,
    driverSignature,
    onSubmit,
  ]);

  return (
    <Card>
      <CardContent className="py-5 space-y-6">
        {/* Vehicle Info */}
        <div>
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-3">
            Vehicle Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">
                Truck # <span className="text-red-500">*</span>
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
                placeholder="e.g. 45,230"
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Vehicle Checklist */}
        <ChecklistSection
          title="Vehicle Checklist"
          items={vehicleChecklist}
          onToggle={toggleVehicleItem}
        />

        {/* Septic Equipment Checklist */}
        <ChecklistSection
          title="Septic Equipment"
          items={septicChecklist}
          onToggle={toggleSepticItem}
        />

        {/* Defect Notes (visible when any item fails) */}
        {hasFailures && (
          <div>
            <label className="block text-sm font-bold text-red-600 dark:text-red-400 mb-2">
              Defect Notes
            </label>
            <textarea
              value={defectNotes}
              onChange={(e) => setDefectNotes(e.target.value)}
              rows={3}
              placeholder="Describe all defects found..."
              className="w-full px-3 py-2 rounded-lg border border-red-300 dark:border-red-700 bg-bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
          </div>
        )}

        {/* Overall Result */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-bg-muted/50">
          <span className="text-sm font-semibold text-text-secondary">
            Overall Result:
          </span>
          <Badge
            variant={overallResult === "PASS" ? "success" : "danger"}
            size="lg"
          >
            {overallResult}
          </Badge>
        </div>

        {/* Driver Confirmation */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={driverConfirmed}
            onChange={(e) => setDriverConfirmed(e.target.checked)}
            className="mt-0.5 h-5 w-5 rounded border-border text-primary focus:ring-primary"
          />
          <span className="text-sm text-text-secondary leading-snug">
            I confirm that I have personally inspected this vehicle and all
            equipment. The information above is accurate.
          </span>
        </label>

        {/* Driver Signature */}
        <div>
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-3 flex items-center gap-2">
            <PenLine className="w-4 h-4" />
            Driver Signature
          </h3>

          {/* Printed Name */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-text-muted mb-1">
              Full Name (printed) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="Type your full name"
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Signature Pad */}
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

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="primary" size="lg" className="flex-1" onClick={handleSubmit}>
            Submit Inspection
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

function HistoryRow({ record }: { record: DVIRRecord }) {
  const [expanded, setExpanded] = useState(false);

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
              variant={record.overallResult === "PASS" ? "success" : "danger"}
              size="sm"
            >
              {record.overallResult}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <Truck className="w-3 h-3" />
              {record.truckNumber}
            </span>
            {record.odometer && <span>Odo: {record.odometer}</span>}
            {record.defectNotes && (
              <span className="text-red-500 truncate max-w-[200px]">
                {record.defectNotes}
              </span>
            )}
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
              <span className="text-text-muted">Truck #:</span>{" "}
              <span className="font-medium text-text-primary">
                {record.truckNumber}
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
          </div>

          {/* Vehicle checklist details */}
          <div>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-1.5">
              Vehicle Checklist
            </p>
            <div className="flex flex-wrap gap-1.5">
              {record.vehicleChecklist.map((item) => (
                <span
                  key={item.key}
                  className={`
                    inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
                    ${
                      item.status === "pass"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }
                  `}
                >
                  {item.status === "pass" ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          {/* Septic checklist details */}
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
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }
                  `}
                >
                  {item.status === "pass" ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          {/* Defect notes */}
          {record.defectNotes && (
            <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-1">
                Defect Notes
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                {record.defectNotes}
              </p>
            </div>
          )}

          {/* Driver Signature */}
          {(record.driverName || record.driverSignature) && (
            <div className="px-3 py-2 rounded-lg bg-bg-muted/50 border border-border">
              <p className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-2">
                Driver Signature
              </p>
              {record.driverName && (
                <p className="text-sm text-text-primary mb-2">
                  <span className="text-text-muted">Signed by:</span>{" "}
                  <span className="font-semibold">{record.driverName}</span>
                </p>
              )}
              {record.driverSignature && (
                <div className="bg-white rounded border border-border p-1 inline-block">
                  <img
                    src={record.driverSignature}
                    alt={`Signature of ${record.driverName || "driver"}`}
                    className="h-[80px] object-contain"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────

export function TechDVIRPage() {
  const [showForm, setShowForm] = useState(false);
  const [inspections, setInspections] = useState<DVIRRecord[]>(
    () => loadInspections(),
  );

  const sortedInspections = useMemo(
    () => [...inspections].sort((a, b) => b.date.localeCompare(a.date)),
    [inspections],
  );

  const handleSubmit = useCallback((record: DVIRRecord) => {
    setInspections((prev) => {
      const updated = [record, ...prev];
      saveInspections(updated);
      return updated;
    });
    setShowForm(false);
    toastSuccess("DVIR submitted successfully.");
  }, []);

  const handleCancel = useCallback(() => {
    setShowForm(false);
  }, []);

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4 pb-20">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              DVIR - Pre-Trip Inspection
            </h1>
            <p className="text-sm text-text-muted">
              Driver Vehicle Inspection Report
            </p>
          </div>
        </div>
        {!showForm && (
          <Button
            variant="primary"
            size="md"
            onClick={() => setShowForm(true)}
          >
            <Plus className="w-4 h-4" />
            New Inspection
          </Button>
        )}
      </div>

      {/* Inspection Form */}
      {showForm && (
        <InspectionForm onSubmit={handleSubmit} onCancel={handleCancel} />
      )}

      {/* History */}
      <Card>
        <CardContent className="py-5">
          <h2 className="text-lg font-bold text-text-primary mb-3">
            Inspection History
          </h2>

          {sortedInspections.length === 0 ? (
            <div className="py-8 text-center">
              <ClipboardCheck className="w-10 h-10 text-text-muted mx-auto mb-2" />
              <p className="text-text-secondary text-sm">
                No inspections recorded yet.
              </p>
              <p className="text-text-muted text-xs mt-1">
                Tap "New Inspection" to file your first DVIR.
              </p>
            </div>
          ) : (
            <div>
              {sortedInspections.map((record) => (
                <HistoryRow key={record.id} record={record} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
