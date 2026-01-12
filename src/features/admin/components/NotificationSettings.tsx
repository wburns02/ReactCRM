import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Label } from "@/components/ui/Label.tsx";
import { Select } from "@/components/ui/Select.tsx";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from "@/api/hooks/useAdmin.ts";
import { getErrorMessage } from "@/api/client.ts";
import { toastSuccess, toastError } from "@/components/ui/Toast";

export function NotificationSettings() {
  const { data: settings, isLoading } = useNotificationSettings();
  const updateSettings = useUpdateNotificationSettings();

  const [formData, setFormData] = useState({
    email_enabled: true,
    sms_enabled: false,
    email_from_address: "",
    email_from_name: "",
    smtp_host: "",
    smtp_port: 587,
    smtp_username: "",
    smtp_use_tls: true,
    sms_provider: "none" as "twilio" | "none",
    sms_from_number: "",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        email_enabled: settings.email_enabled,
        sms_enabled: settings.sms_enabled,
        email_from_address: settings.email_from_address || "",
        email_from_name: settings.email_from_name || "",
        smtp_host: settings.smtp_host || "",
        smtp_port: settings.smtp_port || 587,
        smtp_username: settings.smtp_username || "",
        smtp_use_tls: settings.smtp_use_tls,
        sms_provider: settings.sms_provider || "none",
        sms_from_number: settings.sms_from_number || "",
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings.mutateAsync(formData);
      toastSuccess("Notification settings saved successfully!");
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
        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Email Settings</CardTitle>
            <p className="text-sm text-text-secondary mt-1">
              Configure email notifications and SMTP settings
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="email_enabled"
                checked={formData.email_enabled}
                onChange={(e) =>
                  setFormData({ ...formData, email_enabled: e.target.checked })
                }
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="email_enabled" className="font-normal">
                Enable email notifications
              </Label>
            </div>

            <div>
              <Label htmlFor="email_from_name">From Name</Label>
              <Input
                id="email_from_name"
                value={formData.email_from_name}
                onChange={(e) =>
                  setFormData({ ...formData, email_from_name: e.target.value })
                }
                placeholder="MAC Septic"
              />
            </div>

            <div>
              <Label htmlFor="email_from_address">From Email Address</Label>
              <Input
                id="email_from_address"
                type="email"
                value={formData.email_from_address}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    email_from_address: e.target.value,
                  })
                }
                placeholder="noreply@macseptic.com"
              />
            </div>

            <div className="pt-4 border-t border-border">
              <h5 className="font-medium text-text-primary mb-4">
                SMTP Configuration
              </h5>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtp_host">SMTP Host</Label>
                    <Input
                      id="smtp_host"
                      value={formData.smtp_host}
                      onChange={(e) =>
                        setFormData({ ...formData, smtp_host: e.target.value })
                      }
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="smtp_port">SMTP Port</Label>
                    <Input
                      id="smtp_port"
                      type="number"
                      value={formData.smtp_port}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          smtp_port: parseInt(e.target.value),
                        })
                      }
                      placeholder="587"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="smtp_username">SMTP Username</Label>
                  <Input
                    id="smtp_username"
                    value={formData.smtp_username}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        smtp_username: e.target.value,
                      })
                    }
                    placeholder="your-email@gmail.com"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="smtp_use_tls"
                    checked={formData.smtp_use_tls}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        smtp_use_tls: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-border"
                  />
                  <Label htmlFor="smtp_use_tls" className="font-normal">
                    Use TLS/SSL encryption
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SMS Settings */}
        <Card>
          <CardHeader>
            <CardTitle>SMS Settings</CardTitle>
            <p className="text-sm text-text-secondary mt-1">
              Configure SMS notifications via Twilio
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sms_enabled"
                checked={formData.sms_enabled}
                onChange={(e) =>
                  setFormData({ ...formData, sms_enabled: e.target.checked })
                }
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="sms_enabled" className="font-normal">
                Enable SMS notifications
              </Label>
            </div>

            <div>
              <Label htmlFor="sms_provider">SMS Provider</Label>
              <Select
                id="sms_provider"
                value={formData.sms_provider}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sms_provider: e.target.value as "twilio" | "none",
                  })
                }
              >
                <option value="none">None</option>
                <option value="twilio">Twilio</option>
              </Select>
            </div>

            {formData.sms_provider === "twilio" && (
              <div>
                <Label htmlFor="sms_from_number">From Phone Number</Label>
                <Input
                  id="sms_from_number"
                  type="tel"
                  value={formData.sms_from_number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sms_from_number: e.target.value,
                    })
                  }
                  placeholder="+15551234567"
                />
                <p className="text-xs text-text-muted mt-1">
                  Your Twilio phone number in E.164 format
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end">
          <Button type="submit" disabled={updateSettings.isPending}>
            {updateSettings.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}
