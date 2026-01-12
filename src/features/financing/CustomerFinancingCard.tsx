/**
 * Customer Financing Card Component
 * Shows financing options and allows sending financing link
 */
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
// Label available for future use in form fields
import {
  useFinancingOffers,
  useRequestFinancing,
  useGenerateFinancingLink,
} from "@/api/hooks/useFintech";
import { FINANCING_PROVIDER_LABELS } from "@/api/types/fintech";
import { formatCurrency } from "@/lib/utils";
import { getErrorMessage } from "@/api/client";
import { toastError } from "@/components/ui/Toast";

interface CustomerFinancingCardProps {
  customerId: string;
  customerEmail?: string;
  invoiceId?: string;
  amount: number;
  onFinancingApplied?: () => void;
}

export function CustomerFinancingCard({
  customerId,
  customerEmail,
  invoiceId,
  amount,
  onFinancingApplied,
}: CustomerFinancingCardProps) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: offers, isLoading } = useFinancingOffers(amount);
  const requestFinancing = useRequestFinancing();
  const generateLink = useGenerateFinancingLink();

  const handleRequestFinancing = async (provider: string) => {
    try {
      await requestFinancing.mutateAsync({
        customer_id: customerId,
        amount,
        invoice_id: invoiceId,
        provider: provider as "wisetack" | "affirm" | "greensky" | "internal",
      });
      onFinancingApplied?.();
    } catch (error) {
      toastError(getErrorMessage(error));
    }
  };

  const handleGenerateLink = async () => {
    try {
      const result = await generateLink.mutateAsync({
        customer_id: customerId,
        amount,
        invoice_id: invoiceId,
      });
      setGeneratedLink(result.link);
      setShowLinkDialog(true);
    } catch (error) {
      toastError(getErrorMessage(error));
    }
  };

  const handleCopyLink = async () => {
    if (generatedLink) {
      try {
        await navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback
        const textarea = document.createElement("textarea");
        textarea.value = generatedLink;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  if (amount <= 0) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Financing Options</CardTitle>
            <Badge variant="outline" className="text-success border-success">
              Available
            </Badge>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Offer your customer flexible payment options
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-text-secondary text-sm">Loading offers...</div>
          ) : !offers?.length ? (
            <div className="text-text-secondary text-sm">
              No financing options available for this amount
            </div>
          ) : (
            <div className="space-y-4">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium">
                        {FINANCING_PROVIDER_LABELS[offer.provider]}
                      </h4>
                      <p className="text-sm text-text-muted">
                        Finance {formatCurrency(offer.min_amount)} -{" "}
                        {formatCurrency(offer.max_amount)}
                      </p>
                    </div>
                    {offer.promo_apr !== null &&
                      offer.promo_apr !== undefined && (
                        <Badge className="bg-success/10 text-success">
                          {offer.promo_apr === 0
                            ? "0% APR Promo"
                            : `${offer.promo_apr}% APR Promo`}
                        </Badge>
                      )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {offer.terms.slice(0, 3).map((term) => {
                      const monthlyPayment =
                        (amount / 1000) * term.monthly_payment_per_1000;
                      return (
                        <div
                          key={term.term_months}
                          className="text-center p-2 bg-background-secondary rounded"
                        >
                          <div className="text-lg font-semibold">
                            {formatCurrency(monthlyPayment)}
                          </div>
                          <div className="text-xs text-text-muted">
                            {term.term_months} mo @ {term.apr}%
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleRequestFinancing(offer.provider)}
                    disabled={requestFinancing.isPending}
                  >
                    {requestFinancing.isPending
                      ? "Processing..."
                      : "Send Application"}
                  </Button>
                </div>
              ))}

              <div className="border-t border-border pt-4 mt-4">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleGenerateLink}
                  disabled={generateLink.isPending}
                >
                  {generateLink.isPending
                    ? "Generating..."
                    : "Generate Financing Link"}
                </Button>
                <p className="text-xs text-text-muted text-center mt-2">
                  Send a link for customer to apply on their own
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Financing Application Link</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-text-secondary mb-4">
              Share this link with your customer to apply for financing:
            </p>
            <div className="relative">
              <Input value={generatedLink || ""} readOnly className="pr-20" />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1"
                onClick={handleCopyLink}
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            {customerEmail && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    window.location.href = `mailto:${customerEmail}?subject=Financing Options for Your Service&body=Apply for financing here: ${generatedLink}`;
                  }}
                >
                  Send via Email
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowLinkDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
