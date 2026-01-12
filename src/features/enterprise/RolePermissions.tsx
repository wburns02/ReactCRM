/**
 * Role & Permissions Management
 * RBAC configuration, role assignments, and audit logging
 */
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  useRoles,
  useUserRoleAssignments,
  useAuditLogs,
  useCurrentPermissions,
  useDeleteRole,
} from "@/api/hooks/useEnterprise";
import type {
  Role,
  UserRoleAssignment,
  Permission,
} from "@/api/types/enterprise";
import { formatDate, cn } from "@/lib/utils";
import { getErrorMessage } from "@/api/client";
import { toastError } from "@/components/ui/Toast";

type PermissionsTab = "roles" | "assignments" | "audit";

export function RolePermissions() {
  const [activeTab, setActiveTab] = useState<PermissionsTab>("roles");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Roles & Permissions
          </h1>
          <p className="text-text-secondary">
            Manage access control and audit trail
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <Button
          variant={activeTab === "roles" ? "primary" : "ghost"}
          onClick={() => setActiveTab("roles")}
        >
          🔐 Roles
        </Button>
        <Button
          variant={activeTab === "assignments" ? "primary" : "ghost"}
          onClick={() => setActiveTab("assignments")}
        >
          👥 Assignments
        </Button>
        <Button
          variant={activeTab === "audit" ? "primary" : "ghost"}
          onClick={() => setActiveTab("audit")}
        >
          📋 Audit Log
        </Button>
      </div>

      {/* Content */}
      {activeTab === "roles" && <RolesTab />}
      {activeTab === "assignments" && <AssignmentsTab />}
      {activeTab === "audit" && <AuditLogTab />}
    </div>
  );
}

