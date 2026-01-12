/**
 * QR Code Generator Component
 *
 * QR code for in-field surveys:
 * - Generate QR code for survey link
 * - Download as PNG
 * - Customizable with logo
 * - Tracking UTM parameters
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils.ts";

// Types
export interface UTMParameters {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export interface QRCodeConfig {
  size: number;
  foregroundColor: string;
  backgroundColor: string;
  errorCorrectionLevel: "L" | "M" | "Q" | "H";
  margin: number;
  logoUrl?: string;
  logoSize?: number;
}

export interface QRCodeGeneratorProps {
  surveyUrl: string;
  surveyName: string;
  onClose?: () => void;
}

// Default configuration
const DEFAULT_CONFIG: QRCodeConfig = {
  size: 256,
  foregroundColor: "#000000",
  backgroundColor: "#FFFFFF",
  errorCorrectionLevel: "M",
  margin: 4,
  logoSize: 50,
};

// Simple QR Code Generation using Canvas
// This is a simplified implementation. In production, you'd use a library like qrcode.react
function generateQRMatrix(data: string, _errorLevel?: string): boolean[][] {
  void _errorLevel; // Reserved for future error correction implementation
  // This is a placeholder that creates a visual pattern
  // In production, use a proper QR code library
  const size = 33; // Standard QR size for version 4
  const matrix: boolean[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill(false));

  // Add finder patterns (the three corner squares)
  const addFinderPattern = (startX: number, startY: number) => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        const isEdge = i === 0 || i === 6 || j === 0 || j === 6;
        const isCenter = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        matrix[startY + i][startX + j] = isEdge || isCenter;
      }
    }
  };

  addFinderPattern(0, 0);
  addFinderPattern(size - 7, 0);
  addFinderPattern(0, size - 7);

  // Add timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Add data pattern based on input string
  const hash = data
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  for (let i = 8; i < size - 8; i++) {
    for (let j = 8; j < size - 8; j++) {
      if (i !== 6 && j !== 6) {
        matrix[i][j] = (i * j + hash) % 3 === 0;
      }
    }
  }

  return matrix;
}

// Canvas QR Code Component
function QRCodeCanvas({
  data,
  config,
}: {
  data: string;
  config: QRCodeConfig;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const matrix = generateQRMatrix(data, config.errorCorrectionLevel);
    const moduleSize = (config.size - config.margin * 2) / matrix.length;

    // Clear canvas
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, config.size, config.size);

    // Draw QR code modules
    ctx.fillStyle = config.foregroundColor;
    for (let i = 0; i < matrix.length; i++) {
      for (let j = 0; j < matrix[i].length; j++) {
        if (matrix[i][j]) {
          ctx.fillRect(
            config.margin + j * moduleSize,
            config.margin + i * moduleSize,
            moduleSize,
            moduleSize,
          );
        }
      }
    }

    // Add logo if provided
    if (config.logoUrl && config.logoSize) {
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      logoImg.onload = () => {
        const logoX = (config.size - config.logoSize!) / 2;
        const logoY = (config.size - config.logoSize!) / 2;

        // Draw white background for logo
        ctx.fillStyle = config.backgroundColor;
        ctx.fillRect(
          logoX - 4,
          logoY - 4,
          config.logoSize! + 8,
          config.logoSize! + 8,
        );

        // Draw logo
        ctx.drawImage(
          logoImg,
          logoX,
          logoY,
          config.logoSize!,
          config.logoSize!,
        );
      };
      logoImg.src = config.logoUrl;
    }
  }, [data, config]);

  return (
    <canvas
      ref={canvasRef}
      width={config.size}
      height={config.size}
      className="rounded-lg"
    />
  );
}

// UTM Builder Component
function UTMBuilder({
  params,
  onChange,
}: {
  params: UTMParameters;
  onChange: (params: UTMParameters) => void;
}) {
  const fields: {
    key: keyof UTMParameters;
    label: string;
    placeholder: string;
  }[] = [
    {
      key: "utm_source",
      label: "Source",
      placeholder: "e.g., qr_code, print, event",
    },
    {
      key: "utm_medium",
      label: "Medium",
      placeholder: "e.g., offline, flyer, poster",
    },
    {
      key: "utm_campaign",
      label: "Campaign",
      placeholder: "e.g., q1_feedback, store_survey",
    },
    { key: "utm_term", label: "Term", placeholder: "Optional keyword" },
    {
      key: "utm_content",
      label: "Content",
      placeholder: "e.g., version_a, blue_design",
    },
  ];

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-text-primary">UTM Parameters</h4>
      <p className="text-sm text-text-muted">Track where responses come from</p>
      <div className="grid grid-cols-2 gap-3">
        {fields.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              {label}
            </label>
            <input
              type="text"
              value={params[key] || ""}
              onChange={(e) => onChange({ ...params, [key]: e.target.value })}
              placeholder={placeholder}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Style Customizer Component
function StyleCustomizer({
  config,
  onChange,
}: {
  config: QRCodeConfig;
  onChange: (config: QRCodeConfig) => void;
}) {
  const sizes = [
    { value: 128, label: "Small (128px)" },
    { value: 256, label: "Medium (256px)" },
    { value: 512, label: "Large (512px)" },
    { value: 1024, label: "Print (1024px)" },
  ];

  const errorLevels: {
    value: QRCodeConfig["errorCorrectionLevel"];
    label: string;
    description: string;
  }[] = [
    {
      value: "L",
      label: "Low (7%)",
      description: "Smaller QR, less error recovery",
    },
    { value: "M", label: "Medium (15%)", description: "Balanced" },
    {
      value: "Q",
      label: "Quartile (25%)",
      description: "Good for printed materials",
    },
    {
      value: "H",
      label: "High (30%)",
      description: "Best for logos, high damage tolerance",
    },
  ];

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-text-primary">Customize QR Code</h4>

      {/* Size */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Size
        </label>
        <div className="grid grid-cols-4 gap-2">
          {sizes.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onChange({ ...config, size: value })}
              className={cn(
                "px-3 py-2 text-xs font-medium rounded-lg border transition-colors",
                config.size === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-text-secondary hover:bg-bg-hover",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Foreground Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={config.foregroundColor}
              onChange={(e) =>
                onChange({ ...config, foregroundColor: e.target.value })
              }
              className="w-10 h-10 rounded border border-border cursor-pointer"
            />
            <input
              type="text"
              value={config.foregroundColor}
              onChange={(e) =>
                onChange({ ...config, foregroundColor: e.target.value })
              }
              className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-bg-primary text-text-primary"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Background Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={config.backgroundColor}
              onChange={(e) =>
                onChange({ ...config, backgroundColor: e.target.value })
              }
              className="w-10 h-10 rounded border border-border cursor-pointer"
            />
            <input
              type="text"
              value={config.backgroundColor}
              onChange={(e) =>
                onChange({ ...config, backgroundColor: e.target.value })
              }
              className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-bg-primary text-text-primary"
            />
          </div>
        </div>
      </div>

      {/* Error Correction Level */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Error Correction
        </label>
        <div className="grid grid-cols-2 gap-2">
          {errorLevels.map(({ value, label, description }) => (
            <button
              key={value}
              onClick={() =>
                onChange({ ...config, errorCorrectionLevel: value })
              }
              className={cn(
                "px-3 py-2 text-left rounded-lg border transition-colors",
                config.errorCorrectionLevel === value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-bg-hover",
              )}
            >
              <span
                className={cn(
                  "text-sm font-medium",
                  config.errorCorrectionLevel === value
                    ? "text-primary"
                    : "text-text-primary",
                )}
              >
                {label}
              </span>
              <p className="text-xs text-text-muted mt-0.5">{description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Logo URL */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Logo URL (Optional)
        </label>
        <input
          type="url"
          value={config.logoUrl || ""}
          onChange={(e) => onChange({ ...config, logoUrl: e.target.value })}
          placeholder="https://example.com/logo.png"
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-text-muted mt-1">
          Adding a logo requires High error correction for reliable scanning
        </p>
      </div>
    </div>
  );
}

// Main Component
export function QRCodeGenerator({
  surveyUrl,
  surveyName,
  onClose,
}: QRCodeGeneratorProps) {
  const [config, setConfig] = useState<QRCodeConfig>(DEFAULT_CONFIG);
  const [utmParams, setUtmParams] = useState<UTMParameters>({
    utm_source: "qr_code",
    utm_medium: "offline",
  });
  const [activeTab, setActiveTab] = useState<
    "preview" | "customize" | "tracking"
  >("preview");

  // Build full URL with UTM parameters
  const fullUrl = useCallback(() => {
    const url = new URL(surveyUrl);
    Object.entries(utmParams).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  }, [surveyUrl, utmParams]);

  // Download QR Code as PNG
  const handleDownload = useCallback(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `${surveyName.replace(/\s+/g, "_")}_qr_code.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [surveyName]);

  // Copy URL to clipboard
  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(fullUrl());
  }, [fullUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-bg-card rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">
              QR Code Generator
            </h2>
            <p className="text-sm text-text-muted">{surveyName}</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-hover"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid md:grid-cols-2 gap-6 p-6">
            {/* QR Code Preview */}
            <div className="flex flex-col items-center">
              <div className="bg-white p-6 rounded-xl shadow-lg mb-4">
                <QRCodeCanvas data={fullUrl()} config={config} />
              </div>

              {/* Download and Copy Buttons */}
              <div className="flex gap-3 w-full max-w-xs">
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download PNG
                </button>
                <button
                  onClick={handleCopyUrl}
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-border text-text-secondary rounded-lg hover:bg-bg-hover transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
                  </svg>
                  Copy URL
                </button>
              </div>

              {/* URL Preview */}
              <div className="mt-4 w-full">
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Survey URL
                </label>
                <div className="p-3 bg-bg-hover rounded-lg text-xs text-text-secondary break-all font-mono">
                  {fullUrl()}
                </div>
              </div>
            </div>

            {/* Settings Panel */}
            <div>
              {/* Tabs */}
              <div className="flex gap-1 border-b border-border mb-4">
                {(["preview", "customize", "tracking"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize",
                      activeTab === tab
                        ? "border-primary text-primary"
                        : "border-transparent text-text-secondary hover:text-text-primary",
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === "preview" && (
                <div className="space-y-4">
                  <div className="p-4 bg-bg-hover rounded-lg">
                    <h4 className="font-medium text-text-primary mb-2">
                      Quick Stats
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-text-muted">Size:</span>
                        <span className="ml-2 text-text-primary">
                          {config.size}px
                        </span>
                      </div>
                      <div>
                        <span className="text-text-muted">Error Level:</span>
                        <span className="ml-2 text-text-primary">
                          {config.errorCorrectionLevel}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-muted">Has Logo:</span>
                        <span className="ml-2 text-text-primary">
                          {config.logoUrl ? "Yes" : "No"}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-muted">Tracking:</span>
                        <span className="ml-2 text-text-primary">
                          {Object.values(utmParams).filter(Boolean).length}{" "}
                          params
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-info/10 border border-info/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-info flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-info">
                          Usage Tips
                        </p>
                        <ul className="text-xs text-text-secondary mt-1 space-y-1 list-disc list-inside">
                          <li>
                            Use "Print (1024px)" size for printed materials
                          </li>
                          <li>High error correction allows for logo overlay</li>
                          <li>
                            Test scanning before printing large quantities
                          </li>
                          <li>UTM parameters help track offline conversions</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Print Sizes Reference */}
                  <div className="p-4 bg-bg-hover rounded-lg">
                    <h4 className="font-medium text-text-primary mb-2">
                      Recommended Print Sizes
                    </h4>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-text-muted text-left">
                          <th className="pb-2">Use Case</th>
                          <th className="pb-2">Min QR Size</th>
                          <th className="pb-2">Resolution</th>
                        </tr>
                      </thead>
                      <tbody className="text-text-secondary">
                        <tr>
                          <td className="py-1">Business Card</td>
                          <td>0.8" (2cm)</td>
                          <td>256px</td>
                        </tr>
                        <tr>
                          <td className="py-1">Flyer/Poster</td>
                          <td>1.5" (4cm)</td>
                          <td>512px</td>
                        </tr>
                        <tr>
                          <td className="py-1">Banner/Sign</td>
                          <td>3"+ (8cm+)</td>
                          <td>1024px</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "customize" && (
                <StyleCustomizer config={config} onChange={setConfig} />
              )}

              {activeTab === "tracking" && (
                <UTMBuilder params={utmParams} onChange={setUtmParams} />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-bg-secondary">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">
              Scan this QR code to test the survey link
            </p>
            <div className="flex gap-3">
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-bg-hover"
                >
                  Close
                </button>
              )}
              <button
                onClick={handleDownload}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark"
              >
                Download QR Code
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
