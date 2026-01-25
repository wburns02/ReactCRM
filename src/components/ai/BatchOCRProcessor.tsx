/**
 * Batch OCR Processor Component
 * Process multiple historical documents at once using R730 LLaVA OCR
 */
import { useState, useCallback, useRef } from "react";
import {
  FileText,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Trash2,
  Play,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  useLocalAIHealth,
  useBatchOCRMutation,
  useBatchJobStatus,
  useBatchJobResults,
} from "@/hooks/useLocalAI";
import { fileToBase64, isValidDocumentFile } from "@/api/localAI";

interface BatchOCRProcessorProps {
  onComplete?: (results: BatchOCRResult[]) => void;
  onExport?: (results: BatchOCRResult[]) => void;
  className?: string;
  maxDocuments?: number;
}

interface QueuedDocument {
  id: string;
  file: File;
  preview?: string;
  status: "pending" | "uploading" | "processing" | "complete" | "failed";
  error?: string;
}

interface BatchOCRResult {
  document_id: string;
  filename: string;
  status: "success" | "failed";
  extraction: Record<string, unknown> | null;
  processing_time: number;
}

type DocumentType =
  | "service_record"
  | "invoice"
  | "permit"
  | "inspection"
  | "contract";

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "service_record", label: "Service Records" },
  { value: "invoice", label: "Invoices" },
  { value: "permit", label: "Permits" },
  { value: "inspection", label: "Inspection Reports" },
  { value: "contract", label: "Contracts" },
];

/**
 * Batch OCR processor for digitizing historical documents
 */
