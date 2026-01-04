import { useWorkOrderCostSummary, useWorkOrderProfitability, COST_TYPES } from '../api/jobCosting.ts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { formatCurrency } from '@/lib/utils.ts';

interface JobCostSummaryProps {
  workOrderId: string;
  showProfitability?: boolean;
}

export function JobCostSummary({ workOrderId, showProfitability = true }: JobCostSummaryProps) {
  const { data: summary, isLoading: loadingSummary } = useWorkOrderCostSummary(workOrderId);
  const { data: profitability, isLoading: loadingProfit } = useWorkOrderProfitability(workOrderId);

  const getCostTypeIcon = (type: string): string => {
    return COST_TYPES.find((t) => t.value === type)?.icon || '📋';
  };

  if (loadingSummary) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-bg-muted rounded w-1/3" />
            <div className="h-20 bg-bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-text-muted">
          No cost data available
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cost Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            💰 Cost Summary
            <Badge variant="info">{summary.cost_count} items</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Totals */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-3 bg-bg-hover rounded-lg text-center">
              <p className="text-sm text-text-muted">Total Costs</p>
              <p className="text-xl font-bold text-text-primary">
                {formatCurrency(summary.total_costs)}
              </p>
            </div>
            <div className="p-3 bg-bg-hover rounded-lg text-center">
              <p className="text-sm text-text-muted">Billable Amount</p>
              <p className="text-xl font-bold text-success">
                {formatCurrency(summary.total_billable)}
              </p>
            </div>
            <div className="p-3 bg-bg-hover rounded-lg text-center">
              <p className="text-sm text-text-muted">Markup</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(summary.total_billable - summary.total_costs)}
              </p>
            </div>
          </div>

          {/* Category breakdown */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-text-muted">Cost Breakdown</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 border border-border rounded flex items-center gap-2">
                <span>👷</span>
                <div>
                  <p className="text-xs text-text-muted">Labor</p>
                  <p className="font-medium text-text-primary">
                    {formatCurrency(summary.labor_costs)}
                  </p>
                </div>
              </div>
              <div className="p-2 border border-border rounded flex items-center gap-2">
                <span>📦</span>
                <div>
                  <p className="text-xs text-text-muted">Materials</p>
                  <p className="font-medium text-text-primary">
                    {formatCurrency(summary.material_costs)}
                  </p>
                </div>
              </div>
              <div className="p-2 border border-border rounded flex items-center gap-2">
                <span>📋</span>
                <div>
                  <p className="text-xs text-text-muted">Other</p>
                  <p className="font-medium text-text-primary">
                    {formatCurrency(summary.other_costs)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Type breakdown (if available) */}
          {Object.keys(summary.cost_breakdown).length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm font-medium text-text-muted mb-2">By Type</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.cost_breakdown).map(([type, amount]) => (
                  <div key={type} className="px-3 py-1 bg-bg-hover rounded-full text-sm flex items-center gap-1">
                    <span>{getCostTypeIcon(type)}</span>
                    <span className="capitalize">{type}:</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profitability */}
      {showProfitability && profitability && !loadingProfit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              📊 Profitability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-bg-hover rounded-lg text-center">
                <p className="text-sm text-text-muted">Revenue</p>
                <p className="text-xl font-bold text-text-primary">
                  {formatCurrency(profitability.revenue)}
                </p>
              </div>
              <div className="p-3 bg-bg-hover rounded-lg text-center">
                <p className="text-sm text-text-muted">Total Costs</p>
                <p className="text-xl font-bold text-danger">
                  {formatCurrency(profitability.total_costs)}
                </p>
              </div>
              <div className="p-3 bg-bg-hover rounded-lg text-center">
                <p className="text-sm text-text-muted">Gross Profit</p>
                <p className={`text-xl font-bold ${profitability.gross_profit >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatCurrency(profitability.gross_profit)}
                </p>
              </div>
              <div className="p-3 bg-bg-hover rounded-lg text-center">
                <p className="text-sm text-text-muted">Profit Margin</p>
                <p className={`text-xl font-bold ${profitability.profit_margin_percent >= 0 ? 'text-success' : 'text-danger'}`}>
                  {profitability.profit_margin_percent.toFixed(1)}%
                </p>
              </div>
            </div>

            {profitability.profit_margin_percent < 20 && profitability.profit_margin_percent >= 0 && (
              <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                <p className="text-sm text-warning">
                  ⚠️ Low profit margin. Consider reviewing pricing or reducing costs.
                </p>
              </div>
            )}

            {profitability.profit_margin_percent < 0 && (
              <div className="mt-4 p-3 bg-danger/10 border border-danger/30 rounded-lg">
                <p className="text-sm text-danger">
                  ❌ Negative margin - this job is operating at a loss.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
