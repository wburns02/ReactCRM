import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

/**
 * Reminder Detail/Editor Page
 */
export function ReminderDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: reminder, isLoading } = useQuery({
    queryKey: ["reminder", id],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/reminders/${id}`);
        return response.data;
      } catch {
        // Return mock data for demo
        return {
          id,
          name: "Appointment Reminder - 24 Hours",
          trigger: "scheduled_appointment",
          timing_value: 24,
          timing_unit: "hours",
          channels: ["sms"],
          enabled: true,
          template_id: null,
          custom_message:
            "Hi {{customer_name}}, this is a reminder about your appointment tomorrow at {{time}}.",
        };
      }
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<typeof reminder>) => {
      await apiClient.patch(`/reminders/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminder", id] });
      setIsEditing(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch(`/reminders/${id}`, {
        enabled: !reminder?.enabled,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminder", id] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/communications/reminders"
          className="text-text-muted hover:text-text-primary mb-2 inline-block"
        >
          &larr; Back to Reminders
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">
              {reminder?.name}
            </h1>
            <p className="text-text-muted">Configure this auto-reminder</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => toggleMutation.mutate()}
              disabled={toggleMutation.isPending}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                reminder?.enabled
                  ? "bg-danger/10 text-danger hover:bg-danger/20"
                  : "bg-success/10 text-success hover:bg-success/20"
              }`}
            >
              {reminder?.enabled ? "Disable" : "Enable"}
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
            >
              {isEditing ? "Cancel" : "Edit"}
            </button>
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-bg-card border border-border rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${reminder?.enabled ? "bg-success" : "bg-text-muted"}`}
          ></div>
          <span
            className={`font-medium ${reminder?.enabled ? "text-success" : "text-text-muted"}`}
          >
            {reminder?.enabled ? "Active" : "Paused"}
          </span>
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-bg-card border border-border rounded-lg p-4 mb-6">
        <h2 className="font-medium text-text-primary mb-4">
          Trigger Configuration
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">
              Trigger Event
            </label>
            <select
              disabled={!isEditing}
              value={reminder?.trigger}
              className="w-full px-4 py-2 border border-border rounded-lg bg-bg-body text-text-primary disabled:opacity-60"
            >
              <option value="scheduled_appointment">
                Scheduled Appointment
              </option>
              <option value="invoice_due">Invoice Due Date</option>
              <option value="service_due">Service Due Date</option>
              <option value="follow_up">Follow-up</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">Timing</label>
            <div className="flex gap-2">
              <input
                type="number"
                disabled={!isEditing}
                value={reminder?.timing_value || 24}
                className="flex-1 px-4 py-2 border border-border rounded-lg bg-bg-body text-text-primary disabled:opacity-60"
              />
              <select
                disabled={!isEditing}
                value={reminder?.timing_unit}
                className="px-4 py-2 border border-border rounded-lg bg-bg-body text-text-primary disabled:opacity-60"
              >
                <option value="minutes">Minutes Before</option>
                <option value="hours">Hours Before</option>
                <option value="days">Days Before</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Channels */}
      <div className="bg-bg-card border border-border rounded-lg p-4 mb-6">
        <h2 className="font-medium text-text-primary mb-4">
          Delivery Channels
        </h2>
        <div className="flex gap-4">
          {["sms", "email"].map((channel) => (
            <label
              key={channel}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                disabled={!isEditing}
                checked={reminder?.channels?.includes(channel)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary disabled:opacity-60"
              />
              <span className="text-text-primary capitalize">{channel}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Message Content */}
      <div className="bg-bg-card border border-border rounded-lg p-4">
        <h2 className="font-medium text-text-primary mb-4">Message Content</h2>
        <textarea
          disabled={!isEditing}
          value={reminder?.custom_message || ""}
          placeholder="Enter custom message or select a template..."
          rows={4}
          className="w-full px-4 py-3 border border-border rounded-lg bg-bg-body text-text-primary placeholder:text-text-muted disabled:opacity-60"
        />
        <p className="text-xs text-text-muted mt-2">
          Available variables: {"{{customer_name}}"}, {"{{date}}"}, {"{{time}}"}
          , {"{{address}}"}
        </p>

        {isEditing && (
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-border rounded-lg text-text-secondary"
            >
              Cancel
            </button>
            <button
              onClick={() => updateMutation.mutate(reminder)}
              disabled={updateMutation.isPending}
              className="px-4 py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
