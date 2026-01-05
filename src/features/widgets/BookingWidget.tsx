/**
 * Embeddable Booking Widget
 * Can be embedded in external websites via iframe
 * White-label ready with customizable theme
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

// ============================================
// Widget Configuration Types
// ============================================

export interface BookingWidgetConfig {
  /** Company ID for API calls */
  companyId: string;
  /** Primary brand color */
  primaryColor?: string;
  /** Company logo URL */
  logoUrl?: string;
  /** Company name */
  companyName?: string;
  /** Available service types */
  serviceTypes?: ServiceType[];
  /** Enable customer account creation */
  allowAccountCreation?: boolean;
  /** Success redirect URL */
  successRedirectUrl?: string;
  /** Custom CSS class */
  className?: string;
}

interface ServiceType {
  id: string;
  name: string;
  description?: string;
  estimatedDuration?: string;
}

// ============================================
// Form Schema
// ============================================

const bookingSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  address: z.string().min(1, 'Service address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(5, 'Valid ZIP code is required'),
  serviceType: z.string().min(1, 'Please select a service'),
  preferredDate: z.string().min(1, 'Preferred date is required'),
  preferredTime: z.string().min(1, 'Preferred time is required'),
  notes: z.string().optional(),
  createAccount: z.boolean().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

// ============================================
// Default Service Types
// ============================================

const defaultServiceTypes: ServiceType[] = [
  { id: 'septic-pumping', name: 'Septic Tank Pumping', estimatedDuration: '1-2 hours' },
  { id: 'septic-inspection', name: 'Septic Inspection', estimatedDuration: '30-60 min' },
  { id: 'drain-cleaning', name: 'Drain Cleaning', estimatedDuration: '1-2 hours' },
  { id: 'repair', name: 'Repair Service', estimatedDuration: 'Varies' },
  { id: 'maintenance', name: 'Maintenance', estimatedDuration: '1 hour' },
  { id: 'emergency', name: 'Emergency Service', estimatedDuration: 'ASAP' },
];

// ============================================
// Time Slots
// ============================================

const timeSlots = [
  { value: 'morning', label: 'Morning (8am - 12pm)' },
  { value: 'afternoon', label: 'Afternoon (12pm - 5pm)' },
  { value: 'evening', label: 'Evening (5pm - 8pm)' },
  { value: 'flexible', label: 'Flexible - Any Time' },
];

// ============================================
// Component
// ============================================

export function BookingWidget({
  companyId,
  primaryColor = '#2563eb',
  logoUrl,
  companyName = 'Service Provider',
  serviceTypes = defaultServiceTypes,
  allowAccountCreation = true,
  successRedirectUrl,
  className,
}: BookingWidgetConfig) {
  const [step, setStep] = useState<'form' | 'submitting' | 'success' | 'error'>('form');
  const [bookingRef, setBookingRef] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema) as never,
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      serviceType: '',
      preferredDate: '',
      preferredTime: '',
      notes: '',
      createAccount: false,
    },
  });

  const selectedService = watch('serviceType');

  const onSubmit = async (data: BookingFormData) => {
    setStep('submitting');

    try {
      // Submit booking request to API
      const response = await fetch(`/api/v2/widgets/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Widget-Company': companyId,
        },
        body: JSON.stringify({
          ...data,
          companyId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit booking');
      }

      const result = await response.json();
      setBookingRef(result.reference || 'PENDING');
      setStep('success');

      // Redirect if configured
      if (successRedirectUrl) {
        setTimeout(() => {
          window.location.href = `${successRedirectUrl}?ref=${result.reference}`;
        }, 3000);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred');
      setStep('error');
    }
  };

  // Generate min date (today)
  const today = new Date().toISOString().split('T')[0];

  // Custom CSS variables for branding
  const brandStyles = {
    '--widget-primary': primaryColor,
  } as React.CSSProperties;

  if (step === 'success') {
    return (
      <Card className={cn('max-w-lg mx-auto', className)} style={brandStyles}>
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Booking Request Submitted!</h2>
          <p className="text-text-secondary mb-4">
            Your reference number: <span className="font-mono font-semibold">{bookingRef}</span>
          </p>
          <p className="text-sm text-text-muted">
            We'll contact you within 24 hours to confirm your appointment.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (step === 'error') {
    return (
      <Card className={cn('max-w-lg mx-auto', className)} style={brandStyles}>
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Something Went Wrong</h2>
          <p className="text-text-secondary mb-4">{errorMessage}</p>
          <Button onClick={() => setStep('form')}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('max-w-lg mx-auto', className)} style={brandStyles}>
      <CardHeader className="text-center">
        {logoUrl && (
          <img src={logoUrl} alt={companyName} className="h-12 mx-auto mb-2" />
        )}
        <CardTitle>Schedule Service</CardTitle>
        <p className="text-sm text-text-muted">Book an appointment with {companyName}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Contact Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                {...register('firstName')}
                error={!!errors.firstName}
                placeholder="John"
              />
              {errors.firstName && (
                <p className="text-xs text-danger mt-1">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                {...register('lastName')}
                error={!!errors.lastName}
                placeholder="Doe"
              />
              {errors.lastName && (
                <p className="text-xs text-danger mt-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                error={!!errors.email}
                placeholder="john@example.com"
              />
              {errors.email && (
                <p className="text-xs text-danger mt-1">{errors.email.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                error={!!errors.phone}
                placeholder="(555) 123-4567"
              />
              {errors.phone && (
                <p className="text-xs text-danger mt-1">{errors.phone.message}</p>
              )}
            </div>
          </div>

          {/* Service Address */}
          <div>
            <Label htmlFor="address">Service Address</Label>
            <Input
              id="address"
              {...register('address')}
              error={!!errors.address}
              placeholder="123 Main St"
            />
            {errors.address && (
              <p className="text-xs text-danger mt-1">{errors.address.message}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                {...register('city')}
                error={!!errors.city}
                placeholder="Austin"
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                {...register('state')}
                error={!!errors.state}
                placeholder="TX"
                maxLength={2}
              />
            </div>
            <div>
              <Label htmlFor="zipCode">ZIP</Label>
              <Input
                id="zipCode"
                {...register('zipCode')}
                error={!!errors.zipCode}
                placeholder="78701"
              />
            </div>
          </div>

          {/* Service Selection */}
          <div>
            <Label htmlFor="serviceType">Service Needed</Label>
            <Select id="serviceType" {...register('serviceType')} error={!!errors.serviceType}>
              <option value="">Select a service...</option>
              {serviceTypes.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                  {service.estimatedDuration && ` (${service.estimatedDuration})`}
                </option>
              ))}
            </Select>
            {errors.serviceType && (
              <p className="text-xs text-danger mt-1">{errors.serviceType.message}</p>
            )}
            {selectedService && serviceTypes.find(s => s.id === selectedService)?.description && (
              <p className="text-xs text-text-muted mt-1">
                {serviceTypes.find(s => s.id === selectedService)?.description}
              </p>
            )}
          </div>

          {/* Scheduling */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="preferredDate">Preferred Date</Label>
              <Input
                id="preferredDate"
                type="date"
                {...register('preferredDate')}
                error={!!errors.preferredDate}
                min={today}
              />
              {errors.preferredDate && (
                <p className="text-xs text-danger mt-1">{errors.preferredDate.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="preferredTime">Preferred Time</Label>
              <Select
                id="preferredTime"
                {...register('preferredTime')}
                error={!!errors.preferredTime}
              >
                <option value="">Select time...</option>
                {timeSlots.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </Select>
              {errors.preferredTime && (
                <p className="text-xs text-danger mt-1">{errors.preferredTime.message}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Any details we should know about..."
              rows={3}
            />
          </div>

          {/* Account Creation */}
          {allowAccountCreation && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="createAccount"
                {...register('createAccount')}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <Label htmlFor="createAccount" className="text-sm font-normal cursor-pointer">
                Create an account to track my service history
              </Label>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={step === 'submitting'}
            style={{ backgroundColor: primaryColor }}
          >
            {step === 'submitting' ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Submitting...
              </span>
            ) : (
              'Request Appointment'
            )}
          </Button>
        </form>

        <p className="text-xs text-text-muted text-center mt-4">
          By submitting, you agree to our terms of service and privacy policy.
        </p>
      </CardContent>
    </Card>
  );
}
