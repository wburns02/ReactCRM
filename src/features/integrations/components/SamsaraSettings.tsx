import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Label } from "@/components/ui/Label.tsx";
import { useFleetLocations } from "@/features/fleet/api.ts";
import { toastSuccess } from "@/components/ui/Toast";

/**
 * Samsara GPS configuration settings
 */
export function SamsaraSettings() {
  const { data: vehicles, isLoading } = useFleetLocations();
  const [apiToken, setApiToken] = useState("");
  const [refreshInterval, setRefreshInterval] = useState("30");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // In a real implementation, this would call an API to save the settings
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    toastSuccess("Samsara settings saved (demo only)");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Samsara GPS Fleet Tracking</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-bg-muted w-48 mb-4 rounded" />
            <div className="h-10 bg-bg-muted rounded" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connection Status */}
            <div className="p-3 bg-bg-hover rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-text-primary">
                    Connection Status
                  </p>
                  {vehicles && vehicles.length > 0 && (
                    <p className="text-sm text-text-secondary">
                      Tracking {vehicles.length} vehicle
                      {vehicles.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                <div
                  className={`w-3 h-3 rounded-full ${
                    vehicles && vehicles.length > 0
                      ? "bg-success"
                      : "bg-text-muted"
                  }`}
                />
              </div>
            </div>

            {/* API Credentials */}
            <div>
              <Label htmlFor="samsara-api-token">API Token</Label>
              <Input
                id="samsara-api-token"
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Enter Samsara API token"
              />
              <p className="text-xs text-text-muted mt-1">
                You can generate an API token from your Samsara dashboard
              </p>
            </div>

            {/* Settings */}
            <div>
              <Label htmlFor="refresh-interval">
                Location Refresh Interval (seconds)
              </Label>
              <Input
                id="refresh-interval"
                type="number"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(e.target.value)}
                min="10"
                max="300"
              />
              <p className="text-xs text-text-muted mt-1">
                How often to poll for updated vehicle locations (10-300 seconds)
              </p>
            </div>

            {/* Features */}
            <div>
              <p className="font-medium text-text-primary mb-2">
                Enabled Features
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" defaultChecked className="rounded" />
                  Real-time vehicle location tracking
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" defaultChecked className="rounded" />
                  Vehicle trail/history display
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" defaultChecked className="rounded" />
                  Driver assignment tracking
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded" />
                  Geofence alerts (coming soon)
                </label>
              </div>
            </div>

            {/* Vehicle Stats */}
            {vehicles && vehicles.length > 0 && (
              <div className="p-3 bg-bg-hover rounded-lg">
                <p className="font-medium text-text-primary mb-2">
                  Fleet Statistics
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-text-secondary">Total Vehicles:</span>
                    <span className="ml-2 font-medium">{vehicles.length}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Active:</span>
                    <span className="ml-2 font-medium text-success">
                      {vehicles.filter((v) => v.status !== "offline").length}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-secondary">
                      Assigned Drivers:
                    </span>
                    <span className="ml-2 font-medium">
                      {vehicles.filter((v) => v.driver_id).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Offline:</span>
                    <span className="ml-2 font-medium text-text-muted">
                      {vehicles.filter((v) => v.status === "offline").length}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Settings"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.open("https://cloud.samsara.com")}
              >
                Samsara Dashboard
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
