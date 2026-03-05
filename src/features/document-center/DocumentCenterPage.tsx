import { useState, useCallback, useEffect } from "react";
import { useDocuments, useDocumentStats } from "@/api/hooks/useDocumentCenter.ts";
import { DocumentCenterDashboard } from "./components/DocumentCenterDashboard.tsx";
import { DocumentsTable } from "./components/DocumentsTable.tsx";
import { DocumentFilters } from "./components/DocumentFilters.tsx";
import { QuickActionsBar } from "./components/QuickActionsBar.tsx";
import { DocumentPreviewModal } from "./components/DocumentPreviewModal.tsx";
import { SendEmailModal } from "./components/SendEmailModal.tsx";
import { GenerateDocumentModal } from "./components/GenerateDocumentModal.tsx";
import { Card } from "@/components/ui/Card.tsx";
import { ApiError } from "@/components/ui/ApiError.tsx";
import { ConfirmDialog } from "@/components/ui/Dialog.tsx";
import type {
  DocumentFilters as DocumentFiltersType,
  DocumentMeta,
  DocumentType,
} from "@/api/types/documentCenter.ts";

/**
 * Main Document Center page
 *
 * Features:
 * - KPI stats dashboard with charts
 * - Quick action buttons for document generation
 * - Filterable/searchable documents table
 * - Preview, send email, and download modals
 * - Generate new documents workflow
 */
export function DocumentCenterPage() {
  // Filter state
  const [filters, setFilters] = useState<DocumentFiltersType>({
    page: 1,
    page_size: 20,
  });

  // Modal state
  const [previewDocument, setPreviewDocument] = useState<DocumentMeta | null>(null);
  const [sendEmailDocument, setSendEmailDocument] = useState<DocumentMeta | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateDocumentType, setGenerateDocumentType] = useState<DocumentType | null>(null);
  const [deletingDocument, setDeletingDocument] = useState<DocumentMeta | null>(null);

  // Data fetching
  const { data: documentsData, isLoading: documentsLoading, error: documentsError, refetch } = useDocuments(filters);
  const { data: statsData, isLoading: statsLoading, error: statsError } = useDocumentStats();

  // Filter handlers
  const handleFilterChange = useCallback(
    (newFilters: Partial<DocumentFiltersType>) => {
      setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
    },
    [],
  );

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  // Document action handlers
  const handlePreview = (document: DocumentMeta) => {
    setPreviewDocument(document);
  };

  const handleSendEmail = (document: DocumentMeta) => {
    setSendEmailDocument(document);
  };

  const handleDelete = (document: DocumentMeta) => {
    setDeletingDocument(document);
  };

  const handleDownload = (document: DocumentMeta) => {
    // Open PDF in new tab
    const pdfUrl = `${import.meta.env.VITE_API_URL}/documents/${document.id}/pdf`;
    window.open(pdfUrl, "_blank");
  };

  // Quick action handlers
  const handleQuickGenerate = (documentType: DocumentType) => {
    setGenerateDocumentType(documentType);
    setIsGenerateModalOpen(true);
  };

  // Close modal handlers
  const closePreviewModal = () => setPreviewDocument(null);
  const closeSendEmailModal = () => setSendEmailDocument(null);
  const closeGenerateModal = () => {
    setIsGenerateModalOpen(false);
    setGenerateDocumentType(null);
  };
  const closeDeleteDialog = () => setDeletingDocument(null);

  // Show error if both stats and documents fail
  const hasError = documentsError && statsError;
  if (hasError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Document Center</h1>
            <p className="text-gray-600">Generate, manage, and email professional documents</p>
          </div>
        </div>
        <ApiError
          error={documentsError || statsError}
          retry={() => {
            refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Document Center</h1>
          <p className="text-gray-600">Generate, manage, and email professional documents</p>
        </div>
      </div>

      {/* Dashboard Stats */}
      <DocumentCenterDashboard
        stats={statsData}
        isLoading={statsLoading}
        error={statsError}
      />

      {/* Quick Actions */}
      <Card className="p-6">
        <QuickActionsBar onGenerateClick={handleQuickGenerate} />
      </Card>

      {/* Filters */}
      <Card className="p-6">
        <DocumentFilters
          filters={filters}
          onFilterChange={handleFilterChange}
        />
      </Card>

      {/* Documents Table */}
      <Card className="p-0">
        <DocumentsTable
          data={documentsData}
          filters={filters}
          onPageChange={handlePageChange}
          onPreview={handlePreview}
          onSendEmail={handleSendEmail}
          onDownload={handleDownload}
          onDelete={handleDelete}
          isLoading={documentsLoading}
          error={documentsError}
          onRetry={refetch}
        />
      </Card>

      {/* Modals */}
      {previewDocument && (
        <DocumentPreviewModal
          document={previewDocument}
          isOpen={!!previewDocument}
          onClose={closePreviewModal}
          onSendEmail={() => {
            setSendEmailDocument(previewDocument);
            closePreviewModal();
          }}
          onDownload={() => handleDownload(previewDocument)}
        />
      )}

      {sendEmailDocument && (
        <SendEmailModal
          document={sendEmailDocument}
          isOpen={!!sendEmailDocument}
          onClose={closeSendEmailModal}
          onSuccess={() => {
            closeSendEmailModal();
            refetch();
          }}
        />
      )}

      {isGenerateModalOpen && (
        <GenerateDocumentModal
          isOpen={isGenerateModalOpen}
          onClose={closeGenerateModal}
          initialDocumentType={generateDocumentType}
          onSuccess={() => {
            closeGenerateModal();
            refetch();
          }}
        />
      )}

      {deletingDocument && (
        <ConfirmDialog
          isOpen={!!deletingDocument}
          onClose={closeDeleteDialog}
          title="Delete Document"
          description={`Are you sure you want to delete "${deletingDocument.file_name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          confirmVariant="destructive"
          onConfirm={async () => {
            // Note: Delete functionality would be handled by useDeleteDocument hook
            // For now, we'll just close the dialog
            closeDeleteDialog();
            refetch();
          }}
        />
      )}
    </div>
  );
}