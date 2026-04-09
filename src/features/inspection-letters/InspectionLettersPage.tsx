import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardCheck,
  FileText,
  Send,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  ExternalLink,
  ArrowLeft,
  Download,
  RefreshCw,
} from "lucide-react";
import { toastSuccess, toastError, toastInfo } from "@/components/ui/Toast.tsx";

// ── Types ──────────────────────────────────────────────

interface LetterQueueItem {
  id: string;
  work_order_number: string | null;
  customer_name: string;
  customer_email: string | null;
  address: string;
  scheduled_date: string | null;
  status: string | null;
  letter_status: string;
  has_inspection_data: boolean;
  overall_condition: string | null;
  sent_at: string | null;
  sent_to: string | null;
}

type FilterTab = "all" | "needs_letter" | "draft" | "sent";

interface StandaloneFormData {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address: string;
  inspection_date: string;
  inspection_time: string;
  tank_location: string;
  tank_depth: string;
  permit_info: string;
  installation_year: string;
  system_type: string;
  tank_capacity: string;
  flow_type: string;
  condition: string;
  pumped: boolean;
  baffles: string;
  operational_test: string;
  drain_field: string;
  notable_observations: string;
  pump_info: string;
  pump_chamber: string;
  homeowner_present: boolean;
  signer: string;
}

const INITIAL_FORM: StandaloneFormData = {
  customer_name: "",
  customer_email: "",
  customer_phone: "",
  address: "",
  inspection_date: new Date().toISOString().split("T")[0],
  inspection_time: "12:00 PM CST",
  tank_location: "",
  tank_depth: "",
  permit_info: "",
  installation_year: "",
  system_type: "Standard septic system with one tank gravity flow",
  tank_capacity: "1000 gallons",
  flow_type: "gravity",
  condition: "good",
  pumped: false,
  baffles: "",
  operational_test: "",
  drain_field: "No signs of leaching up or super saturation. System appears to be functioning properly overall.",
  notable_observations: "",
  pump_info: "",
  pump_chamber: "",
  homeowner_present: false,
  signer: "douglas_carter",
};

const SIGNERS = [
  { key: "douglas_carter", label: "Douglas Carter — EVP" },
  { key: "matthew_carter", label: "Matthew Carter — President" },
  { key: "marvin_carter", label: "Marvin A. Carter — Founder" },
];

// ── Hooks ─────────────────────────────────────────────

function useInspectionLetterQueue() {
  return useQuery({
    queryKey: ["inspection-letters", "queue"],
    queryFn: async () => {
      const { data } = await apiClient.get(
        "/work-orders/inspection-letters/queue",
      );
      return data as { items: LetterQueueItem[]; total: number };
    },
  });
}

function useGenerateStandaloneLetter() {
  return useMutation({
    mutationFn: async (form: StandaloneFormData) => {
      const { data } = await apiClient.post(
        "/work-orders/inspection-letters/standalone/generate",
        form,
      );
      return data as { body: string; generated_at: string; model: string; status: string; error?: string; form_data: Record<string, string> };
    },
    onError: () => toastError("Failed to generate letter — try again"),
  });
}

function useGenerateWoLetter() {
  return useMutation({
    mutationFn: async (workOrderId: string) => {
      const { data } = await apiClient.post(
        `/work-orders/inspection-letters/${workOrderId}/generate`,
      );
      return data as { body: string; generated_at: string; model: string; status: string; error?: string; form_data: Record<string, string> };
    },
    onError: () => toastError("Failed to generate letter — try again"),
  });
}

function useGenerateWoPdf() {
  return useMutation({
    mutationFn: async ({ workOrderId, payload }: { workOrderId: string; payload: Record<string, unknown> }) => {
      const { data } = await apiClient.post(
        `/work-orders/inspection-letters/${workOrderId}/pdf`,
        payload,
      );
      return data as { pdf_base64: string; status: string };
    },
    onError: () => toastError("Failed to generate PDF"),
  });
}

function useSyncForms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post("/work-orders/inspection-letters/sync-forms");
      return data as { synced: number; skipped: number; errors: string[] };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["inspection-letters", "queue"] });
      if (data.synced > 0) {
        toastSuccess(`Synced ${data.synced} new inspection(s) from Forms`);
      } else {
        toastInfo("No new form responses to sync");
      }
    },
    onError: () => toastError("Forms sync failed — check MS365 config"),
  });
}

