import { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Input } from "@/components/ui/Input.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import {
  useEmailLists,
  useEmailListDetail,
  useCreateEmailList,
  useDeleteEmailList,
  useAddSubscribers,
  useRemoveSubscriber,
  useImportPermits,
  useImportCustomers,
  useImportPermitsPreview,
  useImportCustomersPreview,
} from "@/api/hooks/useEmailMarketing.ts";
import type { SubscriptionTier, EmailList } from "@/api/types/emailMarketing.ts";

interface ListsTabProps {
  tier: SubscriptionTier;
}

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  permit_import: "Permit Import",
  crm_sync: "CRM Sync",
  permit: "Permit Data",
  customer: "CRM Customer",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "default" | "warning" | "danger" }> = {
  active: { label: "Active", variant: "success" },
  unsubscribed: { label: "Unsubscribed", variant: "default" },
  bounced: { label: "Bounced", variant: "warning" },
  complained: { label: "Complained", variant: "danger" },
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "--";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "--";
  }
}

export function ListsTab({ tier }: ListsTabProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportPermitsDialog, setShowImportPermitsDialog] = useState(false);
  const [showImportCustomersDialog, setShowImportCustomersDialog] = useState(false);
  const [showAddSubscriberDialog, setShowAddSubscriberDialog] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [subscriberPage, setSubscriberPage] = useState(1);

  // Form state
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [newSubEmail, setNewSubEmail] = useState("");
  const [newSubFirstName, setNewSubFirstName] = useState("");
  const [newSubLastName, setNewSubLastName] = useState("");

  // Queries
  const { data: lists = [], isLoading } = useEmailLists();
  const { data: listDetail, isLoading: detailLoading } = useEmailListDetail(
    expandedListId || "",
    subscriberPage,
  );

  // Import previews (only fetch when dialog is open)
  const { data: permitPreview } = useImportPermitsPreview(
    showImportPermitsDialog && selectedListId ? selectedListId : "",
  );
  const { data: customerPreview } = useImportCustomersPreview(
    showImportCustomersDialog && selectedListId ? selectedListId : "",
  );

  // Mutations
  const createList = useCreateEmailList();
  const deleteList = useDeleteEmailList();
  const addSubscribers = useAddSubscribers();
  const removeSubscriber = useRemoveSubscriber();
  const importPermits = useImportPermits();
  const importCustomers = useImportCustomers();

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    try {
      await createList.mutateAsync({
        name: newListName.trim(),
        description: newListDescription.trim() || undefined,
      });
      setShowCreateDialog(false);
      setNewListName("");
      setNewListDescription("");
    } catch (err) {
      console.error("Failed to create list:", err);
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm("Are you sure you want to delete this list?")) return;
    try {
      await deleteList.mutateAsync(listId);
      if (expandedListId === listId) setExpandedListId(null);
    } catch (err) {
      console.error("Failed to delete list:", err);
    }
  };

  const handleAddSubscriber = async () => {
    if (!selectedListId || !newSubEmail.trim()) return;
    try {
      await addSubscribers.mutateAsync({
        listId: selectedListId,
        subscribers: [
          {
            email: newSubEmail.trim(),
            first_name: newSubFirstName.trim() || undefined,
            last_name: newSubLastName.trim() || undefined,
            source: "manual",
          },
        ],
      });
      setShowAddSubscriberDialog(false);
      setNewSubEmail("");
      setNewSubFirstName("");
      setNewSubLastName("");
    } catch (err) {
      console.error("Failed to add subscriber:", err);
    }
  };

  const handleRemoveSubscriber = async (subscriberId: string) => {
    if (!expandedListId) return;
    if (!confirm("Remove this subscriber from the list?")) return;
    try {
      await removeSubscriber.mutateAsync({
        listId: expandedListId,
        subscriberId,
      });
    } catch (err) {
      console.error("Failed to remove subscriber:", err);
    }
  };

  const handleImportPermits = async () => {
    if (!selectedListId) return;
    try {
      const result = await importPermits.mutateAsync({
        listId: selectedListId,
      });
      alert(
        `Import complete: ${result.added} added, ${result.skipped} skipped (already in list). ${result.total_permits_found} total permits found with email.`,
      );
      setShowImportPermitsDialog(false);
    } catch (err) {
      console.error("Failed to import permits:", err);
    }
  };

  const handleImportCustomers = async () => {
    if (!selectedListId) return;
    try {
      const result = await importCustomers.mutateAsync({
        listId: selectedListId,
      });
      alert(
        `Import complete: ${result.added} added, ${result.skipped} skipped (already in list). ${result.total_customers_found} total customers found with email.`,
      );
      setShowImportCustomersDialog(false);
    } catch (err) {
      console.error("Failed to import customers:", err);
    }
  };

  const toggleExpand = (listId: string) => {
    if (expandedListId === listId) {
      setExpandedListId(null);
    } else {
      setExpandedListId(listId);
      setSubscriberPage(1);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 bg-bg-muted rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Email Lists
          </h2>
          <p className="text-sm text-text-secondary">
            Manage subscriber lists for targeted email campaigns
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          + Create List
        </Button>
      </div>

      {/* Lists Table */}
      {lists.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">&#x1F4CB;</div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No email lists yet
            </h3>
            <p className="text-text-secondary mb-4">
              Create your first list to start organizing subscribers for
              targeted email campaigns.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              Create Your First List
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {lists.map((list: EmailList) => (
            <Card key={list.id}>
              <CardContent className="py-4">
                {/* List Row */}
                <div className="flex items-center justify-between">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => toggleExpand(list.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {expandedListId === list.id ? "\u25BC" : "\u25B6"}
                      </span>
                      <div>
                        <h3 className="font-semibold text-text-primary">
                          {list.name}
                        </h3>
                        {list.description && (
                          <p className="text-sm text-text-secondary">
                            {list.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-text-primary">
                        {list.subscriber_count.toLocaleString()}
                      </p>
                      <p className="text-xs text-text-muted">subscribers</p>
                    </div>
                    <Badge variant="info">
                      {SOURCE_LABELS[list.source] || list.source}
                    </Badge>
                    <p className="text-xs text-text-muted min-w-[80px]">
                      {formatDate(list.created_at)}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedListId(list.id);
                          setShowImportPermitsDialog(true);
                        }}
                        title="Import from Permits"
                      >
                        Import Permits
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedListId(list.id);
                          setShowImportCustomersDialog(true);
                        }}
                        title="Import from CRM"
                      >
                        Import CRM
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedListId(list.id);
                          setShowAddSubscriberDialog(true);
                        }}
                        title="Add Subscriber"
                      >
                        + Add
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger hover:text-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteList(list.id);
                        }}
                        title="Delete List"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Subscriber Table */}
                {expandedListId === list.id && (
                  <div className="mt-4 border-t border-border pt-4">
                    {detailLoading ? (
                      <div className="text-center py-4 text-text-secondary">
                        Loading subscribers...
                      </div>
                    ) : !listDetail?.subscribers?.length ? (
                      <div className="text-center py-4 text-text-secondary">
                        No subscribers yet. Import from permits or CRM
                        customers to get started.
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-2 px-2 text-text-muted font-medium">
                                  Email
                                </th>
                                <th className="text-left py-2 px-2 text-text-muted font-medium">
                                  Name
                                </th>
                                <th className="text-left py-2 px-2 text-text-muted font-medium">
                                  Source
                                </th>
                                <th className="text-left py-2 px-2 text-text-muted font-medium">
                                  Status
                                </th>
                                <th className="text-left py-2 px-2 text-text-muted font-medium">
                                  Subscribed
                                </th>
                                <th className="text-right py-2 px-2 text-text-muted font-medium">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {listDetail.subscribers.map((sub) => {
                                const statusCfg =
                                  STATUS_CONFIG[sub.status] || STATUS_CONFIG.active;
                                return (
                                  <tr
                                    key={sub.id}
                                    className="border-b border-border/50 hover:bg-bg-muted/50"
                                  >
                                    <td className="py-2 px-2 text-text-primary">
                                      {sub.email}
                                    </td>
                                    <td className="py-2 px-2 text-text-secondary">
                                      {[sub.first_name, sub.last_name]
                                        .filter(Boolean)
                                        .join(" ") || "--"}
                                    </td>
                                    <td className="py-2 px-2">
                                      <Badge variant="outline" size="sm">
                                        {SOURCE_LABELS[sub.source] || sub.source}
                                      </Badge>
                                    </td>
                                    <td className="py-2 px-2">
                                      <Badge variant={statusCfg.variant} size="sm">
                                        {statusCfg.label}
                                      </Badge>
                                    </td>
                                    <td className="py-2 px-2 text-text-muted">
                                      {formatDate(sub.subscribed_at)}
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-danger hover:text-danger text-xs"
                                        onClick={() =>
                                          handleRemoveSubscriber(sub.id)
                                        }
                                      >
                                        Remove
                                      </Button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination */}
                        {listDetail.pagination &&
                          listDetail.pagination.total_pages > 1 && (
                            <div className="flex items-center justify-between mt-4">
                              <p className="text-sm text-text-muted">
                                Page {listDetail.pagination.page} of{" "}
                                {listDetail.pagination.total_pages} (
                                {listDetail.pagination.total.toLocaleString()}{" "}
                                total)
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={subscriberPage <= 1}
                                  onClick={() =>
                                    setSubscriberPage((p) => Math.max(1, p - 1))
                                  }
                                >
                                  Previous
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={
                                    subscriberPage >=
                                    listDetail.pagination.total_pages
                                  }
                                  onClick={() =>
                                    setSubscriberPage((p) => p + 1)
                                  }
                                >
                                  Next
                                </Button>
                              </div>
                            </div>
                          )}
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create List Dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        ariaLabel="Create Email List"
      >
        <DialogContent>
          <DialogHeader>
            <h2 className="text-lg font-semibold text-text-primary">
              Create Email List
            </h2>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  List Name *
                </label>
                <Input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g., Central TX Permit Owners"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Description
                </label>
                <Input
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  placeholder="Brief description of this list's purpose"
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateList}
              disabled={!newListName.trim() || createList.isPending}
            >
              {createList.isPending ? "Creating..." : "Create List"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Subscriber Dialog */}
      <Dialog
        open={showAddSubscriberDialog}
        onClose={() => setShowAddSubscriberDialog(false)}
        ariaLabel="Add Subscriber"
      >
        <DialogContent>
          <DialogHeader>
            <h2 className="text-lg font-semibold text-text-primary">
              Add Subscriber
            </h2>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Email *
                </label>
                <Input
                  type="email"
                  value={newSubEmail}
                  onChange={(e) => setNewSubEmail(e.target.value)}
                  placeholder="subscriber@example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    First Name
                  </label>
                  <Input
                    value={newSubFirstName}
                    onChange={(e) => setNewSubFirstName(e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Last Name
                  </label>
                  <Input
                    value={newSubLastName}
                    onChange={(e) => setNewSubLastName(e.target.value)}
                    placeholder="Smith"
                  />
                </div>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowAddSubscriberDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSubscriber}
              disabled={!newSubEmail.trim() || addSubscribers.isPending}
            >
              {addSubscribers.isPending ? "Adding..." : "Add Subscriber"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Permits Dialog */}
      <Dialog
        open={showImportPermitsDialog}
        onClose={() => setShowImportPermitsDialog(false)}
        ariaLabel="Import from Permits"
      >
        <DialogContent>
          <DialogHeader>
            <h2 className="text-lg font-semibold text-text-primary">
              Import from Septic Permits
            </h2>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <p className="text-text-secondary">
                Import owner email addresses from the septic permits database
                into this list. Only permits with valid email addresses will
                be imported.
              </p>

              {permitPreview && (
                <Card className="border-primary">
                  <CardContent className="py-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-text-primary">
                          {(
                            permitPreview.total_permits_with_email || 0
                          ).toLocaleString()}
                        </p>
                        <p className="text-xs text-text-muted">
                          Permits with Email
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-text-secondary">
                          {permitPreview.already_in_list.toLocaleString()}
                        </p>
                        <p className="text-xs text-text-muted">
                          Already in List
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-success">
                          {permitPreview.estimated_new.toLocaleString()}
                        </p>
                        <p className="text-xs text-text-muted">
                          Estimated New
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="bg-warning-light/30 border border-warning/20 rounded-lg p-3">
                <p className="text-sm text-text-secondary">
                  <strong>Note:</strong> This will import all unique emails
                  from the permits database that are not already in this list.
                  Duplicate emails across permits are automatically
                  deduplicated.
                </p>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowImportPermitsDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportPermits}
              disabled={importPermits.isPending}
            >
              {importPermits.isPending
                ? "Importing..."
                : `Import ${permitPreview?.estimated_new?.toLocaleString() || ""} Emails`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Customers Dialog */}
      <Dialog
        open={showImportCustomersDialog}
        onClose={() => setShowImportCustomersDialog(false)}
        ariaLabel="Import from CRM Customers"
      >
        <DialogContent>
          <DialogHeader>
            <h2 className="text-lg font-semibold text-text-primary">
              Import from CRM Customers
            </h2>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <p className="text-text-secondary">
                Import email addresses from your CRM customer database into
                this list. Only customers with valid email addresses will be
                imported.
              </p>

              {customerPreview && (
                <Card className="border-primary">
                  <CardContent className="py-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-text-primary">
                          {(
                            customerPreview.total_customers_with_email || 0
                          ).toLocaleString()}
                        </p>
                        <p className="text-xs text-text-muted">
                          Customers with Email
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-text-secondary">
                          {customerPreview.already_in_list.toLocaleString()}
                        </p>
                        <p className="text-xs text-text-muted">
                          Already in List
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-success">
                          {customerPreview.estimated_new.toLocaleString()}
                        </p>
                        <p className="text-xs text-text-muted">
                          Estimated New
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="bg-info-light/30 border border-info/20 rounded-lg p-3">
                <p className="text-sm text-text-secondary">
                  <strong>Note:</strong> This imports all active CRM customers
                  with email addresses. Customer name and contact info will be
                  included with each subscriber record.
                </p>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowImportCustomersDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportCustomers}
              disabled={importCustomers.isPending}
            >
              {importCustomers.isPending
                ? "Importing..."
                : `Import ${customerPreview?.estimated_new?.toLocaleString() || ""} Emails`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
