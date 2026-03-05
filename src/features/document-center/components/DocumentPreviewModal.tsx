import { useState } from "react";
import { Download, Send, X } from "lucide-react";
import { Button } from "@/components/ui/Button.tsx";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/Dialog.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import { getHTMLPreviewUrl } from "@/api/hooks/useDocumentCenter.ts";
import { DocumentMeta, DOCUMENT_TYPE_INFO } from "@/api/types/documentCenter.ts";

interface DocumentPreviewModalProps {
  document: DocumentMeta;
  isOpen: boolean;
  onClose: () => void;
  onSendEmail: () => void;
  onDownload: () => void;
}

export function DocumentPreviewModal({
  document,
  isOpen,
  onClose,
  onSendEmail,
  onDownload,
}: DocumentPreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const typeInfo = DOCUMENT_TYPE_INFO[document.document_type];
  const previewUrl = getHTMLPreviewUrl(document.id);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogContent size="2xl" className="max-w-full max-h-[95vh] h-[95vh] flex flex-col">
        <div className="flex flex-col h-full">
        {/* Header */}
        <DialogHeader onClose={onClose}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div style={{ color: typeInfo?.color }} className="text-xl">
                {typeInfo?.icon || "📄"}
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {typeInfo?.label || document.document_type} Preview
                </div>
                <p className="text-sm text-gray-600">
                  {document.reference_number} - {document.customer_name || "Unknown Customer"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={onDownload}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download size={16} />
                Download PDF
              </Button>
              <Button
                onClick={onSendEmail}
                className="flex items-center gap-2"
              >
                <Send size={16} />
                Send via Email
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Preview Content */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center space-y-4">
                <Skeleton className="h-8 w-48 mx-auto" />
                <Skeleton className="h-4 w-32 mx-auto" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>
            </div>
          )}

          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center space-y-4">
                <div className="text-gray-400">
                  <svg
                    className="w-12 h-12 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">
                  Preview Not Available
                </h3>
                <p className="text-gray-600">
                  Unable to load the document preview. The document may still be available for download.
                </p>
                <Button onClick={onDownload} className="mt-4">
                  Download PDF Instead
                </Button>
              </div>
            </div>
          )}

          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            title={`${document.document_type} Preview - ${document.reference_number}`}
            sandbox="allow-same-origin"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}