function useGenerateStandalonePdf() {
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.post(
        "/work-orders/inspection-letters/standalone/pdf",
        payload,
      );
      return data as { pdf_base64: string; status: string };
    },
    onError: () => toastError("Failed to generate PDF"),
  });
}

// ── Helpers ────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "--";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function LetterStatusBadge({ status, hasData }: { status: string; hasData: boolean }) {
  if (status === "sent")
    return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"><CheckCircle2 className="h-3 w-3" />Sent</span>;
  if (status === "approved")
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800"><CheckCircle2 className="h-3 w-3" />Ready</span>;
  if (status === "draft")
    return <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"><FileText className="h-3 w-3" />Draft</span>;
  if (!hasData)
    return <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">No Data</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800"><AlertCircle className="h-3 w-3" />Needs Letter</span>;
}

function ConditionBadge({ condition }: { condition: string | null }) {
  if (!condition)
    return <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">N/A</span>;
  const colors: Record<string, string> = { good: "bg-green-100 text-green-800", fair: "bg-amber-100 text-amber-800", poor: "bg-red-100 text-red-800", critical: "bg-red-100 text-red-800" };
  const cls = colors[condition.toLowerCase()] || "bg-gray-100 text-gray-600";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>{condition}</span>;
}

function WoStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-gray-400">--</span>;
  const colors: Record<string, string> = { completed: "bg-green-100 text-green-800", in_progress: "bg-blue-100 text-blue-800", scheduled: "bg-purple-100 text-purple-800", pending: "bg-amber-100 text-amber-800", cancelled: "bg-red-100 text-red-800" };
  const cls = colors[status] || "bg-gray-100 text-gray-600";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>{status.replace(/_/g, " ")}</span>;
}

