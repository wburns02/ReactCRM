import { useState, useCallback } from "react";

type JsPDFType = InstanceType<typeof import("jspdf").jsPDF>;

/**
 * Lazy-loading PDF export hook.
 * Dynamically imports jsPDF only when needed, keeping it out of the main bundle.
 *
 * Returns a `createPdf` helper that loads jsPDF on demand and returns a doc instance,
 * plus an `isExporting` flag for UI loading states.
 */
export function usePdfExport() {
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Lazily create a jsPDF document. Call this inside your export handler.
   * Remember to call `doc.save(filename)` when done.
   */
  const createPdf = useCallback(async (): Promise<JsPDFType> => {
    const { jsPDF } = await import("jspdf");
    return new jsPDF();
  }, []);

  /**
   * Wrap an async PDF generation function with loading state management.
   * The callback receives a fresh jsPDF instance.
   */
  const exportPdf = useCallback(
    async (generator: (doc: JsPDFType) => void | Promise<void>) => {
      setIsExporting(true);
      try {
        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF();
        await generator(doc);
      } finally {
        setIsExporting(false);
      }
    },
    [],
  );

  return { createPdf, exportPdf, isExporting };
}
