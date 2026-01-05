import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Label } from '@/components/ui/Label.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { useSecuritySettings, useUpdateSecuritySettings } from '@/api/hooks/useAdmin.ts';
import { getErrorMessage } from '@/api/client.ts';
import { toastSuccess, toastError } from '@/components/ui/Toast';

export function SecuritySettings() {
  const { data: settings, isLoading } = useSecuritySettings();
  const updateSettings = useUpdateSecuritySettings();

  const [formData, setFormData] = useState({
    password_min_length: 8,
    password_require_uppercase: true,
    password_require_lowercase: true,
    password_require_numbers: true,
    password_require_special: false,
    session_timeout_minutes: 480,
    two_factor_enabled: false,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        password_min_length: settings.password_min_length,
        password_require_uppercase: settings.password_require_uppercase,
        password_require_lowercase: settings.password_require_lowercase,
        password_require_numbers: settings.password_require_numbers,
        password_require_special: settings.password_require_special,
        session_timeout_minutes: settings.session_timeout_minutes,
        two_factor_enabled: settings.two_factor_enabled,
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings.mutateAsync(formData);
      toastSuccess('Security settings saved successfully!');
    } catch (error) {
      toastError(`Error: ${getErrorMessage(error)}`);
    }
  };

  if (isLoading) {
    return <div className="text-text-secondary">Loading settings...</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* Password Policy */}
        <Card>
          <CardHeader>
            <CardTitle>Password Policy</CardTitle>
            <p className="text-sm text-text-secondary mt-1">
              Set requirements for user passwords
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="password_min_length">Minimum Password Length</Label>
              <Input
                id="password_min_length"
                type="number"
                min="6"
                max="32"
                value={formData.password_min_length}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    password_min_length: parseInt(e.target.value),
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="password_require_uppercase"
                  checked={formData.password_require_uppercase}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      password_require_uppercase: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="password_require_uppercase" className="font-normal">
                  Require at least one uppercase letter
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="password_require_lowercase"
                  checked={formData.password_require_lowercase}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      password_require_lowercase: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="password_require_lowercase" className="font-normal">
                  Require at least one lowercase letter
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="password_require_numbers"
                  checked={formData.password_require_numbers}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      password_require_numbers: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="password_require_numbers" className="font-normal">
                  Require at least one number
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="password_require_special"
                  checked={formData.password_require_special}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      password_require_special: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="password_require_special" className="font-normal">
                  Require at least one special character (!@#$%^&*)
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Management */}
        <Card>
          <CardHeader>
            <CardTitle>Session Management</CardTitle>
            <p className="text-sm text-text-secondary mt-1">
              Configure user session timeouts
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="session_timeout_minutes">
                Session Timeout (minutes)
              </Label>
              <Input
                id="session_timeout_minutes"
                type="number"
                min="5"
                max="1440"
                value={formData.session_timeout_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    session_timeout_minutes: parseInt(e.target.value),
                  })
                }
              />
              <p className="text-xs text-text-muted mt-1">
                Users will be logged out after this period of inactivity (5-1440 minutes)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Two-Factor Authentication */}
        <Card>
          <CardHeader>
            <CardTitle>Two-Factor Authentication</CardTitle>
            <p className="text-sm text-text-secondary mt-1">
              Require additional verification for login
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="two_factor_enabled"
                checked={formData.two_factor_enabled}
                onChange={(e) =>
                  setFormData({ ...formData, two_factor_enabled: e.target.checked })
                }
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="two_factor_enabled" className="font-normal">
                Require two-factor authentication for all users
              </Label>
            </div>
            <p className="text-sm text-text-secondary">
              When enabled, users will need to verify their identity using an authenticator
              app in addition to their password.
            </p>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end">
          <Button type="submit" disabled={updateSettings.isPending}>
            {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </form>
  );
}
