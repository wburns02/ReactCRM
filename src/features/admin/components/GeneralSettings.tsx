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
  useSystemSettings,
  useUpdateSystemSettings,
} from "@/api/hooks/useAdmin.ts";
import { getErrorMessage } from "@/api/client.ts";
import { toastSuccess, toastError } from "@/components/ui/Toast";

export function GeneralSettings() {
  const { data: settings, isLoading } = useSystemSettings();
  const updateSettings = useUpdateSystemSettings();

  const [formData, setFormData] = useState({
    company_name: "",
    timezone: "America/New_York",
    date_format: "MM/DD/YYYY",
    time_format: "12h",
    currency: "USD",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        company_name: settings.company_name || "",
        timezone: settings.timezone || "America/New_York",
        date_format: settings.date_format || "MM/DD/YYYY",
        time_format: settings.time_format || "12h",
        currency: settings.currency || "USD",
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings.mutateAsync(formData);
      toastSuccess("Settings saved successfully!");
    } catch (error) {
      toastError(`Error: ${getErrorMessage(error)}`);
    }
  };

  if (isLoading) {
    return <div className="text-text-secondary">Loading settings...</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <p className="text-sm text-text-secondary mt-1">
            Configure company information and regional settings
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Info */}
          <div className="space-y-4">
            <h4 className="font-medium text-text-primary">
              Company Information
            </h4>
            <div>
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) =>
                  setFormData({ ...formData, company_name: e.target.value })
                }
                placeholder="MAC Septic"
              />
            </div>
          </div>

          {/* Regional Settings */}
          <div className="space-y-4 pt-6 border-t border-border">
            <h4 className="font-medium text-text-primary">Regional Settings</h4>
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                id="timezone"
                value={formData.timezone}
                onChange={(e) =>
                  setFormData({ ...formData, timezone: e.target.value })
                }
              >
                <option value="America/New_York">
                  Eastern Time (US & Canada)
                </option>
                <option value="America/Chicago">
                  Central Time (US & Canada)
                </option>
                <option value="America/Denver">
                  Mountain Time (US & Canada)
                </option>
                <option value="America/Los_Angeles">
                  Pacific Time (US & Canada)
                </option>
              </Select>
            </div>

            <div>
              <Label htmlFor="date_format">Date Format</Label>
              <Select
                id="date_format"
                value={formData.date_format}
                onChange={(e) =>
                  setFormData({ ...formData, date_format: e.target.value })
                }
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="time_format">Time Format</Label>
              <Select
                id="time_format"
                value={formData.time_format}
                onChange={(e) =>
                  setFormData({ ...formData, time_format: e.target.value })
                }
              >
                <option value="12h">12-hour (2:30 PM)</option>
                <option value="24h">24-hour (14:30)</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select
                id="currency"
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value })
                }
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
              </Select>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-6 border-t border-border flex justify-end">
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
