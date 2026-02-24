import { useState, useRef, type DragEvent } from "react";
import { Button } from "@/components/ui/Button.tsx";
import { useUploadDocument } from "@/api/hooks/useDocuments.ts";
import {
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
  ALLOWED_FILE_EXTENSIONS,
  formatFileSize,
  type EntityType,
} from "@/api/types/document.ts";
import { cn } from "@/lib/utils.ts";

export interface FileUploaderProps {
  entityId: string;
  entityType: EntityType;
  onUploadComplete?: () => void;
}

/**
 * File Uploader component with drag-and-drop support
 * Enforces 5MB file size limit and shows upload progress
 */
export function FileUploader({
  entityId,
  entityType,
  onUploadComplete,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUploadDocument();

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${formatFileSize(MAX_FILE_SIZE)} limit`;
    }

    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      const extension = "." + file.name.split(".").pop()?.toLowerCase();
      if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
        return "File type not allowed. Allowed types: PDF, images, Word, Excel, text files";
      }
    }

    return null;
  };

  const handleFileUpload = async (file: File) => {
    setError(null);
    setUploadProgress(0);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await uploadMutation.mutateAsync({
        file,
        entityType,
        entityId,
        onProgress: setUploadProgress,
      });

      setUploadProgress(0);
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (err: unknown) {
      const apiErr = err as Error & { response?: { data?: { error?: string } } };
      setError(apiErr?.response?.data?.error || "Failed to upload file");
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  const isUploading = uploadMutation.isPending;

  return (
    <div className="space-y-3">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-bg-hover",
          isUploading && "pointer-events-none opacity-50",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept={ALLOWED_FILE_EXTENSIONS.join(",")}
          disabled={isUploading}
        />

        <div className="flex flex-col items-center gap-3">
          <div className="text-4xl">📁</div>
          <div>
            <p className="text-text-primary font-medium mb-1">
              {isDragging ? "Drop file here" : "Drag and drop file here"}
            </p>
            <p className="text-sm text-text-muted mb-3">or</p>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClickUpload}
              disabled={isUploading}
            >
              Browse Files
            </Button>
          </div>
          <p className="text-xs text-text-muted">
            Max file size: {formatFileSize(MAX_FILE_SIZE)}
          </p>
          <p className="text-xs text-text-muted">
            Allowed: PDF, Images (JPG, PNG, GIF), Word, Excel, Text
          </p>
        </div>
      </div>

      {/* Upload Progress */}
      {isUploading && uploadProgress > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Uploading...</span>
            <span className="text-text-primary font-medium">
              {uploadProgress}%
            </span>
          </div>
          <div className="w-full h-2 bg-bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-danger/10 border border-danger/20 rounded-md">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {uploadMutation.isSuccess && (
        <div className="p-3 bg-success/10 border border-success/20 rounded-md">
          <p className="text-sm text-success">File uploaded successfully!</p>
        </div>
      )}
    </div>
  );
}
