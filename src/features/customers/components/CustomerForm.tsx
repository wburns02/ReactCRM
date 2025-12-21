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
  customerFormSchema,
  type CustomerFormData,
  type Customer,
  CUSTOMER_TYPE_LABELS,
} from '@/api/types/customer.ts';
import {
  PROSPECT_STAGE_LABELS,
  LEAD_SOURCE_LABELS,
} from '@/api/types/common.ts';

export interface CustomerFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  /** Existing customer for edit mode */
  customer?: Customer | null;
  isLoading?: boolean;
}

/**
 * Customer create/edit form modal
 *
 * Uses React Hook Form with Zod validation
 * Handles both create and edit modes
 */
export function CustomerForm({
  open,
  onClose,
  onSubmit,
  customer,
  isLoading,
}: CustomerFormProps) {
  const isEdit = !!customer;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<CustomerFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(customerFormSchema) as any,
    defaultValues: customer
      ? {
          first_name: customer.first_name,
          last_name: customer.last_name,
          email: customer.email || '',
          phone: customer.phone || '',
          address_line1: customer.address_line1 || '',
          address_line2: customer.address_line2 || '',
          city: customer.city || '',
          state: customer.state || '',
          postal_code: customer.postal_code || '',
          customer_type: (customer.customer_type as 'residential' | 'commercial' | 'hoa' | 'municipal' | 'property_management' | undefined) || undefined,
          prospect_stage: customer.prospect_stage || undefined,
          lead_source: customer.lead_source || undefined,
          estimated_value: customer.estimated_value || undefined,
          assigned_sales_rep: customer.assigned_sales_rep || '',
          next_follow_up_date: customer.next_follow_up_date || '',
          lead_notes: customer.lead_notes || '',
          is_active: customer.is_active,
        }
      : {
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          address_line1: '',
          address_line2: '',
          city: '',
          state: '',
          postal_code: '',
          customer_type: undefined,
          prospect_stage: undefined,
          lead_source: undefined,
          estimated_value: undefined,
          assigned_sales_rep: '',
          next_follow_up_date: '',
          lead_notes: '',
          is_active: true,
        },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = async (data: CustomerFormData) => {
    // Clean up empty strings to undefined
    const cleanedData: CustomerFormData = {
      ...data,
      email: data.email || undefined,
      phone: data.phone || undefined,
      address_line1: data.address_line1 || undefined,
      address_line2: data.address_line2 || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      postal_code: data.postal_code || undefined,
      customer_type: data.customer_type || undefined,
      prospect_stage: data.prospect_stage || undefined,
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
          {isEdit ? 'Edit Customer' : 'Add New Customer'}
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogBody className="space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Basic Info Section */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Contact Information
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
                  <Label htmlFor="customer_type">Customer Type</Label>
                  <Select id="customer_type" {...register('customer_type')}>
                    <option value="">Select type...</option>
                    {Object.entries(CUSTOMER_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
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

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="address_line2">Address Line 2</Label>
                  <Input
                    id="address_line2"
                    {...register('address_line2')}
                    error={!!errors.address_line2}
                    placeholder="Apt 4B"
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

            {/* Sales/Prospect Info Section - Optional */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Sales Information (Optional)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prospect_stage">Prospect Stage</Label>
                  <Select id="prospect_stage" {...register('prospect_stage')}>
                    <option value="">None</option>
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
                <Label htmlFor="lead_notes">Notes</Label>
                <Textarea
                  id="lead_notes"
                  {...register('lead_notes')}
                  error={!!errors.lead_notes}
                  placeholder="Additional notes about this customer..."
                  rows={4}
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Status
              </h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('is_active')}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="text-sm text-text-primary">Active Customer</span>
                </label>
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
