/**
 * AI Insights Panel
 * Anomaly detection, prescriptive insights, and predictions
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  useAIInsights,
  useDismissAnomaly,
  useExecuteInsightAction,
} from '@/api/hooks/useAnalytics';
import type { AnomalyAlert, PrescriptiveInsight, Prediction } from '@/api/types/analytics';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { getErrorMessage } from '@/api/client';

type InsightsTab = 'anomalies' | 'insights' | 'predictions';

export function AIInsightsPanel() {
  const [activeTab, setActiveTab] = useState<InsightsTab>('insights');
  const { data: aiData, isLoading } = useAIInsights();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">AI Insights</h1>
          <p className="text-text-secondary">
            Intelligent analysis and recommendations
          </p>
        </div>
        {aiData?.model_health && (
          <ModelHealthBadge health={aiData.model_health} />
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <TabButton
          active={activeTab === 'insights'}
          onClick={() => setActiveTab('insights')}
          count={aiData?.insights.length || 0}
          label="Actionable Insights"
          icon="💡"
        />
        <TabButton
          active={activeTab === 'anomalies'}
          onClick={() => setActiveTab('anomalies')}
          count={aiData?.anomalies.length || 0}
          label="Anomalies"
          icon="⚠️"
          variant={aiData?.anomalies.some((a) => a.severity === 'critical') ? 'danger' : 'default'}
        />
        <TabButton
          active={activeTab === 'predictions'}
          onClick={() => setActiveTab('predictions')}
          count={aiData?.predictions.length || 0}
          label="Predictions"
          icon="🔮"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-background-secondary animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {activeTab === 'anomalies' && (
            <AnomaliesTab anomalies={aiData?.anomalies || []} />
          )}
          {activeTab === 'insights' && (
            <InsightsTab insights={aiData?.insights || []} />
          )}
          {activeTab === 'predictions' && (
            <PredictionsTab predictions={aiData?.predictions || []} />
          )}
        </>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  count,
  label,
  icon,
  variant = 'default',
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  label: string;
  icon: string;
  variant?: 'default' | 'danger';
}) {
  return (
    <Button
      variant={active ? 'primary' : 'ghost'}
      onClick={onClick}
      className="flex items-center gap-2"
    >
      <span>{icon}</span>
      {label}
      <Badge
        className={cn(
          'text-xs',
          active
            ? 'bg-white/20 text-white'
            : variant === 'danger' && count > 0
            ? 'bg-error text-white'
            : 'bg-text-muted/20'
        )}
      >
        {count}
      </Badge>
    </Button>
  );
}

function ModelHealthBadge({
  health,
}: {
  health: { last_trained: string; prediction_accuracy: number; data_quality_score: number };
}) {
  const isHealthy = health.prediction_accuracy >= 0.8 && health.data_quality_score >= 0.8;

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-1">
        <span className={cn(
          'w-2 h-2 rounded-full',
          isHealthy ? 'bg-success' : 'bg-warning'
        )} />
        <span className="text-text-muted">Model Health</span>
      </div>
      <Badge variant="outline">
        {(health.prediction_accuracy * 100).toFixed(0)}% accuracy
      </Badge>
      <Badge variant="outline">
        {(health.data_quality_score * 100).toFixed(0)}% data quality
      </Badge>
    </div>
  );
}

function AnomaliesTab({ anomalies }: { anomalies: AnomalyAlert[] }) {
  const dismissAnomaly = useDismissAnomaly();

  const handleDismiss = async (anomalyId: string) => {
    try {
      await dismissAnomaly.mutateAsync({ anomaly_id: anomalyId });
    } catch (error) {
      alert(`Error: ${getErrorMessage(error)}`);
    }
  };

  // Sort by severity
  const sortedAnomalies = [...anomalies].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  if (anomalies.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <span className="text-4xl">✅</span>
          <p className="text-lg font-medium mt-4">No anomalies detected</p>
          <p className="text-text-secondary mt-1">
            All metrics are within expected ranges
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sortedAnomalies.map((anomaly) => (
        <AnomalyCard
          key={anomaly.id}
          anomaly={anomaly}
          onDismiss={() => handleDismiss(anomaly.id)}
          isDismissing={dismissAnomaly.isPending}
        />
      ))}
    </div>
  );
}

function AnomalyCard({
  anomaly,
  onDismiss,
  isDismissing,
}: {
  anomaly: AnomalyAlert;
  onDismiss: () => void;
  isDismissing: boolean;
}) {
  const severityStyles = {
    critical: 'border-error bg-error/5',
    warning: 'border-warning bg-warning/5',
    info: 'border-info bg-info/5',
  };

  const typeIcons: Record<string, string> = {
    revenue_drop: '📉',
    cost_spike: '💸',
    productivity_decline: '📊',
    churn_risk: '🚪',
    demand_surge: '📈',
  };

  return (
    <Card className={cn('border-l-4', severityStyles[anomaly.severity])}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{typeIcons[anomaly.type] || '⚠️'}</span>
              <div>
                <h3 className="font-semibold">{anomaly.title}</h3>
                <p className="text-sm text-text-secondary">{anomaly.description}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-text-muted">Expected</p>
                <p className="font-medium">{formatMetricValue(anomaly.expected_value)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Actual</p>
                <p className={cn(
                  'font-medium',
                  anomaly.deviation_pct < 0 ? 'text-error' : 'text-success'
                )}>
                  {formatMetricValue(anomaly.actual_value)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Deviation</p>
                <p className={cn(
                  'font-medium',
                  anomaly.deviation_pct < 0 ? 'text-error' : 'text-success'
                )}>
                  {anomaly.deviation_pct > 0 ? '+' : ''}{anomaly.deviation_pct.toFixed(1)}%
                </p>
              </div>
            </div>

            {anomaly.recommended_action && (
              <div className="mt-4 p-3 bg-background rounded-lg">
                <p className="text-xs text-text-muted">Recommended Action</p>
                <p className="text-sm">{anomaly.recommended_action}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 ml-4">
            <Badge className={cn(
              anomaly.severity === 'critical' ? 'bg-error text-white' :
              anomaly.severity === 'warning' ? 'bg-warning text-white' :
              'bg-info text-white'
            )}>
              {anomaly.severity}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              disabled={isDismissing}
            >
              Dismiss
            </Button>
          </div>
        </div>

        <p className="text-xs text-text-muted mt-4">
          Detected {formatDate(anomaly.detected_at)}
        </p>
      </CardContent>
    </Card>
  );
}

function InsightsTab({ insights }: { insights: PrescriptiveInsight[] }) {
  const executeAction = useExecuteInsightAction();

  const handleExecute = async (
    insightId: string,
    actionType: string,
    params?: Record<string, unknown>
  ) => {
    try {
      await executeAction.mutateAsync({
        insight_id: insightId,
        action_type: actionType,
        action_params: params,
      });
    } catch (error) {
      alert(`Error: ${getErrorMessage(error)}`);
    }
  };

  const categoryIcons: Record<string, string> = {
    revenue: '💰',
    efficiency: '⚡',
    customer: '👥',
    cost: '💸',
    staffing: '👷',
  };

  if (insights.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <span className="text-4xl">🔍</span>
          <p className="text-lg font-medium mt-4">No insights available</p>
          <p className="text-text-secondary mt-1">
            Check back later for AI-generated recommendations
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {insights.map((insight) => (
        <Card key={insight.id}>
          <CardContent className="pt-4">
            <div className="flex items-start gap-4">
              <span className="text-3xl">{categoryIcons[insight.category] || '💡'}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{insight.title}</h3>
                  <Badge variant="outline">{insight.category}</Badge>
                  <Badge className="bg-success text-white text-xs">
                    {(insight.confidence * 100).toFixed(0)}% confidence
                  </Badge>
                </div>
                <p className="text-sm text-text-secondary mt-1">{insight.insight}</p>
                <p className="text-sm text-success mt-2">
                  Impact: {insight.impact}
                  {insight.estimated_value && (
                    <span className="font-medium ml-1">
                      ({formatCurrency(insight.estimated_value)} potential)
                    </span>
                  )}
                </p>

                {insight.actions.length > 0 && (
                  <div className="mt-4 flex gap-2">
                    {insight.actions.map((action, i) => (
                      <Button
                        key={i}
                        variant={i === 0 ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() =>
                          handleExecute(insight.id, action.action_type, action.params)
                        }
                        disabled={executeAction.isPending}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PredictionsTab({ predictions }: { predictions: Prediction[] }) {
  if (predictions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <span className="text-4xl">🔮</span>
          <p className="text-lg font-medium mt-4">No predictions available</p>
          <p className="text-text-secondary mt-1">
            Predictions will appear once enough data is collected
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {predictions.map((pred, i) => (
        <PredictionCard key={i} prediction={pred} />
      ))}
    </div>
  );
}

function PredictionCard({ prediction }: { prediction: Prediction }) {
  const hasActual = prediction.actual_value !== null && prediction.actual_value !== undefined;
  const accuracy = hasActual && prediction.predicted_value !== 0
    ? 100 - Math.abs((prediction.predicted_value - prediction.actual_value!) / prediction.predicted_value * 100)
    : null;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{formatMetricLabel(prediction.metric)}</h3>
          <Badge variant="outline">{prediction.period}</Badge>
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <p className="text-xs text-text-muted">Predicted</p>
            <p className="text-3xl font-bold">{formatMetricValue(prediction.predicted_value)}</p>
            <p className="text-xs text-text-muted mt-1">
              Range: {formatMetricValue(prediction.confidence_interval.low)} - {formatMetricValue(prediction.confidence_interval.high)}
            </p>
          </div>

          {hasActual && (
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-muted">Actual</p>
                  <p className="text-xl font-medium">{formatMetricValue(prediction.actual_value!)}</p>
                </div>
                {accuracy !== null && (
                  <Badge className={cn(
                    accuracy >= 90 ? 'bg-success text-white' :
                    accuracy >= 80 ? 'bg-info text-white' :
                    accuracy >= 70 ? 'bg-warning text-white' :
                    'bg-error text-white'
                  )}>
                    {accuracy.toFixed(0)}% accurate
                  </Badge>
                )}
              </div>
            </div>
          )}

          {prediction.accuracy_score !== null && prediction.accuracy_score !== undefined && (
            <div className="pt-2">
              <p className="text-xs text-text-muted">Model Accuracy for this metric</p>
              <div className="mt-1 h-2 bg-background-secondary rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    prediction.accuracy_score >= 0.9 ? 'bg-success' :
                    prediction.accuracy_score >= 0.8 ? 'bg-info' :
                    prediction.accuracy_score >= 0.7 ? 'bg-warning' : 'bg-error'
                  )}
                  style={{ width: `${prediction.accuracy_score * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function formatMetricLabel(metric: string): string {
  return metric
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatMetricValue(value: number): string {
  if (value >= 1000000) {
    return formatCurrency(value);
  }
  if (value >= 1000) {
    return value.toLocaleString();
  }
  if (value < 1 && value > 0) {
    return `${(value * 100).toFixed(1)}%`;
  }
  return value.toFixed(1);
}
