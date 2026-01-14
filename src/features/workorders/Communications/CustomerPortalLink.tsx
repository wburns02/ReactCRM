/**
 * CustomerPortalLink Component
 *
 * Generate and display self-service tracking links with QR codes.
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button.tsx";
import { Card } from "@/components/ui/Card.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Label } from "@/components/ui/Label.tsx";
import { Select } from "@/components/ui/Select.tsx";
import { useGeneratePortalLink } from "./hooks/useCommunications.ts";

interface CustomerPortalLinkProps {
  workOrderId: string;
  existingLink?: string;
  existingExpiration?: string;
}

export function CustomerPortalLink({
  workOrderId,
  existingLink,
  existingExpiration,
}: CustomerPortalLinkProps) {
  const [expirationHours, setExpirationHours] = useState<number>(72);
  const [portalLink, setPortalLink] = useState(existingLink || "");
  const [expiresAt, setExpiresAt] = useState(existingExpiration || "");
  const [qrCodeData, setQrCodeData] = useState("");
  const [copied, setCopied] = useState(false);

  const generateLink = useGeneratePortalLink();

  useEffect(() => {
    if (existingLink) {
      setPortalLink(existingLink);
      // Generate QR code for existing link
      generateQRCode(existingLink);
    }
    if (existingExpiration) {
      setExpiresAt(existingExpiration);
    }
  }, [existingLink, existingExpiration]);

  // Simple QR code generation using a public API
  // In production, this would use a library like qrcode.react
  const generateQRCode = (link: string) => {
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`;
    setQrCodeData(qrApiUrl);
  };

  const handleGenerate = async () => {
    try {
      const result = await generateLink.mutateAsync({
        workOrderId,
        expirationHours,
      });
      setPortalLink(result.link);
      setExpiresAt(result.expiresAt);
      setQrCodeData(result.qrCode || "");
      // If API doesn't return QR code, generate one
      if (!result.qrCode) {
        generateQRCode(result.link);
      }
    } catch (err) {
      console.error("Failed to generate portal link:", err);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(portalLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const formatExpiration = (isoDate: string) => {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Customer Portal Link</h3>
        <p className="text-sm text-text-secondary">
          Generate a secure self-service link for the customer to track their
          appointment
        </p>
      </div>

      {/* Link generation controls */}
      {!portalLink && (
        <Card className="p-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expiration">Link Expiration</Label>
              <Select
                id="expiration"
                value={expirationHours}
                onChange={(e) => setExpirationHours(Number(e.target.value))}
              >
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
                <option value={72}>72 hours (3 days)</option>
                <option value={168}>1 week</option>
                <option value={720}>30 days</option>
              </Select>
              <p className="text-xs text-text-secondary">
                Link will automatically expire after this time for security
              </p>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generateLink.isPending}
              className="w-full"
            >
              {generateLink.isPending ? (
                <>
                  <svg
                    className="w-4 h-4 mr-2 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  Generate Portal Link
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Generated link display */}
      {portalLink && (
        <Card
          className={`p-4 ${isExpired ? "border-danger/50 bg-danger/5" : ""}`}
        >
          <div className="space-y-4">
            {/* Status badge */}
            {isExpired && (
              <div className="flex items-center gap-2 p-2 bg-danger/10 rounded-lg text-danger text-sm">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                This link has expired. Generate a new one.
              </div>
            )}

            {/* Link input with copy button */}
            <div className="space-y-2">
              <Label>Tracking Link</Label>
              <div className="flex gap-2">
                <Input
                  value={portalLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="secondary"
                  onClick={handleCopy}
                  disabled={isExpired}
                >
                  {copied ? (
                    <svg
                      className="w-5 h-5 text-success"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </Button>
              </div>
              {copied && (
                <p className="text-xs text-success">Copied to clipboard!</p>
              )}
            </div>

            {/* Expiration info */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">Expires:</span>
              <span className={isExpired ? "text-danger" : "text-text-primary"}>
                {formatExpiration(expiresAt)}
              </span>
            </div>

            {/* QR Code */}
            {qrCodeData && !isExpired && (
              <div className="flex flex-col items-center pt-4 border-t border-border">
                <p className="text-sm font-medium mb-3">Scan QR Code</p>
                <div className="bg-white p-3 rounded-lg">
                  <img
                    src={qrCodeData}
                    alt="QR Code for portal link"
                    className="w-48 h-48"
                    loading="lazy"
                  />
                </div>
                <p className="text-xs text-text-secondary mt-2">
                  Customer can scan this code to access their portal
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={handleGenerate}
                disabled={generateLink.isPending}
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Regenerate
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => window.open(portalLink, "_blank")}
                disabled={isExpired}
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                Open
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* What the customer sees */}
      <Card className="p-4 bg-surface-secondary">
        <h4 className="text-sm font-medium mb-2">What the Customer Sees</h4>
        <ul className="text-sm text-text-secondary space-y-1">
          <li className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-success"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Real-time technician location on a map
          </li>
          <li className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-success"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Live ETA updates
          </li>
          <li className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-success"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Appointment details and status
          </li>
          <li className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-success"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Technician profile and contact info
          </li>
          <li className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-success"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Option to message or call the office
          </li>
        </ul>
      </Card>
    </div>
  );
}

export default CustomerPortalLink;
