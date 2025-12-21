import { Label } from '@/components/ui/Label.tsx';
import { Select } from '@/components/ui/Select.tsx';

interface RoleSelectorProps {
  value: 'admin' | 'manager' | 'technician' | 'office';
  onChange: (role: 'admin' | 'manager' | 'technician' | 'office') => void;
  disabled?: boolean;
}

const roleDescriptions: Record<string, string> = {
  admin: 'Full system access - manage all settings, users, and data',
  manager: 'View all data, manage team and schedules, no system settings',
  technician: 'Access own work orders and schedules only',
  office: 'Manage customers, prospects, scheduling - no admin access',
};

export function RoleSelector({ value, onChange, disabled }: RoleSelectorProps) {
  return (
    <div>
      <Label htmlFor="role">Role</Label>
      <Select
        id="role"
        value={value}
        onChange={(e) =>
          onChange(e.target.value as 'admin' | 'manager' | 'technician' | 'office')
        }
        disabled={disabled}
      >
        <option value="admin">Admin</option>
        <option value="manager">Manager</option>
        <option value="technician">Technician</option>
        <option value="office">Office</option>
      </Select>
      <p className="text-xs text-text-muted mt-1">{roleDescriptions[value]}</p>
    </div>
  );
}
