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
  prospectFormSchema,
  type ProspectFormData,
  type Prospect,
} from '@/api/types/prospect.ts';
import {
  PROSPECT_STAGE_LABELS,
  LEAD_SOURCE_LABELS,
} from '@/api/types/common.ts';

export interface ProspectFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProspectFormData) => Promise<void>;
  /** Existing prospect for edit mode */
  prospect?: Prospect | null;
  isLoading?: boolean;
}

/**
 * Prospect create/edit form modal
 *
 * Uses React Hook Form with Zod validation
 * Handles both create and edit modes
 */
export function ProspectForm({
  open,
  onClose,
  onSubmit,
  prospect,
  isLoading,
}: ProspectFormProps) {
  const isEdit = !!prospect;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProspectFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(prospectFormSchema) as any,
    defaultValues: prospect
      ? {
          first_name: prospect.first_name,
          last_name: prospect.last_name,
          email: prospect.email || '',
          phone: prospect.phone || '',
          company_name: prospect.company_name || '',
          address_line1: prospect.address_line1 || '',
          city: prospect.city || '',
          state: prospect.state || '',
          postal_code: prospect.postal_code || '',
          prospect_stage: prospect.prospect_stage,
          lead_source: prospect.lead_source || undefined,
          estimated_value: prospect.estimated_value || undefined,
          assigned_sales_rep: prospect.assigned_sales_rep || '',
          next_follow_up_date: prospect.next_follow_up_date || '',
          lead_notes: prospect.lead_notes || '',
        }
      : {
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          company_name: '',
          address_line1: '',
          city: '',
          state: '',
          postal_code: '',
          prospect_stage: 'new_lead',
          lead_source: undefined,
          estimated_value: undefined,
          assigned_sales_rep: '',
          next_follow_up_date: '',
          lead_notes: '',
        },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = async (data: ProspectFormData) => {
    // Clean up empty strings to undefined
    const cleanedData: ProspectFormData = {
      ...data,
      email: data.email || undefined,
      phone: data.phone || undefined,
      company_name: data.company_name || undefined,
      address_line1: data.address_line1 || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      postal_code: data.postal_code || undefined,
      lead_source: data.lead_source || undefined,
      estimated_value: data.estimated_value || undefined,
      assigned_sales_rep: data.assigned_sales_rep || undefined,
      next_follow_up_date: data.next_follow_up_date || undefined,
      lead_notes: data.lead_notes || undefined,
    };

    await onSubmit(cleanedData);
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} disableOverlayClose={isDirty}>
      <DialogContent size="lg">
        <DialogHeader onClose={handleClose}>
          {isEdit ? 'Edit Prospect' : 'Add New Prospect'}
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogBody className="space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Basic Info Section */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Basic Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name" required>
                    First Name
                  </Label>
                  <Input
                    id="first_name"
                    {...register('first_name')}
                    error={!!errors.first_name}
                    placeholder="John"
                  />
                  {errors.first_name && (
                    <p className="text-sm text-danger">{errors.first_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name" required>
                    Last Name
                  </Label>
                  <Input
                    id="last_name"
                    {...register('last_name')}
                    error={!!errors.last_name}
                    placeholder="Doe"
                  />
                  {errors.last_name && (
                    <p className="text-sm text-danger">{errors.last_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    error={!!errors.email}
                    placeholder="john@example.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-danger">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register('phone')}
                    error={!!errors.phone}
                    placeholder="(555) 123-4567"
                  />
                  {errors.phone && (
                    <p className="text-sm text-danger">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    {...register('company_name')}
                    error={!!errors.company_name}
                    placeholder="Acme Corp"
                  />
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Address
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="address_line1">Street Address</Label>
                  <Input
                    id="address_line1"
                    {...register('address_line1')}
                    error={!!errors.address_line1}
                    placeholder="123 Main St"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    {...register('city')}
                    error={!!errors.city}
                    placeholder="Tampa"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      {...register('state')}
                      error={!!errors.state}
                      placeholder="FL"
                      maxLength={2}
                    />
                    {errors.state && (
                      <p className="text-sm text-danger">{errors.state.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postal_code">ZIP Code</Label>
                    <Input
                      id="postal_code"
                      {...register('postal_code')}
                      error={!!errors.postal_code}
                      placeholder="33601"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sales Info Section */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Sales Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prospect_stage">Stage</Label>
                  <Select id="prospect_stage" {...register('prospect_stage')}>
                    {Object.entries(PROSPECT_STAGE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lead_source">Lead Source</Label>
                  <Select id="lead_source" {...register('lead_source')}>
                    <option value="">Select source...</option>
                    {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimated_value">Estimated Value ($)</Label>
                  <Input
                    id="estimated_value"
                    type="number"
                    min="0"
                    step="0.01"
                    {...register('estimated_value')}
                    error={!!errors.estimated_value}
                    placeholder="5000"
                  />
                  {errors.estimated_value && (
                    <p className="text-sm text-danger">{errors.estimated_value.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="next_follow_up_date">Next Follow-up</Label>
                  <Input
                    id="next_follow_up_date"
                    type="date"
                    {...register('next_follow_up_date')}
                    error={!!errors.next_follow_up_date}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="assigned_sales_rep">Assigned Sales Rep</Label>
                  <Input
                    id="assigned_sales_rep"
                    {...register('assigned_sales_rep')}
                    error={!!errors.assigned_sales_rep}
                    placeholder="Sales rep name"
                  />
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Notes
              </h4>
              <div className="space-y-2">
                <Label htmlFor="lead_notes">Lead Notes</Label>
                <Textarea
                  id="lead_notes"
                  {...register('lead_notes')}
                  error={!!errors.lead_notes}
                  placeholder="Additional notes about this prospect..."
                  rows={4}
                />
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Prospect'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
