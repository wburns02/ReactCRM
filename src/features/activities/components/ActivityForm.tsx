import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Select } from '@/components/ui/Select.tsx';
import { Textarea } from '@/components/ui/Textarea.tsx';
import { Label } from '@/components/ui/Label.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@/components/ui/Dialog.tsx';
import {
  activityFormSchema,
  type ActivityFormData,
  type Activity,
  ACTIVITY_TYPE_LABELS,
} from '@/api/types/activity.ts';

export interface ActivityFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ActivityFormData) => Promise<void>;
  customerId: string;
  activity?: Activity | null;
  isLoading?: boolean;
}

/**
 * Activity create/edit form modal
 * Allows logging new activities (calls, emails, notes, etc.)
 */
export function ActivityForm({
  open,
  onClose,
  onSubmit,
  customerId,
  activity,
  isLoading,
}: ActivityFormProps) {
  const isEdit = !!activity;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ActivityFormData>({
    resolver: zodResolver(activityFormSchema) as any,
    defaultValues: activity
      ? {
          customer_id: activity.customer_id,
          activity_type: activity.activity_type,
          description: activity.description,
          activity_date: activity.activity_date.split('T')[0],
        }
      : {
          customer_id: customerId,
          activity_type: 'note',
          description: '',
          activity_date: new Date().toISOString().split('T')[0],
        },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = async (data: ActivityFormData) => {
    await onSubmit(data);
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} disableOverlayClose={isDirty}>
      <DialogContent size="md">
        <DialogHeader onClose={handleClose}>
          {isEdit ? 'Edit Activity' : 'Log New Activity'}
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="activity_type" required>
                Activity Type
              </Label>
              <Select
                id="activity_type"
                {...register('activity_type')}
                error={!!errors.activity_type}
              >
                {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              {errors.activity_type && (
                <p className="text-sm text-danger">{errors.activity_type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity_date" required>
                Date
              </Label>
              <Input
                id="activity_date"
                type="date"
                {...register('activity_date')}
                error={!!errors.activity_date}
              />
              {errors.activity_date && (
                <p className="text-sm text-danger">{errors.activity_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" required>
                Description
              </Label>
              <Textarea
                id="description"
                {...register('description')}
                error={!!errors.description}
                placeholder="Enter activity details..."
                rows={6}
              />
              {errors.description && (
                <p className="text-sm text-danger">{errors.description.message}</p>
              )}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEdit ? 'Save Changes' : 'Log Activity'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
