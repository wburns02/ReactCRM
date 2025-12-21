import { Badge } from '@/components/ui/Badge.tsx';
import { Button } from '@/components/ui/Button.tsx';
import type { User } from '@/api/types/admin.ts';
import { formatDate } from '@/lib/utils.ts';

interface UsersListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDeactivate: (user: User) => void;
}

const roleColors: Record<string, 'primary' | 'success' | 'warning' | 'secondary'> = {
  admin: 'primary',
  manager: 'success',
  technician: 'warning',
  office: 'secondary',
};

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  technician: 'Technician',
  office: 'Office',
};

export function UsersList({ users, onEdit, onDeactivate }: UsersListProps) {
  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <p>No users found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-bg-hover border-b border-border">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-text-primary">
              Name
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-text-primary">
              Email
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-text-primary">
              Role
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-text-primary">
              Status
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-text-primary">
              Last Login
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-text-primary">
              Created
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-text-primary">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((user) => (
            <tr
              key={user.id}
              className="hover:bg-bg-hover transition-colors"
            >
              <td className="px-4 py-3 text-sm">
                <div className="font-medium text-text-primary">
                  {user.first_name} {user.last_name}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary">
                {user.email}
              </td>
              <td className="px-4 py-3 text-sm">
                <Badge variant={roleColors[user.role]}>
                  {roleLabels[user.role]}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm">
                <Badge variant={user.is_active ? 'success' : 'secondary'}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary">
                {user.last_login ? formatDate(user.last_login) : 'Never'}
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary">
                {formatDate(user.created_at)}
              </td>
              <td className="px-4 py-3 text-sm text-right space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(user)}
                >
                  Edit
                </Button>
                {user.is_active && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDeactivate(user)}
                    className="text-danger hover:text-danger"
                  >
                    Deactivate
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
