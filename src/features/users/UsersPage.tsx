import { useState } from 'react';
import { Button } from '@/components/ui/Button.tsx';
import { Card } from '@/components/ui/Card.tsx';
import { ConfirmDialog } from '@/components/ui/Dialog.tsx';
import { UsersList } from './components/UsersList.tsx';
import { UserForm } from './components/UserForm.tsx';
import { PermissionsMatrix } from './components/PermissionsMatrix.tsx';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeactivateUser,
} from '@/api/hooks/useAdmin.ts';
import type { User, CreateUserInput, UpdateUserInput } from '@/api/types/admin.ts';
import { getErrorMessage } from '@/api/client.ts';

/**
 * Users Management Page
 * Manage system users and their roles
 */
export function UsersPage() {
  const { data: users = [], isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deactivateUser = useDeactivateUser();

  const [formOpen, setFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<User | null>(null);

  const handleCreate = () => {
    setSelectedUser(null);
    setFormOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: CreateUserInput | UpdateUserInput) => {
    try {
      if (selectedUser) {
        await updateUser.mutateAsync({ id: selectedUser.id, input: data });
      } else {
        await createUser.mutateAsync(data as CreateUserInput);
      }
      setFormOpen(false);
      setSelectedUser(null);
    } catch (error) {
      alert(`Error: ${getErrorMessage(error)}`);
    }
  };

  const handleDeactivateConfirm = async () => {
    if (!confirmDeactivate) return;
    try {
      await deactivateUser.mutateAsync(confirmDeactivate.id);
      setConfirmDeactivate(null);
    } catch (error) {
      alert(`Error: ${getErrorMessage(error)}`);
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">User Management</h1>
            <p className="text-text-secondary mt-1">
              Manage system users and their access levels
            </p>
          </div>
          <Button onClick={handleCreate}>
            <span className="mr-2">+</span>
            Add User
          </Button>
        </div>

        {/* Users List */}
        <Card className="mb-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
                <p className="mt-4 text-text-secondary">Loading users...</p>
              </div>
            </div>
          ) : (
            <UsersList
              users={users}
              onEdit={handleEdit}
              onDeactivate={(user) => setConfirmDeactivate(user)}
            />
          )}
        </Card>

        {/* Permissions Matrix */}
        <PermissionsMatrix />

        {/* User Form Dialog */}
        <UserForm
          user={selectedUser}
          open={formOpen}
          onClose={() => {
            setFormOpen(false);
            setSelectedUser(null);
          }}
          onSubmit={handleFormSubmit}
          isLoading={createUser.isPending || updateUser.isPending}
        />

        {/* Deactivate Confirmation */}
        <ConfirmDialog
          open={!!confirmDeactivate}
          onClose={() => setConfirmDeactivate(null)}
          onConfirm={handleDeactivateConfirm}
          title="Deactivate User"
          message={`Are you sure you want to deactivate ${confirmDeactivate?.first_name} ${confirmDeactivate?.last_name}? They will no longer be able to log in.`}
          confirmLabel="Deactivate"
          variant="danger"
          isLoading={deactivateUser.isPending}
        />
      </div>
    </div>
  );
}
