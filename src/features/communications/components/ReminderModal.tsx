import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogBody } from '@/components/ui/Dialog';
import { apiClient } from '@/api/client';
import { toastSuccess, toastError } from '@/components/ui/Toast';

interface Reminder {
  id?: number | string;
  name: string;
  trigger: string;
  timing: string;
  channels: string[];
  enabled: boolean;
}

interface ReminderModalProps {
  open: boolean;
  onClose: () => void;
  reminder?: Reminder | null;
}

const TRIGGERS = [
  { value: 'before_appointment', label: 'Before Scheduled Appointment' },
  { value: 'after_service', label: 'After Service Complete' },
  { value: 'invoice_created', label: 'When Invoice Created' },
  { value: 'invoice_due', label: 'Before Invoice Due Date' },
  { value: 'invoice_overdue', label: 'When Invoice Overdue' },
  { value: 'service_interval', label: 'Service Interval Due' },
];

const TIMING_OPTIONS = [
  { value: '1 hour before', label: '1 Hour Before' },
  { value: '2 hours before', label: '2 Hours Before' },
  { value: '24 hours before', label: '24 Hours Before' },
  { value: '48 hours before', label: '48 Hours Before' },
  { value: '3 days before', label: '3 Days Before' },
  { value: '7 days before', label: '7 Days Before' },
  { value: 'immediately', label: 'Immediately' },
  { value: '1 day after', label: '1 Day After' },
  { value: '3 days after', label: '3 Days After' },
];

/**
 * Reminder Create/Edit Modal
 */
export function ReminderModal({
  open,
  onClose,
  reminder,
}: ReminderModalProps) {
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('before_appointment');
  const [timing, setTiming] = useState('24 hours before');
  const [channels, setChannels] = useState<string[]>(['sms']);
  const [enabled, setEnabled] = useState(true);

  const queryClient = useQueryClient();
  const isEditing = !!reminder?.id;

  // Reset form when reminder changes
  useEffect(() => {
    if (reminder) {
      setName(reminder.name);
      setTrigger(reminder.trigger);
      setTiming(reminder.timing);
      setChannels(reminder.channels);
      setEnabled(reminder.enabled);
    } else {
      setName('');
      setTrigger('before_appointment');
      setTiming('24 hours before');
      setChannels(['sms']);
      setEnabled(true);
    }
  }, [reminder, open]);

  const createReminder = useMutation({
    mutationFn: async (data: Omit<Reminder, 'id'>) => {
      const response = await apiClient.post('/reminders', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-reminders'] });
      toastSuccess('Reminder created successfully');
      onClose();
    },
    onError: () => {
      toastError('Failed to create reminder');
    },
  });

  const updateReminder = useMutation({
    mutationFn: async (data: Reminder) => {
      const response = await apiClient.put(`/reminders/${data.id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-reminders'] });
      toastSuccess('Reminder updated successfully');
      onClose();
    },
    onError: () => {
      toastError('Failed to update reminder');
    },
  });

  const handleSave = async () => {
    if (!name) return;

    const data = { name, trigger, timing, channels, enabled };

    if (isEditing && reminder?.id) {
      await updateReminder.mutateAsync({ ...data, id: reminder.id });
    } else {
      await createReminder.mutateAsync(data);
    }
  };

  const toggleChannel = (channel: string) => {
    setChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
  };

  const isPending = createReminder.isPending || updateReminder.isPending;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent size="md">
        <DialogHeader onClose={onClose}>
          {isEditing ? 'Edit Reminder' : 'Create Reminder'}
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Reminder Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Appointment Reminder"
              />
            </div>

            {/* Trigger */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Trigger Event
              </label>
              <select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg-card text-text-primary"
              >
                {TRIGGERS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Timing */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Timing
              </label>
              <select
                value={timing}
                onChange={(e) => setTiming(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-bg-card text-text-primary"
              >
                {TIMING_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Channels */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Channels
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channels.includes('sms')}
                    onChange={() => toggleChannel('sms')}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm text-text-primary">SMS</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channels.includes('email')}
                    onChange={() => toggleChannel('email')}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm text-text-primary">Email</span>
                </label>
              </div>
            </div>

            {/* Enabled */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enabled"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-border"
              />
              <label htmlFor="enabled" className="text-sm text-text-primary cursor-pointer">
                Enable this reminder
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!name || channels.length === 0 || isPending}
              >
                {isPending ? 'Saving...' : isEditing ? 'Update Reminder' : 'Create Reminder'}
              </Button>
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
