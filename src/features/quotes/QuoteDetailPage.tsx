import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog.tsx';
import { useState } from 'react';
import {
  useQuote,
  useConvertQuoteToInvoice,
  useSendQuote,
} from '@/api/hooks/useQuotes.ts';
import { QUOTE_STATUS_LABELS, type QuoteStatus } from '@/api/types/quote.ts';

const STATUS_COLORS: Record<QuoteStatus, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  draft: 'default',
  sent: 'info',
  accepted: 'success',
  declined: 'danger',
  expired: 'warning',
};

export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showConvertDialog, setShowConvertDialog] = useState(false);

  const { data: quote, isLoading, error } = useQuote(id);
  const convertMutation = useConvertQuoteToInvoice();
  const sendMutation = useSendQuote();

  const handleConvertToContract = async () => {
    if (id) {
      const result = await convertMutation.mutateAsync(id);
      setShowConvertDialog(false);
      // Navigate to the new invoice/contract
      navigate(`/invoices/${result.invoice_id}`);
    }
  };

  const handleSendQuote = async () => {
    if (id) {
      await sendMutation.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            Loading quote...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">Error</div>
            <p className="text-danger mb-4">Failed to load quote.</p>
            <Link to="/quotes" className="text-primary hover:underline">
              Back to Quotes
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link to="/quotes" className="text-text-secondary hover:text-primary">
              Quotes
            </Link>
            <span className="text-text-secondary">/</span>
            <span className="text-text-primary font-medium">{quote.quote_number}</span>
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Quote {quote.quote_number}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {quote.status === 'draft' && (
            <Button
              variant="secondary"
              onClick={handleSendQuote}
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending ? 'Sending...' : 'Send to Customer'}
            </Button>
          )}
          {(quote.status === 'sent' || quote.status === 'accepted') && (
            <Button onClick={() => setShowConvertDialog(true)}>
              Convert to Contract
            </Button>
          )}
        </div>
      </div>

      {/* Quote Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-bg-subtle border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Service</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Description</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-text-secondary">Qty</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-text-secondary">Rate</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-text-secondary">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {quote.line_items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 font-medium text-text-primary">{item.service}</td>
                      <td className="px-4 py-3 text-text-secondary">{item.description || '-'}</td>
                      <td className="px-4 py-3 text-right text-text-primary">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-text-primary">${item.rate.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-medium text-text-primary">${item.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-bg-subtle">
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-text-secondary">Subtotal</td>
                    <td className="px-4 py-2 text-right font-medium text-text-primary">${quote.subtotal.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-text-secondary">Tax ({quote.tax_rate}%)</td>
                    <td className="px-4 py-2 text-right font-medium text-text-primary">${quote.tax.toFixed(2)}</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td colSpan={4} className="px-4 py-3 text-right font-semibold text-text-primary">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-lg text-primary">${quote.total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Notes */}
          {quote.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-text-secondary whitespace-pre-wrap">{quote.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Terms */}
          {quote.terms && (
            <Card>
              <CardHeader>
                <CardTitle>Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-text-secondary whitespace-pre-wrap">{quote.terms}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={STATUS_COLORS[quote.status]} className="text-base px-3 py-1">
                {QUOTE_STATUS_LABELS[quote.status]}
              </Badge>
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent>
              {quote.customer ? (
                <div className="space-y-2">
                  <p className="font-medium text-text-primary">
                    {quote.customer.first_name} {quote.customer.last_name}
                  </p>
                  {quote.customer.email && (
                    <p className="text-sm text-text-secondary">{quote.customer.email}</p>
                  )}
                  {quote.customer.phone && (
                    <p className="text-sm text-text-secondary">{quote.customer.phone}</p>
                  )}
                  <Link
                    to={`/customers/${quote.customer.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    View Customer
                  </Link>
                </div>
              ) : (
                <p className="text-text-secondary">{quote.customer_name || 'No customer assigned'}</p>
              )}
            </CardContent>
          </Card>

          {/* Quote Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-text-secondary">Valid Until</p>
                <p className="font-medium text-text-primary">
                  {quote.valid_until
                    ? new Date(quote.valid_until).toLocaleDateString()
                    : 'No expiration'}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Created</p>
                <p className="font-medium text-text-primary">
                  {quote.created_at
                    ? new Date(quote.created_at).toLocaleDateString()
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Last Updated</p>
                <p className="font-medium text-text-primary">
                  {quote.updated_at
                    ? new Date(quote.updated_at).toLocaleDateString()
                    : '-'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Convert to Contract Dialog */}
      <Dialog open={showConvertDialog} onClose={() => setShowConvertDialog(false)}>
        <DialogContent size="sm">
          <DialogHeader onClose={() => setShowConvertDialog(false)}>
            Convert to Contract
          </DialogHeader>
          <DialogBody>
            <p className="text-text-secondary">
              This will create an invoice from this quote and mark the quote as accepted.
              The customer will be notified of the new contract.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowConvertDialog(false)}
              disabled={convertMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConvertToContract}
              disabled={convertMutation.isPending}
            >
              {convertMutation.isPending ? 'Converting...' : 'Convert to Contract'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
