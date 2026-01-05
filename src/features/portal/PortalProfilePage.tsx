/**
 * Customer Portal Profile Page
 * View and update customer profile information
 */
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toastSuccess, toastError } from '@/components/ui/Toast';
import { usePortalCustomer, useUpdateCustomerProfile } from '@/api/hooks/usePortal';
import type { CustomerProfileUpdate, NotificationPreferences } from '@/api/types/portal';

export function PortalProfilePage() {
  const { data: customer, isLoading } = usePortalCustomer();
  const updateProfile = useUpdateCustomerProfile();
  const [isEditing, setIsEditing] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<CustomerProfileUpdate>();

  // Reset form when customer data loads
  useEffect(() => {
    if (customer) {
      reset({
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        zip: customer.zip,
      });
    }
  }, [customer, reset]);

  const onSubmit = async (data: CustomerProfileUpdate) => {
    try {
      await updateProfile.mutateAsync(data);
      toastSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      toastError('Failed to update profile. Please try again.');
    }
  };

  const handleNotificationChange = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!customer) return;

    const currentPrefs = customer.notification_preferences || {
      email_reminders: true,
      sms_reminders: true,
      tech_arrival_alerts: true,
      invoice_notifications: true,
    };

    try {
      await updateProfile.mutateAsync({
        notification_preferences: {
          ...currentPrefs,
          [key]: value,
        },
      });
      toastSuccess('Notification preferences updated');
    } catch (error) {
      console.error('Failed to update notifications:', error);
      toastError('Failed to update preferences');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">Unable to load profile</p>
      </div>
    );
  }

  const notifications = customer.notification_preferences || {
    email_reminders: true,
    sms_reminders: true,
    tech_arrival_alerts: true,
    invoice_notifications: true,
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">My Profile</h1>
        <p className="text-text-secondary">Manage your account information and preferences</p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your contact and address information</CardDescription>
          </div>
          {!isEditing && (
            <Button variant="secondary" onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    First Name
                  </label>
                  <Input
                    {...register('first_name', { required: 'First name is required' })}
                    placeholder="First Name"
                  />
                  {errors.first_name && (
                    <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Last Name
                  </label>
                  <Input
                    {...register('last_name', { required: 'Last name is required' })}
                    placeholder="Last Name"
                  />
                  {errors.last_name && (
                    <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                    placeholder="email@example.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Phone
                  </label>
                  <Input
                    type="tel"
                    {...register('phone', { required: 'Phone is required' })}
                    placeholder="(512) 555-0123"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Street Address
                </label>
                <Input
                  {...register('address', { required: 'Address is required' })}
                  placeholder="123 Main St"
                />
                {errors.address && (
                  <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    City
                  </label>
                  <Input
                    {...register('city', { required: 'City is required' })}
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    State
                  </label>
                  <Input
                    {...register('state', { required: 'State is required' })}
                    placeholder="TX"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    ZIP
                  </label>
                  <Input
                    {...register('zip', { required: 'ZIP is required' })}
                    placeholder="78701"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={updateProfile.isPending || !isDirty}>
                  {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false);
                    reset();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-3xl">
                  {customer.first_name.charAt(0).toUpperCase()}
                  {customer.last_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary">
                    {customer.first_name} {customer.last_name}
                  </h3>
                  {customer.created_at && (
                    <p className="text-sm text-text-muted">
                      Customer since {new Date(customer.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-text-muted mb-1">Email</p>
                  <p className="text-text-primary">{customer.email}</p>
                </div>
                <div>
                  <p className="text-sm text-text-muted mb-1">Phone</p>
                  <p className="text-text-primary">{customer.phone}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-text-muted mb-1">Service Address</p>
                  <p className="text-text-primary">
                    {customer.address}<br />
                    {customer.city}, {customer.state} {customer.zip}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Choose how you want to receive updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <NotificationToggle
              label="Email Reminders"
              description="Receive appointment reminders via email"
              checked={notifications.email_reminders}
              onChange={(v) => handleNotificationChange('email_reminders', v)}
              disabled={updateProfile.isPending}
            />
            <NotificationToggle
              label="SMS Reminders"
              description="Receive appointment reminders via text message"
              checked={notifications.sms_reminders}
              onChange={(v) => handleNotificationChange('sms_reminders', v)}
              disabled={updateProfile.isPending}
            />
            <NotificationToggle
              label="Technician Arrival Alerts"
              description="Get notified when your technician is on the way"
              checked={notifications.tech_arrival_alerts}
              onChange={(v) => handleNotificationChange('tech_arrival_alerts', v)}
              disabled={updateProfile.isPending}
            />
            <NotificationToggle
              label="Invoice Notifications"
              description="Receive email notifications for new invoices"
              checked={notifications.invoice_notifications}
              onChange={(v) => handleNotificationChange('invoice_notifications', v)}
              disabled={updateProfile.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface-hover rounded-lg">
              <div>
                <p className="font-medium text-text-primary">Download My Data</p>
                <p className="text-sm text-text-muted">
                  Get a copy of your service history and account data
                </p>
              </div>
              <Button variant="secondary" size="sm">
                Download
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
              <div>
                <p className="font-medium text-red-800">Delete Account</p>
                <p className="text-sm text-red-600">
                  Permanently remove your account and data
                </p>
              </div>
              <Button variant="secondary" size="sm" className="text-red-600 border-red-200">
                Request Deletion
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface NotificationToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function NotificationToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-surface-hover rounded-lg">
      <div>
        <p className="font-medium text-text-primary">{label}</p>
        <p className="text-sm text-text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export default PortalProfilePage;
