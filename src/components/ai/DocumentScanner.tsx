/**
 * Document Scanner Component
 * Upload and extract data from documents using LLaVA OCR on R730
 */
import { useState, useCallback, useRef } from "react";
import {
  FileText,
  Upload,
  X,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Copy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useDocumentOCR, useLocalAIHealth } from "@/hooks/useLocalAI";
import type { DocumentOCRResult } from "@/api/localAI";

interface DocumentScannerProps {
  documentType?: string;
  onExtractionComplete?: (result: DocumentOCRResult) => void;
  className?: string;
}

const DOCUMENT_TYPES = [
  { value: "service_record", label: "Service Record" },
  { value: "invoice", label: "Invoice" },
  { value: "permit", label: "Permit" },
  { value: "inspection", label: "Inspection Report" },
  { value: "contract", label: "Service Contract" },
] as const;

/**
 * Document scanner with OCR data extraction
 */
export function DocumentScanner({
  documentType: initialType = "service_record",
  onExtractionComplete,
  className = "",
}: DocumentScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedType, setSelectedType] = useState(initialType);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: aiHealth } = useLocalAIHealth();
  const { isExtracting, result, error, preview, extractDocument, reset } =
    useDocumentOCR();

  const isAIAvailable =
    aiHealth?.status === "healthy" || aiHealth?.status === "degraded";

  // Handle file selection
  const handleFileSelect = useCallback(
    async (file: File) => {
      const extractionResult = await extractDocument(file, selectedType);
      if (extractionResult && onExtractionComplete) {
        onExtractionComplete(extractionResult);
      }
    },
    [extractDocument, selectedType, onExtractionComplete],
  );

  // Handle file input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  // Copy field value to clipboard
  const copyToClipboard = useCallback(async (field: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      console.error("Failed to copy to clipboard");
    }
  }, []);

  // Format field name for display
  const formatFieldName = (field: string): string => {
    return field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return "text-success";
    if (confidence >= 0.7) return "text-warning";
    return "text-danger";
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Document Scanner (OCR)
          </span>
          {aiHealth && (
            <Badge variant={isAIAvailable ? "success" : "secondary"}>
              {isAIAvailable ? "AI Ready" : "AI Offline"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Document Type Selector */}
        {!result && (
          <div>
            <label className="text-xs text-text-muted mb-1 block">
              Document Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-bg-card text-text-primary"
              disabled={isExtracting}
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Upload Area */}
        {!preview && (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
              ${dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleInputChange}
              className="hidden"
            />
            <Upload className="w-8 h-8 mx-auto mb-2 text-text-muted" />
            <p className="text-sm text-text-secondary">
              Drop a document here or click to upload
            </p>
            <p className="text-xs text-text-muted mt-1">
              JPEG, PNG, TIFF, or PDF
            </p>
          </div>
        )}

        {/* Preview and Extraction */}
        {preview && (
          <div className="space-y-4">
            {/* Image Preview */}
            <div className="relative rounded-lg overflow-hidden bg-bg-muted">
              <img
                src={preview}
                alt="Document preview"
                className="w-full h-48 object-contain"
              />
              {!isExtracting && !result && (
                <button
                  onClick={reset}
                  className="absolute top-2 right-2 p-1 bg-bg-card/80 rounded-full hover:bg-bg-card"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {isExtracting && (
                <div className="absolute inset-0 flex items-center justify-center bg-bg-card/80">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-text-secondary">
                      Extracting data...
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/30 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0" />
                <p className="text-xs text-danger">{error}</p>
              </div>
            )}

            {/* Extraction Results */}
            {result && (
              <div className="space-y-4">
                {/* Confidence Score */}
                <div className="flex items-center justify-between p-3 bg-bg-muted rounded-lg">
                  <div>
                    <p className="text-xs text-text-muted">
                      Extraction Confidence
                    </p>
                    <p
                      className={`text-lg font-bold ${getConfidenceColor(result.confidence)}`}
                    >
                      {Math.round(result.confidence * 100)}%
                    </p>
                  </div>
                  <Badge variant="default">
                    {formatFieldName(result.document_type)}
                  </Badge>
                </div>

                {/* Extracted Fields */}
                <div>
                  <h4 className="text-xs font-medium text-text-muted uppercase mb-2">
                    Extracted Fields ({result.fields_extracted.length})
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(result.structured_data)
                      .filter(([, value]) => value !== null && value !== "")
                      .map(([field, value]) => (
                        <div
                          key={field}
                          className="flex items-center justify-between p-2 bg-bg-muted rounded group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-text-muted">
                              {formatFieldName(field)}
                            </p>
                            <p className="text-sm text-text-primary truncate">
                              {value}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              copyToClipboard(field, value as string)
                            }
                            className="p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy to clipboard"
                          >
                            {copiedField === field ? (
                              <CheckCircle className="w-4 h-4 text-success" />
                            ) : (
                              <Copy className="w-4 h-4 text-text-muted hover:text-text-primary" />
                            )}
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Raw Text Preview */}
                <details className="group">
                  <summary className="cursor-pointer text-xs font-medium text-text-muted uppercase hover:text-text-primary">
                    Raw OCR Text
                  </summary>
                  <div className="mt-2 p-3 bg-bg-muted rounded-lg max-h-40 overflow-y-auto">
                    <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono">
                      {result.raw_text}
                    </pre>
                  </div>
                </details>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={reset}
                    className="flex-1"
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Scan Another
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact document scan button for inline use
 */
export function DocumentScanButton({
  documentType = "service_record",
  onExtractionComplete,
  disabled = false,
}: {
  documentType?: string;
  onExtractionComplete?: (result: DocumentOCRResult) => void;
  disabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isExtracting, extractDocument } = useDocumentOCR();

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const result = await extractDocument(file, documentType);
        if (result && onExtractionComplete) {
          onExtractionComplete(result);
        }
      }
    },
    [extractDocument, documentType, onExtractionComplete],
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isExtracting}
      >
        {isExtracting ? (
          <>
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            Scanning...
          </>
        ) : (
          <>
            <FileText className="w-4 h-4 mr-1" />
            Scan Document
          </>
        )}
      </Button>
    </>
  );
}

export default DocumentScanner;
