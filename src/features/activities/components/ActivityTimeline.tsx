import { useState } from "react";
import {
  useActivities,
  useCreateActivity,
  useDeleteActivity,
} from "@/api/hooks/useActivities.ts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Select } from "@/components/ui/Select.tsx";
import { ConfirmDialog } from "@/components/ui/Dialog.tsx";
import { NoteCard } from "./NoteCard.tsx";
import { ActivityForm } from "./ActivityForm.tsx";
import {
  ACTIVITY_TYPE_LABELS,
  type Activity,
  type ActivityFormData,
  type ActivityType,
} from "@/api/types/activity.ts";

export interface ActivityTimelineProps {
  customerId: string;
}

/**
 * Activity timeline component - vertical timeline of customer activities
 * Displays all activities (calls, emails, notes, etc.) for a customer
 */
export function ActivityTimeline({ customerId }: ActivityTimelineProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null,
  );
  const [deleteActivity, setDeleteActivity] = useState<Activity | null>(null);
  const [typeFilter, setTypeFilter] = useState<ActivityType | "">("");

  const { data, isLoading, error } = useActivities({
    customer_id: customerId,
    page_size: 100,
    activity_type: typeFilter || undefined,
  });

  const createMutation = useCreateActivity();
  const deleteMutation = useDeleteActivity();

  const activities = data?.items || [];

  const handleCreateActivity = async (formData: ActivityFormData) => {
    await createMutation.mutateAsync(formData);
  };

  const handleDeleteActivity = async () => {
    if (deleteActivity) {
      await deleteMutation.mutateAsync(deleteActivity.id);
      setDeleteActivity(null);
    }
  };

  const handleEdit = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsFormOpen(true);
  };

  const handleDelete = (activity: Activity) => {
    setDeleteActivity(activity);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedActivity(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Activity Timeline</CardTitle>
            <div className="flex items-center gap-3">
              <Select
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value as ActivityType | "")
                }
                className="w-40"
              >
                <option value="">All Types</option>
                {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Button onClick={() => setIsFormOpen(true)}>Log Activity</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-bg-muted rounded w-1/4" />
                    <div className="h-3 bg-bg-muted rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-danger mb-2">Failed to load activities</p>
              <p className="text-sm text-text-muted">Please try again later</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-text-muted mb-4">No activities recorded yet</p>
              <Button onClick={() => setIsFormOpen(true)}>
                Log First Activity
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {activities.map((activity, index) => (
                <div key={activity.id}>
                  <NoteCard
                    activity={activity}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                  {index < activities.length - 1 && (
                    <div className="ml-4 mt-3 mb-3 border-l-2 border-border h-4" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Form Modal */}
      <ActivityForm
        open={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleCreateActivity}
        customerId={customerId}
        activity={selectedActivity}
        isLoading={createMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteActivity}
        onClose={() => setDeleteActivity(null)}
        onConfirm={handleDeleteActivity}
        title="Delete Activity"
        message="Are you sure you want to delete this activity? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
