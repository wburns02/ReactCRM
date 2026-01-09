/**
 * PaymentLinkGenerator Component
 *
 * Generate shareable payment links, QR codes, and send via email/SMS.
 */

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Label } from '@/components/ui/Label.tsx';
import { Tabs, TabList, TabTrigger, TabContent } from '@/components/ui/Tabs.tsx';
import { cn } from '@/lib/utils.ts';
import { formatCurrency } from './utils/pricingEngine.ts';
import {
  useGeneratePaymentLink,
  useSendInvoiceEmail,
  useSendPaymentLinkSMS,
} from './hooks/usePayments.ts';

// ============================================================================
// TYPES
// ============================================================================

export interface PaymentLinkGeneratorProps {
  /** Invoice ID to generate link for */
  invoiceId: string;
  /** Amount for display */
  amount: number;
  /** Customer email */
  customerEmail?: string;
  /** Customer phone */
  customerPhone?: string;
  /** Customer name for display */
  customerName?: string;
  /** Callback when link is sent */
  onLinkSent?: (method: 'email' | 'sms' | 'copy') => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PaymentLinkGenerator({
  invoiceId,
  amount,
  customerEmail = '',
  customerPhone = '',
  customerName,
  onLinkSent,
  className,
}: PaymentLinkGeneratorProps) {
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sendMethod, setSendMethod] = useState<'email' | 'sms'>('email');
  const [email, setEmail] = useState(customerEmail);
  const [phone, setPhone] = useState(customerPhone);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const generateLinkMutation = useGeneratePaymentLink();
  const sendEmailMutation = useSendInvoiceEmail();
  const sendSMSMutation = useSendPaymentLinkSMS();

  // Generate payment link on mount
  useEffect(() => {
    handleGenerateLink();
  }, [invoiceId]);

