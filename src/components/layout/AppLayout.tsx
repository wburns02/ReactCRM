import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth.ts';
import { RCStatusIndicator } from '@/features/phone/index.ts';

/**
 * Navigation item type
 */
interface NavItem {
  path: string;
  label: string;
  icon: string;
  badge?: string;
}

/**
 * Navigation group with collapsible items
 */
interface NavGroup {
  name: string;
  label: string;
  icon: string;
  badge?: string;
  items: NavItem[];
}

/**
 * Main app layout with collapsible sidebar navigation
 * Matches legacy sidebar structure
 */
export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    // Auto-expand group containing current page
    const saved = localStorage.getItem('sidebarExpandedGroups');
    return saved ? new Set(JSON.parse(saved)) : new Set(['operations']);
  });

  // Top-level navigation items (always visible)
  const topNavItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/customers', label: 'Customers', icon: '👥' },
    { path: '/prospects', label: 'Prospects', icon: '📋' },
  ];

  // Collapsible navigation groups - matching legacy structure
  const navGroups: NavGroup[] = [
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
        { path: '/invoices', label: 'Invoices', icon: '🧾' },
        { path: '/payments', label: 'Payments', icon: '💳' },
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
        { path: '/email-marketing', label: 'Email Marketing', icon: '📧' },
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
      ],
    },
  ];

  // Check if path is active (includes sub-paths)
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  // Toggle group expansion
  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      localStorage.setItem('sidebarExpandedGroups', JSON.stringify([...next]));
      return next;
    });
  };

  // Check if any item in group is active
  const isGroupActive = (group: NavGroup) => group.items.some((item) => isActive(item.path));

  return (
    <div className="flex h-screen bg-bg-body">
      {/* Sidebar */}
      <aside className="w-64 bg-bg-sidebar border-r border-border flex flex-col overflow-hidden">
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-border flex-shrink-0">
          <Link to="/dashboard" className="flex items-center gap-2 text-mac-dark-blue font-semibold">
            <span className="text-xl">🚽</span>
            <span>MAC Septic CRM</span>
          </Link>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto p-4">
          {/* Top-level items */}
          <ul className="space-y-1 mb-4">
            {topNavItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary-light text-primary'
                      : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Collapsible Groups */}
          <div className="space-y-2">
            {navGroups.map((group) => (
              <div key={group.name} className="border-t border-border/50 pt-2">
                <button
                  onClick={() => toggleGroup(group.name)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isGroupActive(group)
                      ? 'text-primary'
                      : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                  }`}
                >
                  <span>{group.icon}</span>
                  <span className="flex-1 text-left">{group.label}</span>
                  {group.badge && (
                    <span className="px-1.5 py-0.5 text-xs bg-success/20 text-success rounded">
                      {group.badge}
                    </span>
                  )}
                  <span
                    className={`transition-transform ${expandedGroups.has(group.name) ? 'rotate-180' : ''}`}
                  >
                    ▼
                  </span>
                </button>

                {/* Group Items */}
                {expandedGroups.has(group.name) && (
                  <ul className="mt-1 ml-4 space-y-1">
                    {group.items.map((item) => (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                            isActive(item.path)
                              ? 'bg-primary-light text-primary font-medium'
                              : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                          }`}
                        >
                          <span className="text-xs">{item.icon}</span>
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-mac-dark-blue text-white flex items-center justify-center text-sm font-semibold">
              {user?.first_name?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-text-muted truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-3 w-full text-sm text-text-secondary hover:text-danger transition-colors text-left"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto flex flex-col">
        {/* Top bar with RingCentral status */}
        <div className="h-12 border-b border-border bg-bg-card px-6 flex items-center justify-end">
          <RCStatusIndicator />
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
