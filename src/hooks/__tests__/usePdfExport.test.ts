import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePdfExport } from "../usePdfExport";

// Mock jspdf module with a real class
vi.mock("jspdf", () => {
  class MockJsPDF {
    text = vi.fn();
    save = vi.fn();
    addPage = vi.fn();
  }
  return { jsPDF: MockJsPDF };
});

describe("usePdfExport", () => {
  it("returns expected API", () => {
    const { result } = renderHook(() => usePdfExport());
    expect(result.current.createPdf).toBeInstanceOf(Function);
    expect(result.current.exportPdf).toBeInstanceOf(Function);
    expect(result.current.isExporting).toBe(false);
  });

  it("createPdf returns a jsPDF instance", async () => {
    const { result } = renderHook(() => usePdfExport());
    const doc = await result.current.createPdf();
    expect(doc).toBeDefined();
    expect(doc.save).toBeDefined();
  });

  it("exportPdf manages isExporting state", async () => {
    const { result } = renderHook(() => usePdfExport());

    let resolveGenerator: () => void;
    const generatorPromise = new Promise<void>((resolve) => {
      resolveGenerator = resolve;
    });

    const exportPromise = act(async () => {
      await result.current.exportPdf(async (doc) => {
        expect(doc).toBeDefined();
        await generatorPromise;
      });
    });

    // isExporting should be true during generation
    // (can't reliably check mid-async in test, but verify it resets)
    resolveGenerator!();
    await exportPromise;

    expect(result.current.isExporting).toBe(false);
  });

  it("exportPdf resets isExporting on error", async () => {
    const { result } = renderHook(() => usePdfExport());

    await act(async () => {
      try {
        await result.current.exportPdf(() => {
          throw new Error("PDF generation failed");
        });
      } catch {
        // Expected
      }
    });

    expect(result.current.isExporting).toBe(false);
  });
});
