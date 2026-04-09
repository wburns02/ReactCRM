import { useState, useEffect } from "react";
import {
  useGenerateInspectionLetter,
  useApproveInspectionLetter,
  useSendInspectionLetter,
  type AILetterDraft,
} from "@/api/hooks/useTechPortal.ts";
import { toastSuccess, toastInfo } from "@/components/ui/Toast.tsx";

const SIGNERS = [
  { value: "Douglas Carter, EVP", label: "Douglas Carter — EVP" },
  { value: "Matthew Carter, President", label: "Matthew Carter — President" },
  { value: "Marvin A. Carter, Founder", label: "Marvin A. Carter — Founder" },
];

type LetterState = "none" | "draft" | "approved" | "sent";

interface Props {
  jobId: string;
  inspection: Record<string, unknown>;
  customerName?: string;
  customerEmail?: string;
  existingLetter?: AILetterDraft;
}

function getOverallCondition(inspection: Record<string, unknown>): string {
  const summary = inspection.summary as Record<string, unknown> | undefined;
  if (summary?.overall_condition) return summary.overall_condition as string;
  return "unknown";
}

function conditionBadge(condition: string) {
  const lower = condition.toLowerCase();
  if (lower.includes("good") || lower.includes("pass"))
    return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
  if (lower.includes("fair") || lower.includes("attention") || lower.includes("marginal"))
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
  if (lower.includes("poor") || lower.includes("fail") || lower.includes("critical"))
    return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
}

function findingDot(findings?: string) {
  if (findings === "critical") return "bg-red-500";
  if (findings === "needs_attention") return "bg-yellow-500";
  return "bg-green-500";
}

