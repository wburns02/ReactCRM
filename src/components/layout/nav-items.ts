export interface NavItem {
  path: string;
  label: string;
  icon: string;
  badge?: string;
}

export interface NavGroup {
  name: string;
  label: string;
  icon: string;
  badge?: string;
  items: NavItem[];
}

export const topNavItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/my-portal', label: 'My Portal', icon: '👤' },
  { path: '/customers', label: 'Customers', icon: '👥' },
  { path: '/prospects', label: 'Prospects', icon: '📋' },
];

export const navGroups: NavGroup[] = [
  {
    name: 'operations',
    label: 'Operations',
    icon: '📝',
    items: [
      { path: '/work-orders', label: 'Work Orders', icon: '🔧' },
      { path: '/schedule', label: 'Schedule', icon: '📅' },
      { path: '/technicians', label: 'Technicians', icon: '👷' },
    ],
  },
  {
    name: 'communications',
    label: 'Communications',
    icon: '📞',
    items: [
      // Phone features will be added here when implemented
      { path: '/integrations', label: 'Integrations', icon: '🔌' },
    ],
  },
  {
    name: 'financial',
    label: 'Financial',
    icon: '💰',
    items: [
      { path: '/quotes', label: 'Quotes', icon: '📝' },
      { path: '/invoices', label: 'Invoices', icon: '🧾' },
      { path: '/payments', label: 'Payments', icon: '💳' },
      { path: '/payroll', label: 'Payroll', icon: '💵' },
    ],
  },
  {
    name: 'assets',
    label: 'Assets',
    icon: '📦',
    items: [
      { path: '/inventory', label: 'Inventory', icon: '📦' },
      { path: '/equipment', label: 'Equipment', icon: '🛠️' },
      { path: '/fleet', label: 'Fleet Map', icon: '🚛' },
    ],
  },
  {
    name: 'marketing',
    label: 'Marketing',
    icon: '📧',
    badge: 'AI',
    items: [
      { path: '/marketing', label: 'Marketing Hub', icon: '📊' },
      { path: '/email-marketing', label: 'Email Marketing', icon: '📧' },
      { path: '/marketing/sms', label: 'SMS Consent', icon: '📱' },
      { path: '/reports', label: 'Reports', icon: '📈' },
    ],
  },
  {
    name: 'support',
    label: 'Support',
    icon: '🎫',
    items: [
      { path: '/tickets', label: 'Tickets', icon: '🎫' },
    ],
  },
  {
    name: 'system',
    label: 'System',
    icon: '⚙️',
    items: [
      { path: '/users', label: 'Users', icon: '👤' },
      { path: '/admin', label: 'Settings', icon: '⚙️' },
      { path: '/admin/pricing', label: 'Pricing', icon: '💲' },
    ],
  },
];
