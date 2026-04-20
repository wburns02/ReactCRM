import { useState } from "react";
import { BookOpen, FileSignature, Shield, TrendingUp, Truck, Eye, Download, Send } from "lucide-react";
import { Button } from "@/components/ui/Button.tsx";
import { Card } from "@/components/ui/Card.tsx";
import { Skeleton } from "@/components/ui/Skeleton.tsx";
import { useReferenceDocs, getReferenceDocDownloadUrl } from "@/api/hooks/useReferenceDocs.ts";
import type { ReferenceDoc } from "@/api/hooks/useReferenceDocs.ts";
import { ReferenceDocPreviewModal } from "./ReferenceDocPreviewModal.tsx";
import { ReferenceDocSendModal } from "./ReferenceDocSendModal.tsx";

const CATEGORY_ORDER = ["Playbooks", "Contracts", "Regulations", "Sales", "Operations"];

const CATEGORY_ICONS: Record<string, typeof BookOpen> = {
  Playbooks: BookOpen,
  Contracts: FileSignature,
  Regulations: Shield,
  Sales: TrendingUp,
  Operations: Truck,
};

export function ReferenceDocsTab() {
  const { data: docs, isLoading } = useReferenceDocs();
  const [previewDoc, setPreviewDoc] = useState<ReferenceDoc | null>(null);
  const [sendDoc, setSendDoc] = useState<ReferenceDoc | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-2/3 mb-4" />
            <Skeleton className="h-8 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (!docs || docs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No reference documents available
      </div>
    );
  }

  // Group by category
  const grouped = new Map<string, ReferenceDoc[]>();
  for (const doc of docs) {
    const existing = grouped.get(doc.category) || [];
    existing.push(doc);
    grouped.set(doc.category, existing);
  }

  // Sort categories by defined order, then alphabetical for unknown
  const sortedCategories = [...grouped.keys()].sort((a, b) => {
    const aIdx = CATEGORY_ORDER.indexOf(a);
    const bIdx = CATEGORY_ORDER.indexOf(b);
    if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  return (
    <div className="space-y-8">
      {sortedCategories.map((category) => {
        const categoryDocs = grouped.get(category)!;
        const IconComponent = CATEGORY_ICONS[category] || BookOpen;

        return (
          <section key={category}>
            <div className="flex items-center gap-2 mb-4">
              <IconComponent size={20} className="text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">{category}</h2>
              <span className="ml-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                {categoryDocs.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryDocs.map((doc) => (
                <Card key={doc.slug} className="p-4 flex flex-col">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-gray-900 text-sm">{doc.title}</h3>
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                        {doc.file_type === "html" ? "HTML" : "TXT"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{doc.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewDoc(doc)}
                      className="flex items-center gap-1"
                    >
                      <Eye size={14} />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(getReferenceDocDownloadUrl(doc.slug), "_blank")}
                      className="flex items-center gap-1"
                    >
                      <Download size={14} />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSendDoc(doc)}
                      className="flex items-center gap-1"
                    >
                      <Send size={14} />
                      Email
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        );
      })}

      {/* Modals */}
      {previewDoc && (
        <ReferenceDocPreviewModal
          doc={previewDoc}
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          onSendEmail={() => {
            setSendDoc(previewDoc);
            setPreviewDoc(null);
          }}
          onDownload={() => window.open(getReferenceDocDownloadUrl(previewDoc.slug), "_blank")}
        />
      )}

      {sendDoc && (
        <ReferenceDocSendModal
          doc={sendDoc}
          isOpen={!!sendDoc}
          onClose={() => setSendDoc(null)}
          onSuccess={() => setSendDoc(null)}
        />
      )}
    </div>
  );
}
