import { useState, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Badge } from '@/components/ui/Badge.tsx';

interface CustomerConsent {
  id: string;
  name: string;
  phone: string;
  email: string;
  smsOptedIn: boolean;
  consentDate: string | null;
  lastUpdated: string;
}

// Mock customer data
const MOCK_CUSTOMERS: CustomerConsent[] = [
  { id: '1', name: 'John Smith', phone: '(512) 555-0101', email: 'john.smith@email.com', smsOptedIn: true, consentDate: '2024-01-15', lastUpdated: '2024-01-15' },
  { id: '2', name: 'Sarah Johnson', phone: '(512) 555-0102', email: 'sarah.j@email.com', smsOptedIn: true, consentDate: '2024-02-20', lastUpdated: '2024-02-20' },
  { id: '3', name: 'Mike Williams', phone: '(512) 555-0103', email: 'mike.w@email.com', smsOptedIn: false, consentDate: null, lastUpdated: '2024-03-01' },
  { id: '4', name: 'Emily Davis', phone: '(512) 555-0104', email: 'emily.d@email.com', smsOptedIn: true, consentDate: '2024-01-10', lastUpdated: '2024-01-10' },
  { id: '5', name: 'David Brown', phone: '(512) 555-0105', email: 'david.b@email.com', smsOptedIn: false, consentDate: null, lastUpdated: '2024-02-28' },
  { id: '6', name: 'Lisa Anderson', phone: '(512) 555-0106', email: 'lisa.a@email.com', smsOptedIn: true, consentDate: '2024-03-05', lastUpdated: '2024-03-05' },
  { id: '7', name: 'James Wilson', phone: '(512) 555-0107', email: 'james.w@email.com', smsOptedIn: true, consentDate: '2024-02-15', lastUpdated: '2024-02-15' },
  { id: '8', name: 'Jennifer Taylor', phone: '(512) 555-0108', email: 'jennifer.t@email.com', smsOptedIn: false, consentDate: null, lastUpdated: '2024-01-20' },
  { id: '9', name: 'Robert Martinez', phone: '(512) 555-0109', email: 'robert.m@email.com', smsOptedIn: true, consentDate: '2024-03-10', lastUpdated: '2024-03-10' },
  { id: '10', name: 'Michelle Garcia', phone: '(512) 555-0110', email: 'michelle.g@email.com', smsOptedIn: true, consentDate: '2024-02-01', lastUpdated: '2024-02-01' },
];

export function SmsConsentPage() {
  const [customers, setCustomers] = useState<CustomerConsent[]>(MOCK_CUSTOMERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTogglingId, setIsTogglingId] = useState<string | null>(null);

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        c.email.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = customers.length;
    const optedIn = customers.filter((c) => c.smsOptedIn).length;
    const optedOut = total - optedIn;
    const rate = total > 0 ? ((optedIn / total) * 100).toFixed(1) : '0';
    return { total, optedIn, optedOut, rate };
  }, [customers]);

  const handleToggleConsent = useCallback(async (customerId: string) => {
    setIsTogglingId(customerId);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? {
              ...c,
              smsOptedIn: !c.smsOptedIn,
              consentDate: !c.smsOptedIn ? new Date().toISOString().split('T')[0] : null,
              lastUpdated: new Date().toISOString().split('T')[0],
            }
          : c
      )
    );
    setIsTogglingId(null);
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">SMS Consent Management</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage customer SMS opt-in preferences (TCPA compliant)
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Total Customers</div>
            <div className="text-2xl font-bold text-text-primary">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Opted In</div>
            <div className="text-2xl font-bold text-success">{stats.optedIn}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Opted Out</div>
            <div className="text-2xl font-bold text-text-primary">{stats.optedOut}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-text-secondary">Opt-in Rate</div>
            <div className="text-2xl font-bold text-primary">{stats.rate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <Input
                type="text"
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {searchQuery && (
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Customer SMS Preferences ({filteredCustomers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-bg-subtle border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Customer</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Phone</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Email</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-text-secondary">SMS Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-text-secondary">Consent Date</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-bg-hover">
                  <td className="px-4 py-3 font-medium text-text-primary">{customer.name}</td>
                  <td className="px-4 py-3 text-text-secondary">{customer.phone}</td>
                  <td className="px-4 py-3 text-text-secondary">{customer.email}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={customer.smsOptedIn ? 'success' : 'default'}>
                      {customer.smsOptedIn ? 'Opted In' : 'Opted Out'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {customer.consentDate || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      variant={customer.smsOptedIn ? 'danger' : 'secondary'}
                      size="sm"
                      onClick={() => handleToggleConsent(customer.id)}
                      disabled={isTogglingId === customer.id}
                    >
                      {isTogglingId === customer.id
                        ? 'Updating...'
                        : customer.smsOptedIn
                        ? 'Opt Out'
                        : 'Opt In'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCustomers.length === 0 && (
            <div className="p-8 text-center text-text-secondary">
              No customers found matching your search.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance Notice */}
      <div className="mt-6 p-4 bg-info/10 border border-info rounded-lg">
        <p className="text-sm text-info">
          <strong>TCPA Compliance:</strong> All SMS consent changes are logged and timestamped.
          Customers must explicitly opt-in before receiving marketing SMS messages.
        </p>
      </div>
    </div>
  );
}
