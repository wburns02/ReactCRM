import { useState } from "react";
import {
  Eye,
  Send,
  Download,
  Trash2,
  MoreVertical,
  FileText,
  FileEdit,
  Wrench,
  Search as SearchIcon
} from "lucide-react";
import { Button } from "@/components/ui/Button.tsx";
// Using simple div-based table instead of Table component
import { Badge } from "@/components/ui/Badge.tsx";
import { Dropdown, DropdownMenu, DropdownItem, DropdownTrigger } from "@/components/ui/Dropdown.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import { ApiError } from "@/components/ui/ApiError.tsx";
import { Pagination } from "@/components/ui/Pagination.tsx";
import {
  DocumentMeta,
  DocumentListResponse,
  DocumentFilters,
  DocumentType,
  DocumentStatus,
  DOCUMENT_TYPE_INFO,
  STATUS_INFO,
  formatFileSize,
} from "@/api/types/documentCenter.ts";

interface DocumentsTableProps {
  data: DocumentListResponse | undefined;
  filters: DocumentFilters;
  onPageChange: (page: number) => void;
  onPreview: (document: DocumentMeta) => void;
  onSendEmail: (document: DocumentMeta) => void;
  onDownload: (document: DocumentMeta) => void;
  onDelete: (document: DocumentMeta) => void;
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
}

interface DocumentTypeIconProps {
  type: DocumentType;
  className?: string;
}

function DocumentTypeIcon({ type, className = "w-4 h-4" }: DocumentTypeIconProps) {
  const icons = {
    [DocumentType.INVOICE]: <FileText className={className} />,
    [DocumentType.QUOTE]: <FileEdit className={className} />,
    [DocumentType.WORK_ORDER]: <Wrench className={className} />,
    [DocumentType.INSPECTION_REPORT]: <SearchIcon className={className} />,
  };

  return icons[type] || <FileText className={className} />;
}

interface StatusBadgeProps {
  status: DocumentStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const statusInfo = STATUS_INFO[status];
  if (!statusInfo) return <Badge>{status}</Badge>;

  return (
    <Badge
      className={`${statusInfo.bgColor} ${statusInfo.textColor} border-0`}
    >
      {statusInfo.label}
    </Badge>
  );
}

interface ActionDropdownProps {
  document: DocumentMeta;
  onPreview: (document: DocumentMeta) => void;
  onSendEmail: (document: DocumentMeta) => void;
  onDownload: (document: DocumentMeta) => void;
  onDelete: (document: DocumentMeta) => void;
}

function ActionDropdown({ document, onPreview, onSendEmail, onDownload, onDelete }: ActionDropdownProps) {
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownTrigger>
      <DropdownMenu align="end">
        <DropdownItem onClick={() => onPreview(document)}>
          <Eye className="w-4 h-4 mr-2" />
          Preview
        </DropdownItem>
        <DropdownItem onClick={() => onDownload(document)}>
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </DropdownItem>
        <DropdownItem onClick={() => onSendEmail(document)}>
          <Send className="w-4 h-4 mr-2" />
          {document.status === "draft" ? "Send Email" : "Resend"}
        </DropdownItem>
        <DropdownItem
          onClick={() => onDelete(document)}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}

function TableLoadingSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-8" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <FileText className="mx-auto h-12 w-12 text-gray-300" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">No documents found</h3>
      <p className="mt-1 text-sm text-gray-500">
        Get started by generating your first document.
      </p>
    </div>
  );
}

export function DocumentsTable({
  data,
  filters,
  onPageChange,
  onPreview,
  onSendEmail,
  onDownload,
  onDelete,
  isLoading,
  error,
  onRetry,
}: DocumentsTableProps) {
  if (error) {
    return (
      <div className="p-6">
        <ApiError error={error} retry={onRetry} />
      </div>
    );
  }

  if (isLoading) {
    return <TableLoadingSkeleton />;
  }

  if (!data || data.items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Size</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.items.map((document) => {
              const typeInfo = DOCUMENT_TYPE_INFO[document.document_type as DocumentType];

              return (
                <tr key={document.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <DocumentTypeIcon
                        type={document.document_type as DocumentType}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium">
                        {typeInfo?.label || document.document_type}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <Button
                      variant="link"
                      className="p-0 h-auto font-medium text-blue-600 hover:text-blue-800"
                      onClick={() => onPreview(document)}
                    >
                      {document.reference_number || "N/A"}
                    </Button>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {document.customer_name || "Unknown Customer"}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={document.status as DocumentStatus} />
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {formatFileSize(document.file_size)}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="text-gray-900">
                        {new Date(document.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-gray-500">
                        {new Date(document.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <ActionDropdown
                      document={document}
                      onPreview={onPreview}
                      onSendEmail={onSendEmail}
                      onDownload={onDownload}
                      onDelete={onDelete}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.total > data.page_size && (
        <div className="border-t border-gray-200 px-6 py-4">
          <Pagination
            currentPage={data.page}
            totalPages={Math.ceil(data.total / data.page_size)}
            onPageChange={onPageChange}
            showSizeSelector={false}
          />
        </div>
      )}

      {/* Results summary */}
      <div className="border-t border-gray-200 px-6 py-3 text-sm text-gray-500">
        Showing {((data.page - 1) * data.page_size) + 1} to {Math.min(data.page * data.page_size, data.total)} of {data.total} documents
      </div>
    </div>
  );
}