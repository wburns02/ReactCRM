/**
 * Tracking Dashboard
 * Main page for GPS tracking management and dispatch map
 */

import { useState } from "react";
import { cn } from "@/lib/utils.ts";
import { LiveDispatchMap } from "./components/LiveDispatchMap.tsx";
import { TechnicianGPSCapture } from "./components/TechnicianGPSCapture.tsx";
import {
  useAllTechnicianLocations,
  useGeofences,
  useGeofenceEvents,
  useGPSConfig,
  useUpdateGPSConfig,
  useCreateGeofence,
  useDeleteGeofence,
} from "@/hooks/useGPSTracking.ts";
import type { GeofenceCreate, Geofence } from "@/api/types/gpsTracking.ts";
import {
  Map,
  Settings,
  Users,
  Layers,
  Activity,
  Plus,
  Trash2,
  Edit2,
  Eye,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Filter,
} from "lucide-react";

type TabType = "map" | "technicians" | "geofences" | "events" | "settings";

interface TabProps {
  id: TabType;
  label: string;
  icon: React.ElementType;
  count?: number;
}

const tabs: TabProps[] = [
  { id: "map", label: "Live Map", icon: Map },
  { id: "technicians", label: "Technicians", icon: Users },
  { id: "geofences", label: "Geofences", icon: Layers },
  { id: "events", label: "Events", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
];

export function TrackingDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("map");
  const [showCreateGeofence, setShowCreateGeofence] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<number | null>(
    null,
  );

  const { data: locations, refetch: refetchLocations } =
    useAllTechnicianLocations();
  const { data: geofences, refetch: refetchGeofences } = useGeofences();
  const { data: events } = useGeofenceEvents({ limit: 50 });
  const { data: config } = useGPSConfig();
  const updateConfig = useUpdateGPSConfig();
  const createGeofence = useCreateGeofence();
  const deleteGeofence = useDeleteGeofence();

  const handleCreateGeofence = async (data: GeofenceCreate) => {
    await createGeofence.mutateAsync(data);
    setShowCreateGeofence(false);
    refetchGeofences();
  };

  const handleDeleteGeofence = async (id: number) => {
    if (confirm("Are you sure you want to delete this geofence?")) {
      await deleteGeofence.mutateAsync(id);
      refetchGeofences();
    }
  };

  const handleConfigToggle = async (key: string, value: boolean) => {
    await updateConfig.mutateAsync({ [key]: value });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">GPS Tracking</h1>
              <p className="text-sm text-gray-500">
                Real-time technician tracking and dispatch
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-gray-600">
                  {locations?.total_online || 0} Online
                </span>
              </div>
              <button
                onClick={() => refetchLocations()}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-1 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className="px-2 py-0.5 text-xs bg-gray-100 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-4">
        {/* Live Map Tab */}
        {activeTab === "map" && (
          <div className="space-y-4">
            <LiveDispatchMap
              className="rounded-xl shadow-sm"
              onTechnicianSelect={setSelectedTechnician}
            />

            {selectedTechnician && (
              <div className="bg-white rounded-xl shadow-sm p-4">
                <h3 className="font-semibold mb-4">
                  Technician #{selectedTechnician} Details
                </h3>
                <TechnicianGPSCapture
                  technicianId={selectedTechnician}
                  className="border-0 shadow-none p-0"
                />
              </div>
            )}
          </div>
        )}

        {/* Technicians Tab */}
        {activeTab === "technicians" && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold">All Technicians</h3>
            </div>
            <div className="divide-y">
              {locations?.technicians.map((tech) => (
                <div key={tech.technician_id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          tech.is_online ? "bg-green-100" : "bg-gray-100",
                        )}
                      >
                        <Users
                          className={cn(
                            "w-5 h-5",
                            tech.is_online ? "text-green-600" : "text-gray-400",
                          )}
                        />
                      </div>
                      <div>
                        <div className="font-medium">
                          {tech.technician_name}
                        </div>
                        <div className="text-sm text-gray-500 capitalize">
                          {tech.current_status.replace("_", " ")}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {tech.minutes_since_update === 0
                          ? "Just now"
                          : `${tech.minutes_since_update} min ago`}
                      </div>
                      {tech.battery_level !== undefined && (
                        <div
                          className={cn(
                            "text-xs",
                            tech.battery_level < 20
                              ? "text-red-500"
                              : "text-gray-400",
                          )}
                        >
                          Battery: {tech.battery_level}%
                        </div>
                      )}
                    </div>
                  </div>
                  {tech.current_work_order_id && (
                    <div className="mt-2 text-sm text-blue-600">
                      Currently on WO #{tech.current_work_order_id}
                    </div>
                  )}
                </div>
              ))}
              {(!locations?.technicians ||
                locations.technicians.length === 0) && (
                <div className="p-8 text-center text-gray-500">
                  No technician locations available
                </div>
              )}
            </div>
          </div>
        )}

        {/* Geofences Tab */}
        {activeTab === "geofences" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Geofences</h3>
              <button
                onClick={() => setShowCreateGeofence(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Geofence
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="divide-y">
                {geofences?.map((geofence: Geofence) => (
                  <div key={geofence.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            geofence.is_active ? "bg-green-100" : "bg-gray-100",
                          )}
                        >
                          <Layers
                            className={cn(
                              "w-5 h-5",
                              geofence.is_active
                                ? "text-green-600"
                                : "text-gray-400",
                            )}
                          />
                        </div>
                        <div>
                          <div className="font-medium">{geofence.name}</div>
                          <div className="text-sm text-gray-500 capitalize">
                            {geofence.geofence_type.replace("_", " ")}
                            {geofence.radius_meters &&
                              ` • ${geofence.radius_meters}m radius`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="p-2 hover:bg-gray-100 rounded"
                          title="View"
                        >
                          <Eye className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          className="p-2 hover:bg-gray-100 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteGeofence(geofence.id)}
                          className="p-2 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-gray-500">
                      <span>Entry: {geofence.entry_action}</span>
                      <span>Exit: {geofence.exit_action}</span>
                    </div>
                  </div>
                ))}
                {(!geofences || geofences.length === 0) && (
                  <div className="p-8 text-center text-gray-500">
                    No geofences configured
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === "events" && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Geofence Events</h3>
              <button className="p-2 hover:bg-gray-100 rounded">
                <Filter className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {events?.map((event) => (
                <div key={event.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        event.event_type === "entry"
                          ? "bg-green-100"
                          : "bg-red-100",
                      )}
                    >
                      {event.event_type === "entry" ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">
                        {event.technician_name}
                        <span className="text-gray-500 font-normal">
                          {" "}
                          {event.event_type === "entry"
                            ? "entered"
                            : "left"}{" "}
                        </span>
                        {event.geofence_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(event.occurred_at).toLocaleString()}
                      </div>
                    </div>
                    {event.action_triggered && (
                      <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded">
                        {event.action_triggered}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {(!events || events.length === 0) && (
                <div className="p-8 text-center text-gray-500">
                  No geofence events recorded
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold mb-6">GPS Configuration</h3>

            <div className="space-y-6">
              {/* Tracking Intervals */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">
                  Tracking Intervals
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">
                      Active (seconds)
                    </label>
                    <input
                      type="number"
                      value={config?.active_interval || 30}
                      className="w-full px-3 py-2 border rounded-lg"
                      readOnly
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      When en route or on job
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">
                      Idle (seconds)
                    </label>
                    <input
                      type="number"
                      value={config?.idle_interval || 300}
                      className="w-full px-3 py-2 border rounded-lg"
                      readOnly
                    />
                    <p className="text-xs text-gray-400 mt-1">When available</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">
                      Background (seconds)
                    </label>
                    <input
                      type="number"
                      value={config?.background_interval || 600}
                      className="w-full px-3 py-2 border rounded-lg"
                      readOnly
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Background tracking
                    </p>
                  </div>
                </div>
              </div>

              {/* Feature Toggles */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Features</h4>
                <div className="space-y-3">
                  {[
                    {
                      key: "tracking_enabled",
                      label: "GPS Tracking",
                      description: "Enable location tracking for technicians",
                    },
                    {
                      key: "geofencing_enabled",
                      label: "Geofencing",
                      description: "Enable geofence entry/exit detection",
                    },
                    {
                      key: "auto_clockin_enabled",
                      label: "Auto Clock-In",
                      description: "Automatic clock in/out at office geofence",
                    },
                    {
                      key: "customer_tracking_enabled",
                      label: "Customer Tracking",
                      description:
                        "Allow customers to track technician location",
                    },
                    {
                      key: "high_accuracy_mode",
                      label: "High Accuracy GPS",
                      description: "Use GPS instead of network location",
                    },
                  ].map((feature) => (
                    <div
                      key={feature.key}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {feature.label}
                        </div>
                        <div className="text-sm text-gray-500">
                          {feature.description}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleConfigToggle(
                            feature.key,
                            !(config as unknown as Record<string, boolean>)?.[
                              feature.key
                            ],
                          )
                        }
                        className="text-blue-500"
                      >
                        {(config as unknown as Record<string, boolean>)?.[
                          feature.key
                        ] ? (
                          <ToggleRight className="w-8 h-8" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-gray-300" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Privacy Settings */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Privacy</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">
                        Track During Breaks
                      </div>
                      <div className="text-sm text-gray-500">
                        Continue tracking when on break
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        handleConfigToggle(
                          "track_during_breaks",
                          !config?.track_during_breaks,
                        )
                      }
                      className="text-blue-500"
                    >
                      {config?.track_during_breaks ? (
                        <ToggleRight className="w-8 h-8" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-gray-300" />
                      )}
                    </button>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        Work Hours
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <input
                        type="time"
                        value={config?.work_hours_start || "07:00"}
                        className="px-2 py-1 border rounded"
                        readOnly
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        value={config?.work_hours_end || "18:00"}
                        className="px-2 py-1 border rounded"
                        readOnly
                      />
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-900 mb-2">
                      Data Retention
                    </div>
                    <div className="text-sm text-gray-500">
                      Location history kept for{" "}
                      {config?.history_retention_days || 90} days
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Create Geofence Modal */}
      {showCreateGeofence && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create Geofence</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateGeofence({
                  name: formData.get("name") as string,
                  geofence_type: formData.get(
                    "type",
                  ) as GeofenceCreate["geofence_type"],
                  center_latitude: parseFloat(
                    formData.get("latitude") as string,
                  ),
                  center_longitude: parseFloat(
                    formData.get("longitude") as string,
                  ),
                  radius_meters: parseFloat(formData.get("radius") as string),
                  entry_action: "notify_dispatch",
                  exit_action: "log_only",
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  name="name"
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Office, Customer Site, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  name="type"
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="office">Office</option>
                  <option value="customer_site">Customer Site</option>
                  <option value="warehouse">Warehouse</option>
                  <option value="service_area">Service Area</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Latitude
                  </label>
                  <input
                    name="latitude"
                    type="number"
                    step="any"
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="32.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Longitude
                  </label>
                  <input
                    name="longitude"
                    type="number"
                    step="any"
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="-96.0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Radius (meters)
                </label>
                <input
                  name="radius"
                  type="number"
                  required
                  defaultValue={100}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateGeofence(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createGeofence.isPending}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {createGeofence.isPending ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrackingDashboard;
