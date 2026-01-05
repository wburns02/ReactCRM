import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toastError } from '@/components/ui/Toast';
import { usePortalInvoices, usePayInvoice } from '@/api/hooks/usePortal';

/**
 * Customer Portal Invoices Page
 * View and pay invoices
 */
export function PortalInvoicesPage() {
  const { data: invoices = [], isLoading } = usePortalInvoices();
  const payMutation = usePayInvoice();
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [payingId, setPayingId] = useState<string | null>(null);

  const filteredInvoices = invoices.filter(inv => {
    if (filter === 'all') return true;
    if (filter === 'pending') return inv.status === 'pending' || inv.status === 'overdue';
    if (filter === 'paid') return inv.status === 'paid';
    return true;
  });

  const pendingInvoices = invoices.filter(inv => inv.status === 'pending' || inv.status === 'overdue');
  const totalDue = pendingInvoices.reduce((sum, inv) => sum + (inv.amount - inv.amount_paid), 0);

  const handlePayInvoice = async (invoiceId: string) => {
    setPayingId(invoiceId);
    try {
      const result = await payMutation.mutateAsync(invoiceId);
      // Redirect to Stripe payment page
      if (result.payment_url) {
        window.location.href = result.payment_url;
      }
    } catch (error) {
      console.error('Payment failed:', error);
      toastError('Failed to initiate payment. Please try again.');
    } finally {
      setPayingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Invoices</h1>
          <p className="text-text-secondary">View and pay your invoices online</p>
        </div>

        {/* Filter Buttons */}
        <div className="flex rounded-md overflow-hidden border border-border">
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-surface text-text-secondary hover:bg-surface-hover'
            }`}
            onClick={() => setFilter('all')}
          >
            All ({invoices.length})
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-primary text-white'
                : 'bg-surface text-text-secondary hover:bg-surface-hover'
            }`}
            onClick={() => setFilter('pending')}
          >
            Due ({pendingInvoices.length})
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              filter === 'paid'
                ? 'bg-primary text-white'
                : 'bg-surface text-text-secondary hover:bg-surface-hover'
            }`}
            onClick={() => setFilter('paid')}
          >
            Paid
          </button>
        </div>
      </div>

      {/* Outstanding Balance Summary */}
      {totalDue > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-text-muted">Total Outstanding Balance</p>
                <p className="text-3xl font-bold text-text-primary">
                  ${totalDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-text-secondary">
                  {pendingInvoices.length} invoice{pendingInvoices.length !== 1 ? 's' : ''} pending
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => pendingInvoices[0] && handlePayInvoice(pendingInvoices[0].id)}
                disabled={payMutation.isPending}
              >
                Pay All Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-text-muted mb-4">No invoices found</p>
            <Button onClick={() => setFilter('all')}>Show All</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map(inv => {
            const amountDue = inv.amount - inv.amount_paid;
            const isOverdue = inv.status === 'overdue';
            const isPaid = inv.status === 'paid';

            return (
              <Card key={inv.id} className={isOverdue ? 'border-red-200' : ''}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-text-primary text-lg">
                          Invoice #{inv.invoice_number}
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                          inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {inv.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-text-muted">
                        <span>
                          Created: {new Date(inv.created_at).toLocaleDateString()}
                        </span>
                        <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                          Due: {new Date(inv.due_date).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="mt-3 flex gap-6">
                        <div>
                          <p className="text-xs text-text-muted">Total</p>
                          <p className="font-medium text-text-primary">
                            ${inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        {inv.amount_paid > 0 && (
                          <div>
                            <p className="text-xs text-text-muted">Paid</p>
                            <p className="font-medium text-green-600">
                              ${inv.amount_paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        )}
                        {!isPaid && (
                          <div>
                            <p className="text-xs text-text-muted">Balance Due</p>
                            <p className={`font-bold ${isOverdue ? 'text-red-600' : 'text-text-primary'}`}>
                              ${amountDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      {!isPaid && (
                        <Button
                          onClick={() => handlePayInvoice(inv.id)}
                          disabled={payingId === inv.id}
                        >
                          {payingId === inv.id ? 'Processing...' : 'Pay Now'}
                        </Button>
                      )}
                      <Button variant="secondary" size="sm">
                        Download PDF
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Payment Methods Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Accepted Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 text-2xl">
            <span title="Visa">💳</span>
            <span title="Mastercard">💳</span>
            <span title="American Express">💳</span>
            <span title="Bank Transfer">🏦</span>
          </div>
          <p className="text-xs text-text-muted mt-2">
            Payments are securely processed through Stripe. We do not store your card information.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
