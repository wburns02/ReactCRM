import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FileText,
  FileEdit,
  Wrench,
  Search as SearchIcon,
  ChevronRight,
  ChevronLeft,
  X,
  Send,
  Save,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Textarea } from "@/components/ui/Textarea.tsx";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/Dialog.tsx";
import { Select } from "@/components/ui/Select.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import {
  useGenerateDocument,
  useGenerateAndSend,
  useSourceRecords,
  getHTMLPreviewUrl,
} from "@/api/hooks/useDocumentCenter.ts";
import {
  DocumentType,
  DOCUMENT_TYPE_INFO,
  generateRequestSchema,
  sendRequestSchema,
  type GenerateRequest,
  type SendRequest,
  type SourceRecord,
} from "@/api/types/documentCenter.ts";

interface GenerateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDocumentType?: DocumentType | null;
  onSuccess: () => void;
}

type Step = "type" | "source" | "preview" | "action";

interface FormData {
  document_type: DocumentType;
  reference_id: string;
  email?: string;
  subject?: string;
  message?: string;
}

export function GenerateDocumentModal({
  isOpen,
  onClose,
  initialDocumentType,
  onSuccess,
}: GenerateDocumentModalProps) {
  const [step, setStep] = useState<Step>("type");
  const [formData, setFormData] = useState<Partial<FormData>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSource, setSelectedSource] = useState<SourceRecord | null>(null);
  const [generatedDocument, setGeneratedDocument] = useState<any>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [actionType, setActionType] = useState<"save" | "send">("save");

  const generateMutation = useGenerateDocument();
  const generateAndSendMutation = useGenerateAndSend();

  // Fetch source records when document type is selected
  const {
    data: sourceRecords,
    isLoading: recordsLoading
  } = useSourceRecords(formData.document_type || "", searchTerm);

  // Form for email step
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
    reset: resetForm,
  } = useForm<SendRequest>({
    resolver: zodResolver(sendRequestSchema),
    mode: "onChange",
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialDocumentType) {
        setFormData({ document_type: initialDocumentType });
        setStep("source");
      } else {
        setStep("type");
        setFormData({});
      }
      setSelectedSource(null);
      setGeneratedDocument(null);
      setPreviewLoaded(false);
      setSearchTerm("");
      resetForm();
    }
  }, [isOpen, initialDocumentType, resetForm]);

  const documentTypes = [
    {
      type: DocumentType.INVOICE,
      icon: <FileText size={32} />,
      title: "Invoice PDF",
      description: "Professional branded invoices",
    },
    {
      type: DocumentType.QUOTE,
      icon: <FileEdit size={32} />,
      title: "Quote PDF",
      description: "Estimates and proposals",
    },
    {
      type: DocumentType.WORK_ORDER,
      icon: <Wrench size={32} />,
      title: "Work Order PDF",
      description: "Job assignments and details",
    },
    {
      type: DocumentType.INSPECTION_REPORT,
      icon: <SearchIcon size={32} />,
      title: "Inspection Report",
      description: "Detailed inspection findings",
    },
  ];

  const handleTypeSelect = (type: DocumentType) => {
    setFormData({ document_type: type });
    setStep("source");
  };

  const handleSourceSelect = (source: SourceRecord) => {
    setSelectedSource(source);
    setFormData(prev => ({ ...prev, reference_id: source.id }));
  };

  const handleGeneratePreview = async () => {
    if (!formData.document_type || !formData.reference_id) return;

    try {
      const generateRequest: GenerateRequest = {
        document_type: formData.document_type,
        reference_id: formData.reference_id,
      };

      const document = await generateMutation.mutateAsync(generateRequest);
      setGeneratedDocument(document);
      setStep("preview");
      setPreviewLoaded(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleFinalAction = async (data?: SendRequest) => {
    if (!generatedDocument) return;

    try {
      if (actionType === "send" && data) {
        // Send email
        await generateAndSendMutation.mutateAsync({
          generateRequest: {
            document_type: formData.document_type!,
            reference_id: formData.reference_id!,
          },
          sendRequest: data,
        });
      }
      // Document is already generated, just close and refresh
      onSuccess();
      handleClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    setStep("type");
    setFormData({});
    setSelectedSource(null);
    setGeneratedDocument(null);
    setPreviewLoaded(false);
    setSearchTerm("");
    resetForm();
    onClose();
  };

  const isLoading = generateMutation.isPending || generateAndSendMutation.isPending;

  return (
    <Dialog open={isOpen} onClose={handleClose}>
      <DialogContent size={step === "preview" ? "2xl" : "lg"} className={step === "preview" ? "max-w-full max-h-[95vh]" : ""}>
        <div className="space-y-6">
        {/* Header with Steps */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Generate Document</h2>
            <div className="flex items-center gap-2 mt-2">
              {["type", "source", "preview", "action"].map((stepKey, index) => (
                <div key={stepKey} className="flex items-center">
                  <Badge
                    className={
                      step === stepKey
                        ? "bg-blue-600 text-white"
                        : index < ["type", "source", "preview", "action"].indexOf(step)
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }
                  >
                    {index + 1}
                  </Badge>
                  {index < 3 && (
                    <ChevronRight size={16} className="mx-1 text-gray-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
          <Button onClick={handleClose} variant="ghost" size="sm">
            <X size={16} />
          </Button>
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {/* Step 1: Document Type Selection */}
          {step === "type" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-md font-medium text-gray-900">Select Document Type</h3>
                <p className="text-sm text-gray-600">Choose the type of document to generate</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documentTypes.map(({ type, icon, title, description }) => (
                  <button
                    key={type}
                    onClick={() => handleTypeSelect(type)}
                    className="p-6 text-left border-2 border-gray-200 rounded-lg hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div style={{ color: DOCUMENT_TYPE_INFO[type].color }}>
                        {icon}
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-gray-900">{title}</p>
                        <p className="text-sm text-gray-600">{description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Source Record Selection */}
          {step === "source" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-md font-medium text-gray-900">
                  Select Source {DOCUMENT_TYPE_INFO[formData.document_type!]?.label}
                </h3>
                <p className="text-sm text-gray-600">
                  Choose the record to generate a document from
                </p>
              </div>

              {/* Search */}
              <div>
                <Input
                  placeholder="Search by reference number or customer name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Source Records List */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {recordsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-3 border border-gray-200 rounded-lg">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  ))
                ) : sourceRecords?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No records found</p>
                  </div>
                ) : (
                  sourceRecords?.map((record) => (
                    <button
                      key={record.id}
                      onClick={() => handleSourceSelect(record)}
                      className={`w-full p-3 text-left border rounded-lg transition-colors ${
                        selectedSource?.id === record.id
                          ? "border-blue-300 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {record.reference_number}
                          </p>
                          <p className="text-sm text-gray-600">
                            {record.customer_name}
                          </p>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          {record.date && (
                            <p>{new Date(record.date).toLocaleDateString()}</p>
                          )}
                          {record.amount && (
                            <p>${record.amount.toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <Button
                  onClick={() => setStep("type")}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ChevronLeft size={16} />
                  Back
                </Button>
                <Button
                  onClick={handleGeneratePreview}
                  disabled={!selectedSource || isLoading}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                  Generate Preview
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === "preview" && generatedDocument && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-md font-medium text-gray-900">Document Preview</h3>
                  <p className="text-sm text-gray-600">
                    Review the generated document
                  </p>
                </div>
                <Button
                  onClick={() => setStep("action")}
                  className="flex items-center gap-2"
                >
                  <ChevronRight size={16} />
                  Continue
                </Button>
              </div>

              {/* Preview iframe */}
              <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ height: "60vh" }}>
                {!previewLoaded && (
                  <div className="flex items-center justify-center h-full bg-gray-50">
                    <div className="text-center">
                      <div className="w-8 h-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Loading preview...</p>
                    </div>
                  </div>
                )}
                <iframe
                  src={getHTMLPreviewUrl(generatedDocument.id)}
                  className="w-full h-full"
                  onLoad={() => setPreviewLoaded(true)}
                  title="Document Preview"
                />
              </div>
            </div>
          )}

          {/* Step 4: Action Selection */}
          {step === "action" && generatedDocument && (
            <div className="space-y-6">
              <div>
                <h3 className="text-md font-medium text-gray-900">What would you like to do?</h3>
                <p className="text-sm text-gray-600">
                  The document has been generated and saved as a draft
                </p>
              </div>

              {/* Action selection */}
              <div className="space-y-3">
                <button
                  onClick={() => setActionType("save")}
                  className={`w-full p-4 text-left border-2 rounded-lg transition-colors ${
                    actionType === "save"
                      ? "border-blue-300 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Save className="text-gray-600" size={20} />
                    <div>
                      <p className="font-medium text-gray-900">Save as Draft</p>
                      <p className="text-sm text-gray-600">
                        Keep the document as a draft for later use
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setActionType("send")}
                  className={`w-full p-4 text-left border-2 rounded-lg transition-colors ${
                    actionType === "send"
                      ? "border-blue-300 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Send className="text-blue-600" size={20} />
                    <div>
                      <p className="font-medium text-gray-900">Save & Send via Email</p>
                      <p className="text-sm text-gray-600">
                        Send the document to the customer immediately
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Email form (shown if send is selected) */}
              {actionType === "send" && (
                <form onSubmit={handleSubmit(handleFinalAction)} className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900">Email Details</h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <Input
                      type="email"
                      placeholder="customer@example.com"
                      {...register("email")}
                      error={errors.email?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <Input
                      placeholder="Document from MAC Septic Services"
                      {...register("subject")}
                      error={errors.subject?.message}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <Textarea
                      rows={3}
                      placeholder="Please find attached your document..."
                      {...register("message")}
                      error={errors.message?.message}
                    />
                  </div>
                </form>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <Button
                  onClick={() => setStep("preview")}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ChevronLeft size={16} />
                  Back to Preview
                </Button>

                <Button
                  onClick={() => {
                    if (actionType === "save") {
                      handleFinalAction();
                    } else {
                      // Submit form for email sending
                      handleSubmit(handleFinalAction)();
                    }
                  }}
                  disabled={isLoading || (actionType === "send" && !isValid)}
                  className="flex items-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Check size={16} />
                  )}
                  {actionType === "save" ? "Complete" : "Send Email"}
                </Button>
              </div>
            </div>
          )}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}