export function BatchOCRProcessor({
  onComplete,
  onExport,
  className = "",
  maxDocuments = 100,
}: BatchOCRProcessorProps) {
  const [documents, setDocuments] = useState<QueuedDocument[]>([]);
  const [documentType, setDocumentType] =
    useState<DocumentType>("service_record");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: aiHealth } = useLocalAIHealth();
  const batchMutation = useBatchOCRMutation();
  const { data: jobStatus } = useBatchJobStatus(activeJobId);
  const { data: jobResults } = useBatchJobResults(
    activeJobId,
    jobStatus?.status === "completed",
  );

  const isAIAvailable =
    aiHealth?.status === "healthy" || aiHealth?.status === "degraded";
  const isProcessing =
    jobStatus?.status === "processing" || jobStatus?.status === "pending";

  // Handle file selection
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      setError(null);

      // Validate total count
      if (documents.length + files.length > maxDocuments) {
        setError(`Maximum ${maxDocuments} documents allowed per batch`);
        return;
      }

      const newDocs: QueuedDocument[] = [];

      for (const file of files) {
        if (!isValidDocumentFile(file)) {
          setError(
            `Invalid file type: ${file.name}. Use JPEG, PNG, TIFF, or PDF.`,
          );
          continue;
        }

        const preview = file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined;

        newDocs.push({
          id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          preview,
          status: "pending",
        });
      }

      setDocuments((prev) => [...prev, ...newDocs]);

      // Clear input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [documents.length, maxDocuments],
  );

  // Remove a document from queue
  const removeDocument = useCallback((id: string) => {
    setDocuments((prev) => {
      const doc = prev.find((d) => d.id === id);
      if (doc?.preview) {
        URL.revokeObjectURL(doc.preview);
      }
      return prev.filter((d) => d.id !== id);
    });
  }, []);

  // Clear all documents
  const clearAll = useCallback(() => {
    documents.forEach((doc) => {
      if (doc.preview) {
        URL.revokeObjectURL(doc.preview);
      }
    });
    setDocuments([]);
    setActiveJobId(null);
    setError(null);
  }, [documents]);

  // Start batch processing
  const startProcessing = useCallback(async () => {
    if (documents.length === 0) {
      setError("No documents to process");
      return;
    }

    setError(null);

    try {
      // Convert files to base64
      const documentsWithBase64 = await Promise.all(
        documents.map(async (doc) => {
          const base64 = await fileToBase64(doc.file);
          return {
            id: doc.id,
            image_base64: base64,
            filename: doc.file.name,
          };
        }),
      );

      // Start batch job
      const result = await batchMutation.mutateAsync({
        documents: documentsWithBase64,
        documentType,
      });

      setActiveJobId(result.job_id);

      // Update document statuses
      setDocuments((prev) =>
        prev.map((doc) => ({
          ...doc,
          status: "processing" as const,
        })),
      );
    } catch (err) {
      console.error("Batch start error:", err);
      setError("Failed to start batch processing. Please try again.");
    }
  }, [documents, documentType, batchMutation]);

  // Export results to CSV
  const exportResults = useCallback(() => {
    if (!jobResults?.results) return;

    // Create CSV content
    const headers = [
      "Filename",
      "Status",
      "Customer Name",
      "Address",
      "Phone",
      "Date",
      "Amount",
      "Notes",
    ];
    const rows = jobResults.results.map((r) => {
      const ext = r.extraction || {};
      const data =
        (ext as Record<string, Record<string, string>>).extracted_data || {};
      return [
        r.filename,
        r.status,
        data.customer_name || "",
        data.address || "",
        data.phone || "",
        data.date || "",
        data.amount || "",
        (data.notes || "").replace(/,/g, ";"),
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch-ocr-results-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    if (onExport) {
      onExport(jobResults.results);
    }
  }, [jobResults, onExport]);

  // Trigger onComplete when job finishes
  if (jobResults?.status === "completed" && onComplete) {
    onComplete(jobResults.results);
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Batch Document OCR
          </span>
          <div className="flex items-center gap-2">
            {aiHealth && (
              <Badge variant={isAIAvailable ? "success" : "secondary"}>
                {isAIAvailable ? "LLaVA Ready" : "AI Offline"}
              </Badge>
            )}
            {documents.length > 0 && (
              <Badge variant="secondary">{documents.length} documents</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/30 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0" />
            <p className="text-xs text-danger">{error}</p>
          </div>
        )}

        {/* Document Type Selection */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Document Type
          </label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            disabled={isProcessing}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isProcessing
              ? "border-border bg-bg-muted cursor-not-allowed"
              : "border-primary/30 hover:border-primary/50 cursor-pointer"
          }`}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/tiff,application/pdf"
            onChange={handleFileSelect}
            disabled={isProcessing}
            className="hidden"
          />
          <Upload className="w-8 h-8 mx-auto mb-2 text-text-muted" />
          <p className="text-sm text-text-secondary">
            {isProcessing
              ? "Processing in progress..."
              : "Click or drag files to upload"}
          </p>
          <p className="text-xs text-text-muted mt-1">
            JPEG, PNG, TIFF, or PDF (max {maxDocuments} files)
          </p>
        </div>

        {/* Document Queue */}
        {documents.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-text-secondary uppercase">
                Document Queue
              </h4>
              {!isProcessing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="text-xs text-text-muted hover:text-danger"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 p-2 bg-bg-muted rounded text-sm"
                >
                  {doc.preview ? (
                    <img
                      src={doc.preview}
                      alt={doc.file.name}
                      className="w-8 h-8 object-cover rounded"
                    />
                  ) : (
                    <FileText className="w-8 h-8 text-text-muted" />
                  )}
                  <span className="flex-1 truncate text-text-primary">
                    {doc.file.name}
                  </span>
                  <span className="text-xs text-text-muted">
                    {(doc.file.size / 1024).toFixed(0)} KB
                  </span>
                  {doc.status === "pending" && !isProcessing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(doc.id)}
                      className="h-6 w-6 p-0 text-text-muted hover:text-danger"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  )}
                  {doc.status === "processing" && (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  )}
                  {doc.status === "complete" && (
                    <CheckCircle className="w-4 h-4 text-success" />
                  )}
                  {doc.status === "failed" && (
                    <XCircle className="w-4 h-4 text-danger" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Processing Status */}
        {jobStatus && (
          <div className="p-3 bg-bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-primary">
                {jobStatus.status === "pending" && "Starting..."}
                {jobStatus.status === "processing" && "Processing..."}
                {jobStatus.status === "completed" && "Complete!"}
                {jobStatus.status === "failed" && "Failed"}
              </span>
              <span className="text-xs text-text-muted">
                {jobStatus.processed}/{jobStatus.total_documents}
              </span>
            </div>
            <div className="w-full bg-border rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  jobStatus.status === "completed"
                    ? "bg-success"
                    : jobStatus.status === "failed"
                      ? "bg-danger"
                      : "bg-primary"
                }`}
                style={{
                  width: `${(jobStatus.processed / jobStatus.total_documents) * 100}%`,
                }}
              />
            </div>
            {jobStatus.processing_time_seconds && (
              <div className="flex items-center gap-1 mt-2 text-xs text-text-muted">
                <Clock className="w-3 h-3" />
                {jobStatus.processing_time_seconds.toFixed(1)}s total
              </div>
            )}
          </div>
        )}

        {/* Results Summary */}
        {jobResults && (
          <div className="p-3 bg-bg-muted rounded-lg space-y-2">
            <h4 className="text-sm font-medium text-text-primary">Results</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-bg-card rounded">
                <p className="text-lg font-bold text-text-primary">
                  {jobResults.total_documents}
                </p>
                <p className="text-xs text-text-muted">Total</p>
              </div>
              <div className="p-2 bg-success/10 rounded">
                <p className="text-lg font-bold text-success">
                  {
                    jobResults.results.filter((r) => r.status === "success")
                      .length
                  }
                </p>
                <p className="text-xs text-text-muted">Success</p>
              </div>
              <div className="p-2 bg-danger/10 rounded">
                <p className="text-lg font-bold text-danger">
                  {jobResults.failed}
                </p>
                <p className="text-xs text-text-muted">Failed</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={exportResults}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Results (CSV)
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!activeJobId && (
            <Button
              variant="primary"
              className="flex-1"
              disabled={
                !isAIAvailable ||
                documents.length === 0 ||
                batchMutation.isPending
              }
              onClick={startProcessing}
            >
              {batchMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Preparing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Processing ({documents.length})
                </>
              )}
            </Button>
          )}
          {activeJobId && jobStatus?.status === "completed" && (
            <Button variant="outline" className="flex-1" onClick={clearAll}>
              Process More Documents
            </Button>
          )}
        </div>

        <p className="text-xs text-text-muted text-center">
          Powered by LLaVA vision model on R730 ML Workstation
        </p>
      </CardContent>
    </Card>
  );
}

export default BatchOCRProcessor;