  // Generate payment link
  const handleGenerateLink = async () => {
    setErrorMessage(null);

    try {
      const result = await generateLinkMutation.mutateAsync(invoiceId);
      setPaymentLink(result.url);
      setExpiresAt(result.expiresAt);

      // Generate QR code (using a simple QR code API for demo)
      if (result.qrCodeDataUrl) {
        setQrCodeUrl(result.qrCodeDataUrl);
      } else {
        // Generate QR code via external service as fallback
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(result.url)}`;
        setQrCodeUrl(qrApiUrl);
      }
    } catch (error) {
      setErrorMessage('Failed to generate payment link');
    }
  };

  // Copy link to clipboard
  const handleCopyLink = async () => {
    if (!paymentLink) return;

    try {
      await navigator.clipboard.writeText(paymentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onLinkSent?.('copy');
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = paymentLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Send link via email
  const handleSendEmail = async () => {
    if (!email) {
      setErrorMessage('Please enter an email address');
      return;
    }

    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await sendEmailMutation.mutateAsync({
        invoiceId,
        email,
        includePaymentLink: true,
      });
      setSuccessMessage(`Payment link sent to ${email}`);
      onLinkSent?.('email');
    } catch {
      setErrorMessage('Failed to send email');
    }
  };

  // Send link via SMS
  const handleSendSMS = async () => {
    if (!phone) {
      setErrorMessage('Please enter a phone number');
      return;
    }

    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await sendSMSMutation.mutateAsync({
        invoiceId,
        phoneNumber: phone,
      });
      setSuccessMessage(`Payment link sent to ${phone}`);
      onLinkSent?.('sms');
    } catch {
      setErrorMessage('Failed to send SMS');
    }
  };

  // Format expiration date
  const formatExpiration = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 1) {
      return `Expires in ${days} days`;
    } else if (days === 1) {
      return 'Expires tomorrow';
    } else {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours > 0) {
        return `Expires in ${hours} hours`;
      }
      return 'Expires soon';
    }
  };

  // Format phone number for display
  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </svg>
          Payment Link
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 p-4 bg-success/10 border border-success/30 rounded-lg">
            <p className="text-success flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22,4 12,14.01 9,11.01" />
              </svg>
              {successMessage}
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-4 bg-danger/10 border border-danger/30 rounded-lg">
            <p className="text-danger flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {errorMessage}
            </p>
          </div>
        )}

        {/* Amount & Customer Info */}
        <div className="mb-6 p-4 bg-bg-hover/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Invoice #{invoiceId}</p>
              {customerName && (
                <p className="font-medium">{customerName}</p>
              )}
            </div>
            <p className="text-2xl font-bold text-primary">{formatCurrency(amount)}</p>
          </div>
        </div>

        {/* Generated Link */}
        {generateLinkMutation.isPending ? (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                opacity="0.25"
              />
              <path
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        ) : paymentLink ? (
          <div className="space-y-6">
            {/* Link Display */}
            <div>
              <Label>Payment Link</Label>
              <div className="flex gap-2 mt-1">
                <div className="flex-1 relative">
                  <Input
                    value={paymentLink}
                    readOnly
                    className="pr-20 font-mono text-sm"
                  />
                </div>
                <Button
                  variant={copied ? 'primary' : 'secondary'}
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-2"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="20,6 9,17 4,12" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-2"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                      Copy
                    </>
                  )}
                </Button>
              </div>
              {expiresAt && (
                <p className="text-xs text-text-muted mt-1">
                  {formatExpiration(expiresAt)}
                </p>
              )}
            </div>

            {/* QR Code */}
            {qrCodeUrl && (
              <div className="flex flex-col items-center">
                <p className="text-sm text-text-secondary mb-2">Scan to pay</p>
                <div className="p-4 bg-white rounded-lg border">
                  <img
                    src={qrCodeUrl}
                    alt="Payment QR Code"
                    className="w-48 h-48"
                  />
                </div>
              </div>
            )}

            {/* Send Options */}
            <div className="border-t border-border pt-6">
              <h4 className="font-medium mb-4">Send Payment Link</h4>

              <Tabs value={sendMethod} onValueChange={(v) => setSendMethod(v as 'email' | 'sms')}>
                <TabList className="mb-4">
                  <TabTrigger value="email">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-2"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    Email
                  </TabTrigger>
                  <TabTrigger value="sms">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-2"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                    SMS
                  </TabTrigger>
                </TabList>

                {/* Email Form */}
                <TabContent value="email">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="recipient-email">Email Address</Label>
                      <Input
                        id="recipient-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="customer@example.com"
                        className="mt-1"
                      />
                    </div>
                    <Button
                      variant="primary"
                      onClick={handleSendEmail}
                      disabled={!email || sendEmailMutation.isPending}
                      className="w-full"
                    >
                      {sendEmailMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                              opacity="0.25"
                            />
                            <path
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                          Sending...
                        </span>
                      ) : (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-2"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22,2 15,22 11,13 2,9 22,2" />
                          </svg>
                          Send Email
                        </>
                      )}
                    </Button>
                  </div>
                </TabContent>

                {/* SMS Form */}
                <TabContent value="sms">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="recipient-phone">Phone Number</Label>
                      <Input
                        id="recipient-phone"
                        type="tel"
                        value={formatPhoneNumber(phone)}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="(555) 555-5555"
                        className="mt-1"
                      />
                    </div>
                    <Button
                      variant="primary"
                      onClick={handleSendSMS}
                      disabled={!phone || sendSMSMutation.isPending}
                      className="w-full"
                    >
                      {sendSMSMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                              opacity="0.25"
                            />
                            <path
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                          Sending...
                        </span>
                      ) : (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-2"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                          </svg>
                          Send SMS
                        </>
                      )}
                    </Button>
                  </div>
                </TabContent>
              </Tabs>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-text-secondary mb-4">No payment link generated</p>
            <Button onClick={handleGenerateLink}>Generate Link</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PaymentLinkGenerator;
