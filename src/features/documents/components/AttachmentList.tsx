import { useState } from 'react';
import { useDocuments, useDeleteDocument, useDownloadDocument } from '@/api/hooks/useDocuments.ts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { ConfirmDialog } from '@/components/ui/Dialog.tsx';
import { FileUploader } from './FileUploader.tsx';
import { DocumentViewer } from './DocumentViewer.tsx';
import { formatDate } from '@/lib/utils.ts';
import {
  type Document,
  type EntityType,
  formatFileSize,
  getFileIcon,
  isViewableFile,
} from '@/api/types/document.ts';

export interface AttachmentListProps {
  entityId: string;
  entityType: EntityType;
}

/**
 * Attachment List component - list of documents with upload, download, and delete
 */
export function AttachmentList({ entityId, entityType }: AttachmentListProps) {
  const [showUploader, setShowUploader] = useState(false);
  const [viewDocument, setViewDocument] = useState<Document | null>(null);
  const [deleteDocument, setDeleteDocument] = useState<Document | null>(null);

  const { data, isLoading, error } = useDocuments(entityId, entityType);
  const deleteMutation = useDeleteDocument();
  const downloadMutation = useDownloadDocument();

  const documents = data?.items || [];

  const handleDelete = async () => {
    if (deleteDocument) {
      await deleteMutation.mutateAsync(deleteDocument.id);
      setDeleteDocument(null);
    }
  };

  const handleDownload = async (document: Document) => {
    await downloadMutation.mutateAsync(document);
  };

  const handleView = (document: Document) => {
    if (isViewableFile(document.file_type)) {
      setViewDocument(document);
    } else {
      handleDownload(document);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Attachments</CardTitle>
            <Button onClick={() => setShowUploader(!showUploader)}>
              {showUploader ? 'Cancel' : 'Upload File'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showUploader && (
            <div className="mb-6">
              <FileUploader
                entityId={entityId}
                entityType={entityType}
                onUploadComplete={() => setShowUploader(false)}
              />
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-danger mb-2">Failed to load attachments</p>
              <p className="text-sm text-text-muted">Please try again later</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📎</div>
              <p className="text-text-muted mb-4">No attachments yet</p>
              {!showUploader && (
                <Button onClick={() => setShowUploader(true)}>Upload First File</Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-bg-hover transition-colors group"
                >
                  {/* File Icon */}
                  <div className="flex-shrink-0 text-2xl">{getFileIcon(doc.file_type)}</div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => handleView(doc)}
                      className="text-left w-full group/name"
                    >
                      <p className="font-medium text-text-primary truncate group-hover/name:text-primary">
                        {doc.file_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span>{formatDate(doc.created_at)}</span>
                        {doc.uploaded_by && (
                          <>
                            <span>•</span>
                            <span>by {doc.uploaded_by}</span>
                          </>
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isViewableFile(doc.file_type) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewDocument(doc)}
                        title="View"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      disabled={downloadMutation.isPending}
                      title="Download"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteDocument(doc)}
                      title="Delete"
                      className="hover:text-danger"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Viewer Modal */}
      <DocumentViewer
        open={!!viewDocument}
        onClose={() => setViewDocument(null)}
        document={viewDocument}
        onDownload={handleDownload}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteDocument}
        onClose={() => setDeleteDocument(null)}
        onConfirm={handleDelete}
        title="Delete Attachment"
        message={`Are you sure you want to delete "${deleteDocument?.file_name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