export function InspectionLetterPanel({
  jobId,
  inspection,
  customerName,
  customerEmail,
  existingLetter,
}: Props) {
  const generateMutation = useGenerateInspectionLetter();
  const approveMutation = useApproveInspectionLetter();
  const sendMutation = useSendInspectionLetter();

  const [editedBody, setEditedBody] = useState("");
  const [signer, setSigner] = useState(SIGNERS[0].value);
  const [letterState, setLetterState] = useState<LetterState>("none");
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Hydrate from existing letter data
  useEffect(() => {
    if (!existingLetter) return;
    if (existingLetter.sent_at) {
      setLetterState("sent");
      setSentTo(existingLetter.sent_to ?? null);
      setEditedBody(existingLetter.approved_body ?? existingLetter.body ?? "");
      if (existingLetter.signer) setSigner(existingLetter.signer);
      if (existingLetter.document_id) setDocumentId(existingLetter.document_id);
    } else if (existingLetter.document_id) {
      setLetterState("approved");
      setDocumentId(existingLetter.document_id);
      setEditedBody(existingLetter.approved_body ?? existingLetter.body ?? "");
      if (existingLetter.signer) setSigner(existingLetter.signer);
    } else if (existingLetter.body) {
      setLetterState("draft");
      setEditedBody(existingLetter.body);
      if (existingLetter.signer) setSigner(existingLetter.signer);
    }
  }, [existingLetter]);

  const handleGenerate = async () => {
    const result = await generateMutation.mutateAsync(jobId);
    setEditedBody(result.body);
    setLetterState("draft");
    setPdfBase64(null);
    setDocumentId(null);
    toastInfo("AI letter draft ready — review and edit before approving");
  };

  const handleApprove = async () => {
    const result = await approveMutation.mutateAsync({
      jobId,
      editedBody,
      signer,
    });
    setPdfBase64(result.pdf_base64);
    setDocumentId(result.document_id);
    setLetterState("approved");
  };

  const handleDownloadPDF = () => {
    if (!pdfBase64) return;
    const byteChars = atob(pdfBase64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inspection-letter-${jobId.slice(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toastSuccess("PDF downloaded");
  };

  const handleSend = async () => {
    const result = await sendMutation.mutateAsync(jobId);
    setSentTo(result.sent_to);
    setLetterState("sent");
  };

  // ─── Right-side inspection reference data ─────────────────────────

  const condition = getOverallCondition(inspection);
  const steps = (inspection.steps ?? {}) as Record<
    string,
    { status?: string; findings?: string; notes?: string }
  >;
  const summary = (inspection.summary ?? {}) as Record<string, unknown>;
  const recommendations = (summary.recommendations ?? []) as string[];

  return (
    <div className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-blue-700 rounded-xl p-4">
      <div className="text-center mb-3">
        <span className="text-3xl">📝</span>
        <h4 className="font-bold text-text-primary text-lg mt-1">AI Inspection Letter</h4>
        <p className="text-xs text-text-secondary mt-1">
          Generate a professional inspection letter for the buyer
        </p>
      </div>

      {/* ─── State: NONE — generate button ───────────────────────── */}
      {letterState === "none" && (
        <button
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-base hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {generateMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span> Generating AI Letter...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">🤖 Generate AI Letter</span>
          )}
        </button>
      )}

      {/* ─── State: DRAFT — editor + reference ───────────────────── */}
      {letterState === "draft" && (
        <div className="space-y-3">
          {/* Side-by-side on desktop, stacked on mobile */}
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Left: editable letter */}
            <div className="lg:w-[60%] w-full space-y-2">
              <label className="text-sm font-semibold text-text-primary">Letter Body</label>
              <textarea
                value={editedBody}
                onChange={(e) => setEditedBody(e.target.value)}
                rows={18}
                className="w-full rounded-lg border border-border bg-white dark:bg-gray-900 text-text-primary text-sm p-3 resize-y focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
              />
              <div className="space-y-2">
                <label className="text-sm font-semibold text-text-primary">Signer</label>
                <select
                  value={signer}
                  onChange={(e) => setSigner(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white dark:bg-gray-900 text-text-primary text-sm p-2"
                >
                  {SIGNERS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right: inspection reference */}
            <div className="lg:w-[40%] w-full space-y-3">
              <div className="rounded-lg border border-border bg-white/60 dark:bg-gray-900/60 p-3 space-y-3">
                <h5 className="text-sm font-semibold text-text-primary">Inspection Reference</h5>

                {/* Customer */}
                {customerName && (
                  <div className="text-xs text-text-secondary">
                    <span className="font-medium text-text-primary">Buyer:</span> {customerName}
                    {customerEmail && <span className="ml-1">({customerEmail})</span>}
                  </div>
                )}

                {/* Overall condition */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-text-primary">Condition:</span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${conditionBadge(condition)}`}
                  >
                    {condition}
                  </span>
                </div>

                {/* Step results */}
                <div className="space-y-1">
                  <span className="text-xs font-medium text-text-primary">Steps:</span>
                  {Object.entries(steps).map(([key, step]) => (
                    <div key={key} className="flex items-center gap-2 text-xs text-text-secondary">
                      <span
                        className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${findingDot(step.findings)}`}
                      />
                      <span className="flex-1 truncate">
                        Step {key}: {step.status ?? "pending"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Notes from steps */}
                {Object.entries(steps).some(([, s]) => s.notes) && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-text-primary">Notes:</span>
                    {Object.entries(steps)
                      .filter(([, s]) => s.notes)
                      .map(([key, s]) => (
                        <p key={key} className="text-xs text-text-secondary pl-2 border-l-2 border-blue-300">
                          Step {key}: {s.notes}
                        </p>
                      ))}
                  </div>
                )}

                {/* Recommendations */}
                {recommendations.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-text-primary">Recommendations:</span>
                    <ul className="list-disc list-inside text-xs text-text-secondary space-y-0.5">
                      {recommendations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="py-3 rounded-xl border-2 border-blue-300 bg-blue-50 text-sm font-bold text-blue-700 hover:bg-blue-100 active:scale-[0.98] transition-all disabled:opacity-50 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300"
            >
              {generateMutation.isPending ? "⏳ Regenerating..." : "🔄 Regenerate"}
            </button>
            <button
              onClick={handleApprove}
              disabled={approveMutation.isPending || !editedBody.trim()}
              className="py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {approveMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> Generating PDF...
                </span>
              ) : (
                "✅ Approve & Generate PDF"
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─── State: APPROVED — download + send ───────────────────── */}
      {letterState === "approved" && (
        <div className="space-y-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-center">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              ✅ Letter approved — PDF ready
            </p>
            {documentId && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Document ID: {documentId.slice(0, 8)}...
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {pdfBase64 && (
              <button
                onClick={handleDownloadPDF}
                className="py-3 rounded-xl border-2 border-blue-300 bg-blue-50 text-sm font-bold text-blue-700 hover:bg-blue-100 active:scale-[0.98] transition-all dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300"
              >
                📄 Download PDF
              </button>
            )}
            <button
              onClick={handleSend}
              disabled={sendMutation.isPending || !customerEmail}
              className={`py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 ${!pdfBase64 ? "col-span-2" : ""}`}
            >
              {sendMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> Sending...
                </span>
              ) : customerEmail ? (
                "📧 Send to Buyer"
              ) : (
                "📧 No Email on File"
              )}
            </button>
          </div>

          {/* Allow going back to edit */}
          <button
            onClick={() => setLetterState("draft")}
            className="w-full py-2 rounded-lg text-xs font-medium text-text-secondary hover:bg-bg-hover active:scale-[0.98] transition-all"
          >
            ✏️ Edit Letter
          </button>
        </div>
      )}

      {/* ─── State: SENT — confirmation ──────────────────────────── */}
      {letterState === "sent" && (
        <div className="space-y-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-center">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              ✅ Letter sent to {sentTo ?? customerEmail ?? "buyer"}
            </p>
          </div>
          {pdfBase64 && (
            <button
              onClick={handleDownloadPDF}
              className="w-full py-3 rounded-xl border-2 border-blue-300 bg-blue-50 text-sm font-bold text-blue-700 hover:bg-blue-100 active:scale-[0.98] transition-all dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300"
            >
              📄 Download PDF Copy
            </button>
          )}
          <button
            onClick={() => {
              setLetterState("draft");
              setPdfBase64(null);
              setDocumentId(null);
            }}
            className="w-full py-2 rounded-lg text-xs font-medium text-text-secondary hover:bg-bg-hover active:scale-[0.98] transition-all"
          >
            🔄 Create New Letter
          </button>
        </div>
      )}
    </div>
  );
}
