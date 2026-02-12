import { useState } from "react";
import {
  useTemplateDocument,
  useContractDocument,
} from "../api/contracts.ts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";

interface ContractDocumentPreviewProps {
  /** Provide templateId to preview a template document */
  templateId?: string;
  /** Provide contractId to view a generated contract document */
  contractId?: string;
  /** Optional variable overrides for template preview */
  variables?: Record<string, string>;
  /** Called when user closes the preview */
  onClose?: () => void;
}

/** Minimal markdown-to-HTML renderer for contract documents */
function renderMarkdown(text: string): string {
  return text
    // Headings
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-8 mb-3 border-b border-gray-300 pb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4 text-center">$1</h1>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="my-4 border-gray-300" />')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Tables (simple markdown tables)
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match
        .split("|")
        .filter((c) => c.trim() !== "")
        .map((c) => c.trim());
      // Check if it's a separator row
      if (cells.every((c) => /^[-:]+$/.test(c))) {
        return "";
      }
      const tag = "td";
      const cellHtml = cells
        .map((c) => `<${tag} class="border border-gray-300 px-3 py-1.5 text-sm">${c}</${tag}>`)
        .join("");
      return `<tr>${cellHtml}</tr>`;
    })
    // Wrap consecutive table rows
    .replace(
      /(<tr>.*?<\/tr>\n?)+/gs,
      (match) => `<table class="w-full border-collapse my-4 text-sm">${match}</table>`,
    )
    // Numbered lists
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-6 list-decimal text-sm mb-1">$2</li>')
    // Bullet lists with indent
    .replace(/^   - (.+)$/gm, '<li class="ml-12 list-disc text-sm mb-0.5">$1</li>')
    .replace(/^- (.+)$/gm, '<li class="ml-6 list-disc text-sm mb-1">$1</li>')
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p class="mb-3 text-sm leading-relaxed">')
    // Single newlines in context
    .replace(/\n/g, "<br/>");
}

export function ContractDocumentPreview({
  templateId,
  contractId,
  variables,
  onClose,
}: ContractDocumentPreviewProps) {
  const [isPrintView, setIsPrintView] = useState(false);

  const templateDoc = useTemplateDocument(templateId || "", variables);
  const contractDoc = useContractDocument(contractId || "");

  const doc = templateId ? templateDoc : contractDoc;
  const documentContent = doc.data?.document;
  const title = templateId
    ? doc.data?.template_name || "Template Preview"
    : `Contract ${doc.data?.contract_number || ""}`;

  if (doc.isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-bg-muted rounded w-1/3 mx-auto" />
            <div className="h-4 bg-bg-muted rounded w-2/3" />
            <div className="h-4 bg-bg-muted rounded w-full" />
            <div className="h-4 bg-bg-muted rounded w-5/6" />
            <div className="h-4 bg-bg-muted rounded w-full" />
            <div className="h-4 bg-bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (doc.error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-text-error">
            <p>Failed to load document: {doc.error.message}</p>
            {onClose && (
              <Button variant="ghost" onClick={onClose} className="mt-4">
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!documentContent) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-text-muted">
            <span className="text-4xl mb-4 block">📄</span>
            <p>{doc.data?.message || "No document content available for this template."}</p>
            {onClose && (
              <Button variant="ghost" onClick={onClose} className="mt-4">
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const handlePrint = () => {
    setIsPrintView(true);
    setTimeout(() => {
      window.print();
      setIsPrintView(false);
    }, 100);
  };

  return (
    <div className={isPrintView ? "print-mode" : ""}>
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="flex flex-row items-center justify-between print:hidden">
          <CardTitle className="flex items-center gap-2">
            <span>📄</span> {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handlePrint}>
              Print / PDF
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          {/* Contract Document Content */}
          <div
            className="contract-document prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: `<p class="mb-3 text-sm leading-relaxed">${renderMarkdown(documentContent)}</p>`,
            }}
          />

          {/* Terms summary (below document) */}
          {doc.data?.terms_and_conditions && (
            <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg print:bg-white print:border-gray-300">
              <h3 className="font-semibold text-amber-800 mb-2">Key Terms Summary</h3>
              <p className="text-sm text-amber-700">{doc.data.terms_and_conditions}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
