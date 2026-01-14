import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
} from "@/components/ui/Dialog.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { type Document, isViewableFile } from "@/api/types/document.ts";

export interface DocumentViewerProps {
  open: boolean;
  onClose: () => void;
  document: Document | null;
  onDownload?: (document: Document) => void;
}

/**
 * Document Viewer component - view PDFs and images in modal
 */
export function DocumentViewer({
  open,
  onClose,
  document,
  onDownload,
}: DocumentViewerProps) {
  const [imageError, setImageError] = useState(false);

  if (!document) return null;

  const canView = isViewableFile(document.file_type);
  const isPDF = document.file_type.includes("pdf");
  const isImage = document.file_type.includes("image");

  const handleDownload = () => {
    if (onDownload && document) {
      onDownload(document);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent size="xl" className="max-h-[90vh] flex flex-col">
        <DialogHeader onClose={onClose}>
          <div className="flex items-center justify-between flex-1 pr-8">
            <span className="truncate">{document.file_name}</span>
            {onDownload && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownload}
                className="ml-3"
              >
                Download
              </Button>
            )}
          </div>
        </DialogHeader>

        <DialogBody className="flex-1 overflow-auto">
          {!canView ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📄</div>
              <p className="text-text-primary mb-2">{document.file_name}</p>
              <p className="text-sm text-text-muted mb-4">
                Preview not available for this file type
              </p>
              {onDownload && (
                <Button onClick={handleDownload}>Download to View</Button>
              )}
            </div>
          ) : isPDF ? (
            <div className="w-full h-[600px] bg-bg-hover rounded">
              <iframe
                src={document.file_url}
                className="w-full h-full rounded"
                title={document.file_name}
              />
            </div>
          ) : isImage ? (
            <div className="flex items-center justify-center bg-bg-hover rounded p-4">
              {imageError ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">🖼️</div>
                  <p className="text-text-primary mb-2">Failed to load image</p>
                  <p className="text-sm text-text-muted mb-4">
                    The image could not be displayed
                  </p>
                  {onDownload && (
                    <Button onClick={handleDownload}>Download Image</Button>
                  )}
                </div>
              ) : (
                <img
                  src={document.file_url}
                  alt={document.file_name}
                  className="max-w-full max-h-[600px] object-contain rounded"
                  onError={() => setImageError(true)}
                />
              )}
            </div>
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
