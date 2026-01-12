import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";

interface Permission {
  name: string;
  admin: boolean;
  manager: boolean;
  technician: boolean;
  office: boolean;
}

const permissions: Permission[] = [
  {
    name: "View Dashboard",
    admin: true,
    manager: true,
    technician: true,
    office: true,
  },
  {
    name: "Manage Prospects",
    admin: true,
    manager: true,
    technician: false,
    office: true,
  },
  {
    name: "Manage Customers",
    admin: true,
    manager: true,
    technician: false,
    office: true,
  },
  {
    name: "Create Work Orders",
    admin: true,
    manager: true,
    technician: false,
    office: true,
  },
  {
    name: "View All Work Orders",
    admin: true,
    manager: true,
    technician: false,
    office: true,
  },
  {
    name: "View Own Work Orders",
    admin: true,
    manager: true,
    technician: true,
    office: false,
  },
  {
    name: "Manage Schedules",
    admin: true,
    manager: true,
    technician: false,
    office: true,
  },
  {
    name: "Manage Technicians",
    admin: true,
    manager: true,
    technician: false,
    office: false,
  },
  {
    name: "Email Marketing",
    admin: true,
    manager: true,
    technician: false,
    office: true,
  },
  {
    name: "View Reports",
    admin: true,
    manager: true,
    technician: false,
    office: false,
  },
  {
    name: "Manage Users",
    admin: true,
    manager: false,
    technician: false,
    office: false,
  },
  {
    name: "System Settings",
    admin: true,
    manager: false,
    technician: false,
    office: false,
  },
];

export function PermissionsMatrix() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Permissions</CardTitle>
        <p className="text-sm text-text-secondary mt-1">
          Overview of permissions for each role
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bg-hover border-b border-border">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-text-primary">
                  Permission
                </th>
                <th className="px-4 py-2 text-center text-sm font-medium text-text-primary">
                  Admin
                </th>
                <th className="px-4 py-2 text-center text-sm font-medium text-text-primary">
                  Manager
                </th>
                <th className="px-4 py-2 text-center text-sm font-medium text-text-primary">
                  Technician
                </th>
                <th className="px-4 py-2 text-center text-sm font-medium text-text-primary">
                  Office
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {permissions.map((permission) => (
                <tr key={permission.name} className="hover:bg-bg-hover">
                  <td className="px-4 py-2 text-sm text-text-primary">
                    {permission.name}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {permission.admin ? (
                      <span className="text-success">✓</span>
                    ) : (
                      <span className="text-text-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {permission.manager ? (
                      <span className="text-success">✓</span>
                    ) : (
                      <span className="text-text-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {permission.technician ? (
                      <span className="text-success">✓</span>
                    ) : (
                      <span className="text-text-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {permission.office ? (
                      <span className="text-success">✓</span>
                    ) : (
                      <span className="text-text-muted">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