function RolesTab() {
  const { data: roles, isLoading } = useRoles();
  const { data: currentPerms } = useCurrentPermissions();
  const deleteRole = useDeleteRole();

  const handleDelete = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return;
    try {
      await deleteRole.mutateAsync(roleId);
    } catch (error) {
      toastError(getErrorMessage(error));
    }
  };

  // Group roles by level
  const systemRoles = roles?.filter((r) => r.level === "system") || [];
  const orgRoles = roles?.filter((r) => r.level === "organization") || [];
  const regionRoles = roles?.filter((r) => r.level === "region") || [];

  return (
    <div className="space-y-6">
      {/* Current User Permissions */}
      {currentPerms && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle>Your Current Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-text-muted">Assigned Roles</span>
                <div className="flex gap-2 mt-1">
                  {currentPerms.roles.map((role) => (
                    <Badge key={role} variant="outline">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-sm text-text-muted">Region Access</span>
                <div className="flex gap-2 mt-1">
                  {currentPerms.regions.length === 0 ? (
                    <Badge className="bg-success text-white">All Regions</Badge>
                  ) : (
                    currentPerms.regions.map((regionId) => (
                      <Badge key={regionId} variant="outline">
                        {regionId}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <div>
                <span className="text-sm text-text-muted">
                  Effective Permissions
                </span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {currentPerms.permissions.map((perm, i) => (
                    <div
                      key={i}
                      className="p-2 bg-background-secondary rounded text-sm"
                    >
                      <span className="font-medium">{perm.resource}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {perm.actions.map((action) => (
                          <Badge
                            key={action}
                            className="text-xs"
                            variant="outline"
                          >
                            {action}
                          </Badge>
                        ))}
                      </div>
                      <span className="text-xs text-text-muted">
                        Scope: {perm.scope}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Roles by Level */}
      {isLoading ? (
        <div className="h-60 bg-background-secondary animate-pulse rounded" />
      ) : (
        <>
          {/* System Roles */}
          <RoleSection
            title="System Roles"
            description="Built-in roles that cannot be deleted"
            roles={systemRoles}
            onDelete={handleDelete}
            isDeleting={deleteRole.isPending}
          />

          {/* Organization Roles */}
          <RoleSection
            title="Organization Roles"
            description="Custom roles for your organization"
            roles={orgRoles}
            onDelete={handleDelete}
            isDeleting={deleteRole.isPending}
            showCreate
          />

          {/* Region Roles */}
          <RoleSection
            title="Region Roles"
            description="Roles specific to individual regions"
            roles={regionRoles}
            onDelete={handleDelete}
            isDeleting={deleteRole.isPending}
            showCreate
          />
        </>
      )}
    </div>
  );
}

function RoleSection({
  title,
  description,
  roles,
  onDelete,
  isDeleting,
  showCreate = false,
}: {
  title: string;
  description: string;
  roles: Role[];
  onDelete: (id: string) => void;
  isDeleting: boolean;
  showCreate?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="text-sm text-text-muted">{description}</p>
          </div>
          {showCreate && (
            <Button variant="primary" size="sm">
              Create Role
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {roles.length === 0 ? (
          <div className="text-center py-4 text-text-secondary">
            No roles defined
          </div>
        ) : (
          <div className="space-y-4">
            {roles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                onDelete={() => onDelete(role.id)}
                isDeleting={isDeleting}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RoleCard({
  role,
  onDelete,
  isDeleting,
}: {
  role: Role;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const levelColors = {
    system: "bg-error text-white",
    organization: "bg-primary text-white",
    region: "bg-info text-white",
  };

  return (
    <div className="p-4 bg-background-secondary rounded-lg">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{role.name}</h3>
            <Badge className={levelColors[role.level]}>{role.level}</Badge>
            {role.is_system_role && <Badge variant="outline">System</Badge>}
          </div>
          {role.description && (
            <p className="text-sm text-text-secondary mt-1">
              {role.description}
            </p>
          )}
          {role.user_count !== undefined && (
            <p className="text-sm text-text-muted mt-1">
              {role.user_count} user{role.user_count !== 1 ? "s" : ""} assigned
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Hide" : "View"} Permissions
          </Button>
          {!role.is_system_role && (
            <>
              <Button variant="outline" size="sm">
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                disabled={isDeleting}
                className="text-error hover:text-error"
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border">
          <h4 className="text-sm font-medium mb-2">Permissions</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {role.permissions.map((perm, i) => (
              <PermissionBadge key={i} permission={perm} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PermissionBadge({ permission }: { permission: Permission }) {
  const scopeColors = {
    own: "border-warning/50 bg-warning/10",
    team: "border-info/50 bg-info/10",
    region: "border-primary/50 bg-primary/10",
    all: "border-success/50 bg-success/10",
  };

  return (
    <div
      className={cn(
        "p-2 rounded border text-sm",
        scopeColors[permission.scope],
      )}
    >
      <div className="font-medium">{permission.resource}</div>
      <div className="flex flex-wrap gap-1 mt-1">
        {permission.actions.map((action) => (
          <span
            key={action}
            className="px-1.5 py-0.5 bg-background rounded text-xs"
          >
            {action}
          </span>
        ))}
      </div>
      <span className="text-xs text-text-muted">Scope: {permission.scope}</span>
    </div>
  );
}

function AssignmentsTab() {
  const { data: assignments, isLoading } = useUserRoleAssignments();

  // Group by user
  const userGroups = assignments?.reduce(
    (acc, a) => {
      const key = a.user_id;
      if (!acc[key]) {
        acc[key] = {
          user_id: a.user_id,
          user_name: a.user_name || "Unknown",
          user_email: a.user_email || "",
          assignments: [],
        };
      }
      acc[key].assignments.push(a);
      return acc;
    },
    {} as Record<
      string,
      {
        user_id: string;
        user_name: string;
        user_email: string;
        assignments: UserRoleAssignment[];
      }
    >,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-text-secondary">
          {assignments?.length || 0} total role assignments
        </p>
        <Button variant="primary">Assign Role</Button>
      </div>

      {isLoading ? (
        <div className="h-60 bg-background-secondary animate-pulse rounded" />
      ) : !userGroups || Object.keys(userGroups).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-text-secondary">
            No role assignments found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.values(userGroups).map((group) => (
            <Card key={group.user_id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{group.user_name}</h3>
                    <p className="text-sm text-text-muted">
                      {group.user_email}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Add Role
                  </Button>
                </div>

                <div className="mt-4 space-y-2">
                  {group.assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-2 bg-background-secondary rounded"
                    >
                      <div className="flex items-center gap-2">
                        <Badge>{assignment.role_name}</Badge>
                        {assignment.region_name ? (
                          <span className="text-sm text-text-muted">
                            Region: {assignment.region_name}
                          </span>
                        ) : (
                          <span className="text-sm text-success">
                            All Regions
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {assignment.expires_at && (
                          <span className="text-xs text-text-muted">
                            Expires: {formatDate(assignment.expires_at)}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-error hover:text-error"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditLogTab() {
  const [filters, setFilters] = useState<{
    action?: string;
    resource_type?: string;
  }>({});

  const { data: auditData, isLoading } = useAuditLogs(filters);

  const actionColors: Record<string, string> = {
    create: "bg-success text-white",
    update: "bg-info text-white",
    delete: "bg-error text-white",
    export: "bg-warning text-white",
    approve: "bg-primary text-white",
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={filters.action || ""}
          onChange={(e) =>
            setFilters({ ...filters, action: e.target.value || undefined })
          }
          className="px-3 py-2 rounded-md border border-border bg-background"
        >
          <option value="">All Actions</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="export">Export</option>
          <option value="approve">Approve</option>
        </select>
        <select
          value={filters.resource_type || ""}
          onChange={(e) =>
            setFilters({
              ...filters,
              resource_type: e.target.value || undefined,
            })
          }
          className="px-3 py-2 rounded-md border border-border bg-background"
        >
          <option value="">All Resources</option>
          <option value="customer">Customer</option>
          <option value="work_order">Work Order</option>
          <option value="invoice">Invoice</option>
          <option value="technician">Technician</option>
          <option value="role">Role</option>
          <option value="user">User</option>
        </select>
        <Button variant="outline">Export Logs</Button>
      </div>

      {/* Log Table */}
      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="h-60 bg-background-secondary animate-pulse rounded" />
          ) : !auditData?.logs.length ? (
            <div className="text-center py-8 text-text-secondary">
              No audit logs found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-medium">
                        Timestamp
                      </th>
                      <th className="text-left py-3 px-2 font-medium">User</th>
                      <th className="text-left py-3 px-2 font-medium">
                        Action
                      </th>
                      <th className="text-left py-3 px-2 font-medium">
                        Resource
                      </th>
                      <th className="text-left py-3 px-2 font-medium">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditData.logs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-border hover:bg-background-secondary/50"
                      >
                        <td className="py-3 px-2 text-text-muted">
                          {formatDate(log.timestamp)}
                        </td>
                        <td className="py-3 px-2">
                          <div>
                            <span className="font-medium">
                              {log.user_name || "Unknown"}
                            </span>
                            {log.user_email && (
                              <p className="text-xs text-text-muted">
                                {log.user_email}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <Badge
                            className={
                              actionColors[log.action] ||
                              "bg-text-muted text-white"
                            }
                          >
                            {log.action}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <span className="font-medium">
                            {log.resource_type}
                          </span>
                          <p className="text-xs text-text-muted truncate max-w-32">
                            {log.resource_id}
                          </p>
                        </td>
                        <td className="py-3 px-2">
                          {log.changes ? (
                            <Button variant="ghost" size="sm">
                              View Changes
                            </Button>
                          ) : (
                            <span className="text-text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination info */}
              <div className="mt-4 flex items-center justify-between text-sm text-text-muted">
                <span>
                  Showing {auditData.logs.length} of {auditData.total} entries
                </span>
                <span>
                  Page {auditData.page} of{" "}
                  {Math.ceil(auditData.total / auditData.page_size)}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