function StatCard({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: React.ElementType }) {
  const colorMap: Record<string, string> = { blue: "border-blue-200 bg-blue-50 text-blue-600", amber: "border-amber-200 bg-amber-50 text-amber-600", indigo: "border-indigo-200 bg-indigo-50 text-indigo-600", green: "border-green-200 bg-green-50 text-green-600" };
  const cls = colorMap[color] || colorMap.blue;
  const textColor = cls.split(" ")[2];
  return (
    <div className={`rounded-lg border p-4 ${cls}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-gray-600">{label}</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
        </div>
        <Icon className={`h-8 w-8 ${textColor}`} />
      </div>
    </div>
  );
}

// ── Filter Tabs ────────────────────────────────────────

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "needs_letter", label: "Needs Letter" },
  { key: "draft", label: "Drafts" },
  { key: "sent", label: "Sent" },
];

// ── Standalone Letter Form ─────────────────────────────

function StandaloneLetterForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<StandaloneFormData>({ ...INITIAL_FORM });
  const [letterBody, setLetterBody] = useState("");
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "editor">("form");

  const generateMutation = useGenerateStandaloneLetter();
  const pdfMutation = useGenerateStandalonePdf();

  const updateField = (field: keyof StandaloneFormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    if (!form.customer_name || !form.address) {
      toastError("Customer name and address are required");
      return;
    }
    const result = await generateMutation.mutateAsync(form);
    if (result.error) {
      toastError(result.error);
      return;
    }
    setLetterBody(result.body);
    setStep("editor");
    toastInfo("AI letter draft generated — review and edit");
  };

  const handleApprove = async () => {
    const result = await pdfMutation.mutateAsync({
      letter_body: letterBody,
      customer_name: form.customer_name,
      customer_email: form.customer_email,
      customer_phone: form.customer_phone,
      address: form.address,
      inspection_date: form.inspection_date,
      inspection_time: form.inspection_time,
      signer: form.signer,
    });
    setPdfBase64(result.pdf_base64);
    toastSuccess("PDF generated!");
  };

  const handleDownload = () => {
    if (!pdfBase64) return;
    const binary = atob(pdfBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MAC-Septic-Inspection-Letter-${form.customer_name.replace(/\s+/g, "-")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (step === "editor") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep("form")} className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Review Letter — {form.customer_name}</h2>
            <p className="text-sm text-gray-500">{form.address}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* Editor */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Letter Body</label>
              <span className="text-xs text-gray-400">{letterBody.split(/\s+/).length} words</span>
            </div>
            <textarea
              value={letterBody}
              onChange={(e) => { setLetterBody(e.target.value); setPdfBase64(null); }}
              rows={18}
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm leading-relaxed resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="mt-2 flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500">Signer:</label>
              <select
                value={form.signer}
                onChange={(e) => { updateField("signer", e.target.value); setPdfBase64(null); }}
                className="text-xs rounded-md border border-gray-300 bg-white px-2 py-1"
              >
                {SIGNERS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Reference */}
          <div className="lg:col-span-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Form Data</label>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs space-y-2 max-h-[460px] overflow-y-auto">
              <div><span className="font-bold">Customer:</span> {form.customer_name}</div>
              <div><span className="font-bold">Address:</span> {form.address}</div>
              <div><span className="font-bold">Date:</span> {form.inspection_date} at {form.inspection_time}</div>
              {form.tank_location && <div><span className="font-bold">Tank Location:</span> {form.tank_location}</div>}
              {form.tank_depth && <div><span className="font-bold">Tank Depth:</span> {form.tank_depth}</div>}
              {form.permit_info && <div><span className="font-bold">Permit:</span> {form.permit_info}</div>}
              {form.installation_year && <div><span className="font-bold">Install Year:</span> {form.installation_year}</div>}
              <div><span className="font-bold">System:</span> {form.system_type}</div>
              <div><span className="font-bold">Capacity:</span> {form.tank_capacity}</div>
              <div><span className="font-bold">Flow:</span> {form.flow_type}</div>
              <div><span className="font-bold">Condition:</span> {form.condition}</div>
              <div><span className="font-bold">Pumped:</span> {form.pumped ? "Yes" : "No"}</div>
              {form.baffles && <div><span className="font-bold">Baffles:</span> {form.baffles}</div>}
              {form.notable_observations && <div><span className="font-bold">Notable:</span> {form.notable_observations}</div>}
              <div><span className="font-bold">Drain Field:</span> {form.drain_field}</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
          >
            {generateMutation.isPending ? "Regenerating..." : "Regenerate"}
          </button>
          {!pdfBase64 ? (
            <button
              onClick={handleApprove}
              disabled={pdfMutation.isPending || !letterBody.trim()}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {pdfMutation.isPending ? "Generating PDF..." : "Approve & Generate PDF"}
            </button>
          ) : (
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Back to Queue
          </button>
        </div>
      </div>
    );
  }

  // Step: form
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">New Inspection Letter</h2>
          <p className="text-sm text-gray-500">Enter inspection details to generate an AI letter</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-6">
        {/* Customer Info */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Customer Information</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name *</label>
              <input type="text" value={form.customer_name} onChange={(e) => updateField("customer_name", e.target.value)} placeholder="e.g., John Smith" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={form.customer_email} onChange={(e) => updateField("customer_email", e.target.value)} placeholder="customer@email.com" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input type="tel" value={form.customer_phone} onChange={(e) => updateField("customer_phone", e.target.value)} placeholder="(615) 555-1234" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
          </div>
        </div>

        {/* Inspection Info */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Inspection Details</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Inspection Address *</label>
              <input type="text" value={form.address} onChange={(e) => updateField("address", e.target.value)} placeholder="123 Main St, Nashville, TN 37027" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                <input type="date" value={form.inspection_date} onChange={(e) => updateField("inspection_date", e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
                <input type="text" value={form.inspection_time} onChange={(e) => updateField("inspection_time", e.target.value)} placeholder="12:00 PM CST" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Tank Info */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Tank & System</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tank Location</label>
              <input type="text" value={form.tank_location} onChange={(e) => updateField("tank_location", e.target.value)} placeholder="e.g., right side rear of house, ~15ft from crawl space" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tank Depth</label>
              <input type="text" value={form.tank_depth} onChange={(e) => updateField("tank_depth", e.target.value)} placeholder={`e.g., 12"`} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Permit / History Info</label>
              <input type="text" value={form.permit_info} onChange={(e) => updateField("permit_info", e.target.value)} placeholder="e.g., TDEC paperwork indicates installed 1985 as new construction" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Installation Year</label>
              <input type="text" value={form.installation_year} onChange={(e) => updateField("installation_year", e.target.value)} placeholder="e.g., 1994" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">System Type</label>
              <input type="text" value={form.system_type} onChange={(e) => updateField("system_type", e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Capacity</label>
                <input type="text" value={form.tank_capacity} onChange={(e) => updateField("tank_capacity", e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Flow Type</label>
                <select value={form.flow_type} onChange={(e) => updateField("flow_type", e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="gravity">Gravity</option>
                  <option value="forced">Forced Flow</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Inspection Results */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Inspection Results</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Overall Condition</label>
              <select value={form.condition} onChange={(e) => updateField("condition", e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="good">Good — no visible damage</option>
                <option value="fair">Fair — needs attention</option>
                <option value="poor">Poor — needs repair</option>
              </select>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.pumped} onChange={(e) => updateField("pumped", e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                Pumped during inspection
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.homeowner_present} onChange={(e) => updateField("homeowner_present", e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                Homeowner present
              </label>
            </div>
          </div>
          {form.pumped && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Baffles Observation</label>
                <input type="text" value={form.baffles} onChange={(e) => updateField("baffles", e.target.value)} placeholder="e.g., inlet and outlet baffles observed, good working order" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Operational Test</label>
                <input type="text" value={form.operational_test} onChange={(e) => updateField("operational_test", e.target.value)} placeholder="e.g., flushed toilets, ran sinks, normal inflow, no obstruction" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
          )}
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Drain Field Assessment</label>
            <input type="text" value={form.drain_field} onChange={(e) => updateField("drain_field", e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Notable Observations</label>
            <textarea value={form.notable_observations} onChange={(e) => updateField("notable_observations", e.target.value)} rows={3} placeholder="e.g., tank sits below front porch foundation, only outlet side accessible..." className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y" />
          </div>
          {form.flow_type === "forced" && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pump Info</label>
                <input type="text" value={form.pump_info} onChange={(e) => updateField("pump_info", e.target.value)} placeholder="e.g., Goulds WE1512HH, continuity/amperage tested OK" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pump Chamber</label>
                <input type="text" value={form.pump_chamber} onChange={(e) => updateField("pump_chamber", e.target.value)} placeholder="e.g., ~500 gallon pump chamber, 12&quot; beneath surface" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
          )}
        </div>

        {/* Signer */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Letter Signer</label>
          <select value={form.signer} onChange={(e) => updateField("signer", e.target.value)} className="w-full sm:w-auto rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            {SIGNERS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={generateMutation.isPending || !form.customer_name || !form.address}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {generateMutation.isPending ? (
          <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Generating AI Letter...</span>
        ) : (
          "Generate AI Letter"
        )}
      </button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────

// ── WO Letter Editor ───────────────────────────────────

function WoLetterEditor({ item, onClose }: { item: LetterQueueItem; onClose: () => void }) {
  const [letterBody, setLetterBody] = useState("");
  const [signer, setSigner] = useState("douglas_carter");
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const qc = useQueryClient();

  const generateMutation = useGenerateWoLetter();
  const pdfMutation = useGenerateWoPdf();

  const handleGenerate = async () => {
    const result = await generateMutation.mutateAsync(item.id);
    if (result.error) {
      toastError(result.error);
      return;
    }
    setLetterBody(result.body);
    toastInfo("AI letter draft generated — review and edit");
  };

  const handleApprove = async () => {
    const result = await pdfMutation.mutateAsync({
      workOrderId: item.id,
      payload: {
        letter_body: letterBody,
        customer_name: item.customer_name,
        customer_email: item.customer_email || "",
        address: item.address,
        inspection_date: item.scheduled_date || "",
        signer,
      },
    });
    setPdfBase64(result.pdf_base64);
    qc.invalidateQueries({ queryKey: ["inspection-letters", "queue"] });
    toastSuccess("PDF generated with photos!");
  };

  const handleDownload = () => {
    if (!pdfBase64) return;
    const binary = atob(pdfBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MAC-Septic-Inspection-Letter-${item.customer_name.replace(/\s+/g, "-")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Write Letter — {item.customer_name}</h2>
          <p className="text-sm text-gray-500">{item.address} | WO #{item.work_order_number || item.id.slice(0, 8)}</p>
        </div>
      </div>

      {!letterBody ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-blue-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Generate AI Letter</h3>
          <p className="mt-1 text-sm text-gray-500">
            The AI will read the inspection data from work order #{item.work_order_number || item.id.slice(0, 8)} and write a letter in Doug's style.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {generateMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating AI Letter...</>
            ) : (
              "Generate AI Letter"
            )}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Letter Body</label>
                <span className="text-xs text-gray-400">{letterBody.split(/\s+/).length} words</span>
              </div>
              <textarea
                value={letterBody}
                onChange={(e) => { setLetterBody(e.target.value); setPdfBase64(null); }}
                rows={20}
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm leading-relaxed resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="mt-2 flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500">Signer:</label>
                <select value={signer} onChange={(e) => { setSigner(e.target.value); setPdfBase64(null); }} className="text-xs rounded-md border border-gray-300 bg-white px-2 py-1">
                  {SIGNERS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div className="lg:col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Work Order Info</label>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs space-y-2">
                <div><span className="font-bold">Customer:</span> {item.customer_name}</div>
                <div><span className="font-bold">Email:</span> {item.customer_email || "N/A"}</div>
                <div><span className="font-bold">Address:</span> {item.address}</div>
                <div><span className="font-bold">Date:</span> {formatDate(item.scheduled_date)}</div>
                <div><span className="font-bold">WO Status:</span> {item.status}</div>
                <div><span className="font-bold">Condition:</span> {item.overall_condition || "N/A"}</div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleGenerate} disabled={generateMutation.isPending} className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50">
              {generateMutation.isPending ? "Regenerating..." : "Regenerate"}
            </button>
            {!pdfBase64 ? (
              <button onClick={handleApprove} disabled={pdfMutation.isPending || !letterBody.trim()} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                {pdfMutation.isPending ? "Generating PDF..." : "Approve & Generate PDF"}
              </button>
            ) : (
              <button onClick={handleDownload} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                <Download className="h-4 w-4" /> Download PDF
              </button>
            )}
            <button onClick={onClose} className="ml-auto rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Back to Queue
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────

export function InspectionLettersPage() {
  const { data, isLoading, error } = useInspectionLetterQueue();
  const syncMutation = useSyncForms();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [showNewLetter, setShowNewLetter] = useState(false);
  const [editingItem, setEditingItem] = useState<LetterQueueItem | null>(null);

  const items = data?.items ?? [];

  const stats = {
    total: items.length,
    needsLetter: items.filter((i) => i.letter_status === "none" && i.has_inspection_data).length,
    drafts: items.filter((i) => i.letter_status === "draft").length,
    sent: items.filter((i) => i.letter_status === "sent").length,
  };

  const filtered = items.filter((item) => {
    if (filter === "needs_letter") return item.letter_status === "none" && item.has_inspection_data;
    if (filter === "draft") return item.letter_status === "draft";
    if (filter === "sent") return item.letter_status === "sent";
    return true;
  });

  if (editingItem) {
    return (
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <WoLetterEditor item={editingItem} onClose={() => setEditingItem(null)} />
      </div>
    );
  }

  if (showNewLetter) {
    return (
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        <StandaloneLetterForm onClose={() => setShowNewLetter(false)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inspection Letters</h1>
          <p className="mt-1 text-sm text-gray-500">AI-powered inspection letter generation for real estate inspections</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            title="Pull latest responses from MS Forms"
          >
            <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            {syncMutation.isPending ? "Syncing..." : "Sync Forms"}
          </button>
          <button
            onClick={() => setShowNewLetter(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Letter
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Inspections" value={stats.total} color="blue" icon={ClipboardCheck} />
        <StatCard label="Needs Letter" value={stats.needsLetter} color="amber" icon={AlertCircle} />
        <StatCard label="Drafts" value={stats.drafts} color="indigo" icon={FileText} />
        <StatCard label="Sent" value={stats.sent} color="green" icon={Send} />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${filter === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            {tab.label}
            {tab.key === "needs_letter" && stats.needsLetter > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">{stats.needsLetter}</span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">Failed to load inspection letters queue.</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <ClipboardCheck className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No inspections found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === "all" ? "There are no real estate inspections yet." : `No inspections match the "${TABS.find((t) => t.key === filter)?.label}" filter.`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Customer</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 md:table-cell">Address</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell">WO Status</th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 lg:table-cell">Condition</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Letter</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{formatDate(item.scheduled_date)}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{item.customer_name}</div>
                    {item.customer_email && <div className="text-xs text-gray-500">{item.customer_email}</div>}
                  </td>
                  <td className="hidden max-w-xs truncate px-4 py-3 text-sm text-gray-500 md:table-cell">{item.address || "--"}</td>
                  <td className="hidden whitespace-nowrap px-4 py-3 sm:table-cell"><WoStatusBadge status={item.status} /></td>
                  <td className="hidden whitespace-nowrap px-4 py-3 lg:table-cell"><ConditionBadge condition={item.overall_condition} /></td>
                  <td className="whitespace-nowrap px-4 py-3"><LetterStatusBadge status={item.letter_status} hasData={item.has_inspection_data} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      <FileText className="h-3 w-3" />
                      {item.letter_status === "none" ? "Write Letter" : item.letter_status === "draft" ? "Edit Draft" : "View Letter"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
