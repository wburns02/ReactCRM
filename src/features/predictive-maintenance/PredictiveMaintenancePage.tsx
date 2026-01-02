import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import {
  usePredictionSummary,
  useMaintenancePredictions,
  useMaintenanceAlerts,
  useCreateFromPrediction,
  useRefreshPredictions,
  useMarkAlertRead,
  type MaintenancePrediction,
  type PredictionFilters,
} from '@/api/hooks/usePredictiveMaintenance';

/**
 * Risk Level Badge Component
 */
function RiskBadge({ level }: { level: MaintenancePrediction['risk_level'] }) {
  const colors = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[level]}`}>
      {level.charAt(0).toUpperCase() + level.slice(1)} Risk
    </span>
  );
}

/**
 * Prediction Card Component
 */
function PredictionCard({
  prediction,
  onCreateWorkOrder,
  isCreating,
}: {
  prediction: MaintenancePrediction;
  onCreateWorkOrder: (id: string) => void;
  isCreating: boolean;
}) {
  const navigate = useNavigate();

  return (
    <Card className={`border-l-4 ${
      prediction.risk_level === 'critical' ? 'border-l-red-500' :
      prediction.risk_level === 'high' ? 'border-l-orange-500' :
      prediction.risk_level === 'medium' ? 'border-l-yellow-500' :
      'border-l-green-500'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3
                className="font-semibold text-text-primary cursor-pointer hover:text-primary"
                onClick={() => navigate(`/customers/${prediction.customer_id}`)}
              >
                {prediction.customer_name}
              </h3>
              <RiskBadge level={prediction.risk_level} />
            </div>

            <p className="text-sm text-text-secondary mb-2">{prediction.address}</p>

            <div className="flex flex-wrap gap-4 text-sm text-text-muted">
              <span>Last Service: {new Date(prediction.last_service_date).toLocaleDateString()}</span>
              <span>|</span>
              <span className={prediction.days_until_service < 0 ? 'text-red-600 font-medium' : ''}>
                {prediction.days_until_service < 0
                  ? `${Math.abs(prediction.days_until_service)} days overdue`
                  : `Due in ${prediction.days_until_service} days`}
              </span>
            </div>

            {/* Risk Factors */}
            <div className="mt-3 flex flex-wrap gap-2">
              {prediction.factors.slice(0, 3).map((factor, i) => (
                <span
                  key={i}
                  className={`text-xs px-2 py-0.5 rounded ${
                    factor.impact === 'high' ? 'bg-red-50 text-red-600' :
                    factor.impact === 'medium' ? 'bg-yellow-50 text-yellow-600' :
                    'bg-gray-100 text-gray-600'
                  }`}
                >
                  {factor.name}
                </span>
              ))}
            </div>

            {/* Recommended Services */}
            <div className="mt-2 text-xs text-text-muted">
              Recommended: {prediction.recommended_services.join(', ')}
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold text-text-primary mb-1">
              {prediction.risk_score}%
            </div>
            <div className="text-xs text-text-muted mb-3">Risk Score</div>

            <div className="text-sm font-medium text-primary mb-3">
              Est. ${prediction.estimated_cost.toLocaleString()}
            </div>

            <Button
              size="sm"
              onClick={() => onCreateWorkOrder(prediction.id)}
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Schedule Service'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Alert Item Component
 */
function AlertItem({
  alert,
  onMarkRead,
}: {
  alert: { id: string; alert_type: string; severity: string; message: string; customer_name: string; is_read: boolean };
  onMarkRead: (id: string) => void;
}) {
  const icons = {
    overdue: '⚠️',
    upcoming: '📅',
    risk_increase: '📈',
    weather_impact: '🌧️',
  };

  const severityColors = {
    info: 'border-blue-200 bg-blue-50',
    warning: 'border-yellow-200 bg-yellow-50',
    urgent: 'border-red-200 bg-red-50',
  };

  return (
    <div
      className={`p-3 border rounded-lg ${severityColors[alert.severity as keyof typeof severityColors] || 'border-gray-200'} ${
        alert.is_read ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg">{icons[alert.alert_type as keyof typeof icons] || '🔔'}</span>
        <div className="flex-1">
          <div className="font-medium text-sm">{alert.customer_name}</div>
          <div className="text-xs text-text-secondary">{alert.message}</div>
        </div>
        {!alert.is_read && (
          <button
            onClick={() => onMarkRead(alert.id)}
            className="text-xs text-primary hover:underline"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Predictive Maintenance Dashboard Page
 */
export function PredictiveMaintenancePage() {
  const [filters, setFilters] = useState<PredictionFilters>({
    page: 1,
    page_size: 20,
  });
  const [creatingForId, setCreatingForId] = useState<string | null>(null);

  // Queries
  const { data: summary, isLoading: summaryLoading } = usePredictionSummary();
  const { data: predictions, isLoading: predictionsLoading, refetch } = useMaintenancePredictions(filters);
  const { data: alerts = [] } = useMaintenanceAlerts(false);

  // Mutations
  const createWorkOrder = useCreateFromPrediction();
  const refreshPredictions = useRefreshPredictions();
  const markAlertRead = useMarkAlertRead();

  const handleCreateWorkOrder = async (predictionId: string) => {
    setCreatingForId(predictionId);
    try {
      await createWorkOrder.mutateAsync(predictionId);
      refetch();
    } catch (error) {
      console.error('Failed to create work order:', error);
    } finally {
      setCreatingForId(null);
    }
  };

  const handleRefresh = async () => {
    await refreshPredictions.mutateAsync();
    refetch();
  };

  const handleMarkRead = async (alertId: string) => {
    await markAlertRead.mutateAsync(alertId);
  };

  const unreadAlerts = alerts.filter(a => !a.is_read);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Predictive Maintenance</h1>
          <p className="text-text-secondary">AI-powered service predictions and risk analysis</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshPredictions.isPending}
          variant="secondary"
        >
          {refreshPredictions.isPending ? 'Refreshing...' : '🔄 Refresh Predictions'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-red-600">
              {summaryLoading ? '-' : summary?.high_risk_count || 0}
            </div>
            <div className="text-sm text-text-secondary">High Risk</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {summaryLoading ? '-' : summary?.medium_risk_count || 0}
            </div>
            <div className="text-sm text-text-secondary">Medium Risk</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-600">
              {summaryLoading ? '-' : summary?.low_risk_count || 0}
            </div>
            <div className="text-sm text-text-secondary">Low Risk</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">
              ${summaryLoading ? '-' : ((summary?.predicted_revenue_30_days || 0) / 1000).toFixed(0)}k
            </div>
            <div className="text-sm text-text-secondary">30-Day Revenue</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-text-primary">
              {summaryLoading ? '-' : summary?.average_days_between_service || 0}
            </div>
            <div className="text-sm text-text-secondary">Avg Days/Service</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content - Predictions List */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <Select
                  value={filters.risk_level || ''}
                  onChange={(e) => setFilters({ ...filters, risk_level: e.target.value as PredictionFilters['risk_level'] || undefined })}
                  className="w-40"
                >
                  <option value="">All Risk Levels</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Select>

                <Select
                  value={filters.equipment_type || ''}
                  onChange={(e) => setFilters({ ...filters, equipment_type: e.target.value || undefined })}
                  className="w-48"
                >
                  <option value="">All Equipment</option>
                  <option value="septic_tank">Septic Tank</option>
                  <option value="grease_trap">Grease Trap</option>
                  <option value="pump_station">Pump Station</option>
                  <option value="aerobic_system">Aerobic System</option>
                </Select>

                <Select
                  value={filters.days_until_service?.toString() || ''}
                  onChange={(e) => setFilters({ ...filters, days_until_service: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-44"
                >
                  <option value="">Any Timeframe</option>
                  <option value="0">Overdue</option>
                  <option value="7">Next 7 Days</option>
                  <option value="30">Next 30 Days</option>
                  <option value="90">Next 90 Days</option>
                </Select>

                <div className="flex-1" />

                <span className="text-sm text-text-muted">
                  {predictions?.total || 0} predictions
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Predictions */}
          {predictionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : predictions?.items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-4xl mb-4">🎉</div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  No Predictions Match Filters
                </h3>
                <p className="text-text-secondary">
                  Try adjusting your filters to see more predictions
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {predictions?.items.map((prediction) => (
                <PredictionCard
                  key={prediction.id}
                  prediction={prediction}
                  onCreateWorkOrder={handleCreateWorkOrder}
                  isCreating={creatingForId === prediction.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar - Alerts */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Alerts</span>
                {unreadAlerts.length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadAlerts.length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-4">
                  No alerts at this time
                </p>
              ) : (
                alerts.slice(0, 10).map((alert) => (
                  <AlertItem
                    key={alert.id}
                    alert={alert}
                    onMarkRead={handleMarkRead}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">30 Days</span>
                  <span className="font-bold text-text-primary">
                    ${((summary?.predicted_revenue_30_days || 0)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">90 Days</span>
                  <span className="font-bold text-text-primary">
                    ${((summary?.predicted_revenue_90_days || 0)).toLocaleString()}
                  </span>
                </div>
                <div className="border-t pt-4">
                  <div className="text-xs text-text-muted mb-2">Risk Distribution</div>
                  <div className="flex h-4 rounded overflow-hidden">
                    <div
                      className="bg-red-500"
                      style={{ width: `${(summary?.high_risk_count || 0) / (summary?.total_customers_at_risk || 1) * 100}%` }}
                    />
                    <div
                      className="bg-yellow-500"
                      style={{ width: `${(summary?.medium_risk_count || 0) / (summary?.total_customers_at_risk || 1) * 100}%` }}
                    />
                    <div
                      className="bg-green-500"
                      style={{ width: `${(summary?.low_risk_count || 0) / (summary?.total_customers_at_risk || 1) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
