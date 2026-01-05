import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { toastSuccess, toastError } from '@/components/ui/Toast';
import {
  useServiceIntervals,
  useCustomerServiceSchedules,
  useServiceIntervalStats,
  useCreateServiceInterval,
  useUpdateServiceInterval,
  useDeleteServiceInterval,
  useCreateWorkOrderFromSchedule,
  useSendServiceReminder,
  type ServiceInterval,
  type CustomerServiceSchedule,
} from '@/api/hooks/useServiceIntervals';

type TabType = 'intervals' | 'schedules' | 'overdue';

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: CustomerServiceSchedule['status'] }) {
  const styles = {
    upcoming: 'bg-blue-100 text-blue-700',
    due: 'bg-yellow-100 text-yellow-700',
    overdue: 'bg-red-100 text-red-700',
    scheduled: 'bg-green-100 text-green-700',
  };

  const labels = {
    upcoming: 'Upcoming',
    due: 'Due Soon',
    overdue: 'Overdue',
    scheduled: 'Scheduled',
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

/**
 * Service Intervals Page
 */
export function ServiceIntervalsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('schedules');
  const [showIntervalForm, setShowIntervalForm] = useState(false);
  const [editingInterval, setEditingInterval] = useState<ServiceInterval | null>(null);
  const [intervalForm, setIntervalForm] = useState({
    name: '',
    description: '',
    service_type: 'maintenance',
    interval_months: 12,
    reminder_days_before: [30, 7, 1],
    is_active: true,
  });

  const { data: stats } = useServiceIntervalStats();
  const { data: intervals } = useServiceIntervals();
  const { data: schedulesData, isLoading: schedulesLoading } = useCustomerServiceSchedules({
    status: activeTab === 'overdue' ? 'overdue' : undefined,
    limit: 50,
  });
  const createInterval = useCreateServiceInterval();
  const updateInterval = useUpdateServiceInterval();
  const deleteInterval = useDeleteServiceInterval();
  const createWorkOrder = useCreateWorkOrderFromSchedule();
  const sendReminder = useSendServiceReminder();

  const schedules = schedulesData?.schedules || [];

  const handleSaveInterval = async () => {
    try {
      if (editingInterval) {
        await updateInterval.mutateAsync({ id: editingInterval.id, ...intervalForm });
      } else {
        await createInterval.mutateAsync(intervalForm);
      }
      setShowIntervalForm(false);
      setEditingInterval(null);
      setIntervalForm({
        name: '',
        description: '',
        service_type: 'maintenance',
        interval_months: 12,
        reminder_days_before: [30, 7, 1],
        is_active: true,
      });
    } catch (error) {
      toastError('Failed to save interval');
    }
  };

  const handleEditInterval = (interval: ServiceInterval) => {
    setEditingInterval(interval);
    setIntervalForm({
      name: interval.name,
      description: interval.description || '',
      service_type: interval.service_type,
      interval_months: interval.interval_months,
      reminder_days_before: interval.reminder_days_before,
      is_active: interval.is_active,
    });
    setShowIntervalForm(true);
  };

  const handleDeleteInterval = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service interval?')) return;
    try {
      await deleteInterval.mutateAsync(id);
    } catch (error) {
      toastError('Failed to delete interval');
    }
  };

  const handleCreateWorkOrder = async (schedule: CustomerServiceSchedule) => {
    const date = prompt('Enter scheduled date (YYYY-MM-DD):');
    if (!date) return;
    try {
      await createWorkOrder.mutateAsync({
        schedule_id: schedule.id,
        scheduled_date: date,
      });
      toastSuccess('Work order created successfully!');
    } catch (error) {
      toastError('Failed to create work order');
    }
  };

  const handleSendReminder = async (scheduleId: string, type: 'sms' | 'email') => {
    try {
      await sendReminder.mutateAsync({ schedule_id: scheduleId, reminder_type: type });
      toastSuccess('Reminder sent successfully!');
    } catch (error) {
      toastError('Failed to send reminder');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Service Intervals</h1>
          <p className="text-text-secondary mt-1">
            Manage recurring service schedules and automated reminders
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-text-muted">Total Customers</p>
            <p className="text-2xl font-bold text-text-primary">
              {stats?.total_customers_with_intervals || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-text-muted">Upcoming</p>
            <p className="text-2xl font-bold text-blue-600">{stats?.upcoming_services || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-text-muted">Due Soon</p>
            <p className="text-2xl font-bold text-yellow-600">{stats?.due_services || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-danger">
          <CardContent className="p-4">
            <p className="text-sm text-text-muted">Overdue</p>
            <p className="text-2xl font-bold text-danger">{stats?.overdue_services || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <div className="flex gap-4">
          {[
            { id: 'schedules' as TabType, label: 'All Schedules' },
            { id: 'overdue' as TabType, label: `Overdue (${stats?.overdue_services || 0})` },
            { id: 'intervals' as TabType, label: 'Interval Types' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Intervals Tab */}
      {activeTab === 'intervals' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Service Interval Types</CardTitle>
            <Button
              onClick={() => {
                setEditingInterval(null);
                setIntervalForm({
                  name: '',
                  description: '',
                  service_type: 'maintenance',
                  interval_months: 12,
                  reminder_days_before: [30, 7, 1],
                  is_active: true,
                });
                setShowIntervalForm(true);
              }}
            >
              + New Interval
            </Button>
          </CardHeader>
          <CardContent>
            {intervals && intervals.length > 0 ? (
              <div className="space-y-3">
                {intervals.map((interval) => (
                  <div
                    key={interval.id}
                    className="flex items-center justify-between p-4 bg-bg-muted rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-text-primary">{interval.name}</h4>
                        <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
                          Every {interval.interval_months} months
                        </span>
                        {!interval.is_active && (
                          <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      {interval.description && (
                        <p className="text-sm text-text-muted mt-1">{interval.description}</p>
                      )}
                      <p className="text-xs text-text-muted mt-1">
                        Reminders: {interval.reminder_days_before.join(', ')} days before
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEditInterval(interval)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDeleteInterval(interval.id)}
                        className="text-danger hover:bg-danger/10"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-muted">
                <p>No service intervals defined yet.</p>
                <p className="text-sm mt-1">
                  Create intervals like "Annual Inspection" or "6-Month Maintenance"
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Schedules Tab */}
      {(activeTab === 'schedules' || activeTab === 'overdue') && (
        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === 'overdue' ? 'Overdue Services' : 'Customer Service Schedules'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {schedulesLoading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded-lg" />
                ))}
              </div>
            ) : schedules.length > 0 ? (
              <div className="space-y-3">
                {schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      schedule.status === 'overdue'
                        ? 'border-danger/50 bg-danger/5'
                        : 'border-border bg-bg-muted'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/customers/${schedule.customer_id}`}
                          className="font-medium text-text-primary hover:text-primary"
                        >
                          {schedule.customer_name}
                        </Link>
                        <StatusBadge status={schedule.status} />
                      </div>
                      <p className="text-sm text-text-muted mt-1">
                        {schedule.service_interval_name}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-text-muted">
                        <span>
                          Due: {new Date(schedule.next_due_date).toLocaleDateString()}
                        </span>
                        {schedule.days_until_due < 0 ? (
                          <span className="text-danger font-medium">
                            {Math.abs(schedule.days_until_due)} days overdue
                          </span>
                        ) : (
                          <span>In {schedule.days_until_due} days</span>
                        )}
                        {schedule.last_service_date && (
                          <span>
                            Last service:{' '}
                            {new Date(schedule.last_service_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {!schedule.scheduled_work_order_id && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleCreateWorkOrder(schedule)}
                        >
                          Schedule
                        </Button>
                      )}
                      {schedule.scheduled_work_order_id && (
                        <Link to={`/work-orders/${schedule.scheduled_work_order_id}`}>
                          <Button variant="secondary" size="sm">
                            View WO
                          </Button>
                        </Link>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSendReminder(schedule.id, 'sms')}
                      >
                        SMS
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSendReminder(schedule.id, 'email')}
                      >
                        Email
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-muted">
                <p>No service schedules found.</p>
                <p className="text-sm mt-1">
                  Assign service intervals to customers to track their maintenance schedules
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Interval Form Modal */}
      {showIntervalForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-bg-card rounded-lg shadow-xl w-full max-w-lg mx-4 p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              {editingInterval ? 'Edit Service Interval' : 'New Service Interval'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Interval Name
                </label>
                <Input
                  value={intervalForm.name}
                  onChange={(e) => setIntervalForm({ ...intervalForm, name: e.target.value })}
                  placeholder="e.g., Annual Inspection"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Description
                </label>
                <Input
                  value={intervalForm.description}
                  onChange={(e) =>
                    setIntervalForm({ ...intervalForm, description: e.target.value })
                  }
                  placeholder="Optional description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Service Type
                  </label>
                  <select
                    value={intervalForm.service_type}
                    onChange={(e) =>
                      setIntervalForm({ ...intervalForm, service_type: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg bg-bg-card text-text-primary"
                  >
                    <option value="maintenance">Maintenance</option>
                    <option value="inspection">Inspection</option>
                    <option value="pumping">Pumping</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Interval (months)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="120"
                    value={intervalForm.interval_months}
                    onChange={(e) =>
                      setIntervalForm({ ...intervalForm, interval_months: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Reminder Days Before
                </label>
                <Input
                  value={intervalForm.reminder_days_before.join(', ')}
                  onChange={(e) =>
                    setIntervalForm({
                      ...intervalForm,
                      reminder_days_before: e.target.value.split(',').map((d) => parseInt(d.trim())).filter((d) => !isNaN(d)),
                    })
                  }
                  placeholder="30, 7, 1"
                />
                <p className="text-xs text-text-muted mt-1">
                  Comma-separated days before due date to send reminders
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={intervalForm.is_active}
                  onChange={(e) =>
                    setIntervalForm({ ...intervalForm, is_active: e.target.checked })
                  }
                  className="rounded border-border"
                />
                <label htmlFor="is_active" className="text-sm text-text-secondary">
                  Interval is active
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowIntervalForm(false);
                  setEditingInterval(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveInterval} disabled={!intervalForm.name}>
                {editingInterval ? 'Save Changes' : 'Create Interval'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
