import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  useProspect,
  useUpdateProspect,
  useUpdateProspectStage,
  useDeleteProspect,
} from "@/api/hooks/useProspects.ts";
import { ProspectForm } from "./components/ProspectForm.tsx";
import { Button } from "@/components/ui/Button.tsx";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Select } from "@/components/ui/Select.tsx";
import { ApiError } from "@/components/ui/ApiError.tsx";
import { ConfirmDialog } from "@/components/ui/Dialog.tsx";
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils.ts";
import {
  PROSPECT_STAGE_LABELS,
  LEAD_SOURCE_LABELS,
  type ProspectStage,
} from "@/api/types/common.ts";
import type { ProspectFormData } from "@/api/types/prospect.ts";
import { ActivityTimeline } from "@/features/activities";
import { AttachmentList } from "@/features/documents";
import { DialButton, CallLog } from "@/features/phone/index.ts";
import { useEmailCompose } from "@/context/EmailComposeContext";

/**
 * Prospect detail page - view/edit individual prospect
 */
export function ProspectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { openEmailCompose } = useEmailCompose();

  const { data: prospect, isLoading, error, refetch } = useProspect(id);

  // Modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Mutations
  const updateMutation = useUpdateProspect();
  const stageMutation = useUpdateProspectStage();
  const deleteMutation = useDeleteProspect();

  const handleStageChange = async (newStage: ProspectStage) => {
    if (id && prospect) {
      await stageMutation.mutateAsync({ id, stage: newStage });
    }
  };

  const handleEdit = async (data: ProspectFormData) => {
    if (id) {
      await updateMutation.mutateAsync({ id, data });
    }
  };

  const handleDelete = async () => {
    if (id) {
      await deleteMutation.mutateAsync(id);
      navigate("/prospects");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-bg-muted w-48 mb-4 rounded" />
          <div className="h-64 bg-bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ApiError
          error={error}
          onRetry={() => refetch()}
          title="Failed to load prospect"
        />
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Prospect not found
        </h2>
        <p className="text-text-secondary mb-4">
          The prospect you're looking for doesn't exist or has been deleted.
        </p>
        <Link to="/prospects">
          <Button>Back to Prospects</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              to="/prospects"
              className="text-text-secondary hover:text-text-primary text-sm"
            >
              ← Back to Prospects
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">
            {prospect.first_name || ""} {prospect.last_name || ""}
          </h1>
          {prospect.company_name && (
            <p className="text-text-secondary">{prospect.company_name}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setIsEditOpen(true)}>
            Edit
          </Button>
          <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
            Delete
          </Button>
        </div>
      </div>

      {/* Stage Quick Update */}
      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-text-secondary">
            Current Stage:
          </span>
          <Badge variant="stage" stage={prospect.prospect_stage}>
            {PROSPECT_STAGE_LABELS[prospect.prospect_stage]}
          </Badge>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-text-secondary">Quick update:</span>
            <Select
              value={prospect.prospect_stage}
              onChange={(e) =>
                handleStageChange(e.target.value as ProspectStage)
              }
              className="w-40"
              disabled={stageMutation.isPending}
            >
              {Object.entries(PROSPECT_STAGE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-text-secondary">Email</dt>
                <dd className="font-medium">
                  {prospect.email ? (
                    <button
                      onClick={() => openEmailCompose({ to: prospect.email!, customerName: `${prospect.first_name || ""} ${prospect.last_name || ""}` })}
                      className="text-text-link hover:underline"
                    >
                      {prospect.email}
                    </button>
                  ) : (
                    <span className="text-text-muted">Not provided</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-text-secondary">Phone</dt>
                <dd className="font-medium flex items-center gap-2">
                  {prospect.phone ? (
                    <>
                      <a
                        href={`tel:${prospect.phone}`}
                        className="text-text-link hover:underline"
                      >
                        {formatPhone(prospect.phone)}
                      </a>
                      <DialButton
                        phoneNumber={prospect.phone}
                        prospectId={id}
                      />
                    </>
                  ) : (
                    <span className="text-text-muted">Not provided</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-text-secondary">Address</dt>
                <dd className="font-medium">
                  {prospect.address_line1 ? (
                    <>
                      {prospect.address_line1}
                      <br />
                      {prospect.city && `${prospect.city}, `}
                      {prospect.state} {prospect.postal_code}
                    </>
                  ) : (
                    <span className="text-text-muted">Not provided</span>
                  )}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Sales Information */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-text-secondary">Lead Source</dt>
                <dd className="font-medium">
                  {prospect.lead_source ? (
                    LEAD_SOURCE_LABELS[prospect.lead_source]
                  ) : (
                    <span className="text-text-muted">Unknown</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-text-secondary">Estimated Value</dt>
                <dd className="font-medium text-success">
                  {formatCurrency(prospect.estimated_value)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-text-secondary">
                  Assigned Sales Rep
                </dt>
                <dd className="font-medium">
                  {prospect.assigned_sales_rep || (
                    <span className="text-text-muted">Unassigned</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-text-secondary">Next Follow-up</dt>
                <dd className="font-medium">
                  {prospect.next_follow_up_date ? (
                    formatDate(prospect.next_follow_up_date)
                  ) : (
                    <span className="text-text-muted">Not scheduled</span>
                  )}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {prospect.lead_notes ? (
              <p className="whitespace-pre-wrap text-text-primary">
                {prospect.lead_notes}
              </p>
            ) : (
              <p className="text-text-muted italic">No notes added yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Call History */}
        <div className="lg:col-span-2">
          <CallLog prospectId={id} limit={5} />
        </div>

        {/* Activity Timeline */}
        <div className="lg:col-span-2">
          <ActivityTimeline customerId={id!} />
        </div>

        {/* Attachments */}
        <div className="lg:col-span-2">
          <AttachmentList entityId={id!} entityType="prospect" />
        </div>

        {/* Metadata */}
        <Card className="lg:col-span-2">
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm text-text-secondary">
              <span>Created: {formatDate(prospect.created_at)}</span>
              <span>Last Updated: {formatDate(prospect.updated_at)}</span>
              <span className="text-xs font-mono text-text-muted">
                ID: {prospect.id}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      <ProspectForm
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleEdit}
        prospect={prospect}
        isLoading={updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Prospect"
        message={`Are you sure you want to delete ${prospect.first_name || ""} ${prospect.last_name || ""}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
