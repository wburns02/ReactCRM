/**
 * sidebarConfig.ts - Complete Sidebar Navigation Configuration
 *
 * Generated: 2026-01-09
 * Purpose: Reference implementation for all sidebar configurations
 * Status: Implementation Guide
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface NavItem {
  path: string;
  label: string;
  icon: string;
  badge?: string;
  requiredRoles?: string[];
}

export interface NavGroup {
  name: string;
  label: string;
  icon: string;
  badge?: string;
  items: NavItem[];
  requiredRoles?: string[];
  defaultExpanded?: boolean;
}

export type UserRole = 'admin' | 'executive' | 'manager' | 'technician' | 'phone_agent' | 'dispatcher' | 'billing';

// ============================================================================
// MAIN SIDEBAR CONFIGURATION - Admin/Manager/Executive
// ============================================================================

export const mainSidebarConfig = {
  topNavItems: [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/customers', label: 'Customers', icon: '👥' },
    { path: '/prospects', label: 'Prospects', icon: '📋' },
    { path: '/customer-success', label: 'Customer Success', icon: '💚' },
  ],

  navGroups: [
    // GROUP 1: OPERATIONS
    {
      name: 'operations',
      label: 'Operations',
      icon: '📝',
      defaultExpanded: true,
      items: [
        { path: '/command-center', label: 'Command Center', icon: '🎯' },
        { path: '/work-orders', label: 'Work Orders', icon: '🔧' },
        { path: '/tracking', label: 'Tracking', icon: '🗺️', badge: 'LIVE', requiredRoles: ['admin', 'manager', 'dispatcher'] },
        { path: '/schedule', label: 'Schedule', icon: '📅' },
        { path: '/technicians', label: 'Technicians', icon: '👷' },
        { path: '/employee', label: 'Employee Portal', icon: '📱' },
        { path: '/service-intervals', label: 'Service Intervals', icon: '🔄' },
        { path: '/compliance', label: 'Compliance', icon: '✅' },
        { path: '/contracts', label: 'Contracts', icon: '📄' },
        { path: '/timesheets', label: 'Timesheets', icon: '⏱️' },
      ],
    },

    // GROUP 2: COMMUNICATIONS (EXPANDED)
    {
      name: 'communications',
      label: 'Communications',
      icon: '📞',
      items: [
        { path: '/communications', label: 'Inbox & Messages', icon: '💬' },
        { path: '/communications/sms', label: 'SMS Inbox', icon: '📱' },
        { path: '/communications/email-inbox', label: 'Email Inbox', icon: '📧' },
        { path: '/calls', label: 'Call Center', icon: '📞' },
        { path: '/phone', label: 'Phone Dashboard', icon: '☎️' },
        { path: '/communications/templates', label: 'Message Templates', icon: '📝' },
        { path: '/communications/reminders', label: 'Auto-Reminders', icon: '🔔' },
        { path: '/integrations', label: 'Integrations', icon: '🔌' },
      ],
    },

    // GROUP 3: FINANCIAL (EXPANDED)
    {
      name: 'financial',
      label: 'Financial',
      icon: '💰',
      items: [
        { path: '/invoices', label: 'Invoices', icon: '🧾' },
        { path: '/payments', label: 'Payments', icon: '💳' },
        { path: '/estimates', label: 'Estimates', icon: '📊' },
        { path: '/billing/payment-plans', label: 'Payment Plans', icon: '📈' },
        { path: '/payroll', label: 'Payroll', icon: '💵', requiredRoles: ['admin', 'manager'] },
        { path: '/job-costing', label: 'Job Costing', icon: '💹' },
      ],
    },

    // GROUP 4: ASSETS
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

    // GROUP 5: MARKETING
    {
      name: 'marketing',
      label: 'Marketing',
      icon: '📧',
      badge: 'AI',
      items: [
        { path: '/marketing', label: 'Marketing Hub', icon: '📊' },
        { path: '/marketing/ads', label: 'Google Ads', icon: '📈' },
        { path: '/marketing/reviews', label: 'Reviews', icon: '⭐' },
        { path: '/marketing/ai-content', label: 'AI Content', icon: '🤖' },
        { path: '/email-marketing', label: 'Email Marketing', icon: '📧' },
        { path: '/reports', label: 'Reports', icon: '📈' },
      ],
    },

    // GROUP 6: AI & ANALYTICS
    {
      name: 'ai-analytics',
      label: 'AI & Analytics',
      icon: '🤖',
      badge: 'GPU',
      items: [
        { path: '/ai-assistant', label: 'AI Assistant', icon: '✨' },
        { path: '/analytics/bi', label: 'BI Dashboard', icon: '📊' },
        { path: '/analytics/ftfr', label: 'First-Time Fix Rate', icon: '✔️' },
        { path: '/predictive-maintenance', label: 'AI Predictions', icon: '🔮' },
      ],
    },

    // GROUP 7: SUPPORT
    {
      name: 'support',
      label: 'Support',
      icon: '🎫',
      items: [
        { path: '/tickets', label: 'Tickets', icon: '🎫' },
      ],
    },

    // GROUP 8: SYSTEM
    {
      name: 'system',
      label: 'System',
      icon: '⚙️',
      requiredRoles: ['admin', 'manager'],
      items: [
        { path: '/users', label: 'Users', icon: '👤' },
        { path: '/admin', label: 'Settings', icon: '⚙️' },
        { path: '/admin/import', label: 'Data Import', icon: '📥' },
      ],
    },
  ],
};

// ============================================================================
// TECHNICIAN SIDEBAR CONFIGURATION (Mobile/Field Service)
// ============================================================================

export const technicianSidebarConfig = {
  // Bottom navigation for mobile (4-5 items max)
  topNavItems: [
    { path: '/field', label: 'My Jobs', icon: '📋' },
    { path: '/field/route', label: 'Route', icon: '🗺️' },
    { path: '/field/stats', label: 'Stats', icon: '📊' },
    { path: '/field/profile', label: 'Profile', icon: '👤' },
  ],
  navGroups: [], // No collapsible groups for mobile
};

// ============================================================================
// DISPATCHER SIDEBAR CONFIGURATION
// ============================================================================

export const dispatcherSidebarConfig = {
  topNavItems: [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/customers', label: 'Customers', icon: '👥' },
  ],
  navGroups: [
    {
      name: 'operations',
      label: 'Operations',
      icon: '📝',
      defaultExpanded: true,
      items: [
        { path: '/command-center', label: 'Command Center', icon: '🎯' },
        { path: '/work-orders', label: 'Work Orders', icon: '🔧' },
        { path: '/tracking', label: 'Tracking', icon: '🗺️', badge: 'LIVE' },
        { path: '/schedule', label: 'Schedule', icon: '📅' },
        { path: '/technicians', label: 'Technicians', icon: '👷' },
      ],
    },
    {
      name: 'communications',
      label: 'Communications',
      icon: '📞',
      items: [
        { path: '/communications/sms', label: 'SMS Inbox', icon: '📱' },
        { path: '/calls', label: 'Call Center', icon: '📞' },
      ],
    },
  ],
};

// ============================================================================
// BILLING SPECIALIST SIDEBAR CONFIGURATION
// ============================================================================

export const billingSidebarConfig = {
  topNavItems: [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/customers', label: 'Customers', icon: '👥' },
  ],
  navGroups: [
    {
      name: 'financial',
      label: 'Financial',
      icon: '💰',
      defaultExpanded: true,
      items: [
        { path: '/invoices', label: 'Invoices', icon: '🧾' },
        { path: '/payments', label: 'Payments', icon: '💳' },
        { path: '/estimates', label: 'Estimates', icon: '📊' },
        { path: '/billing/payment-plans', label: 'Payment Plans', icon: '📈' },
        { path: '/job-costing', label: 'Job Costing', icon: '💹' },
      ],
    },
  ],
};

// ============================================================================
// CONFIGURATION ROUTER
// ============================================================================

export function getSidebarConfig(userRole: UserRole) {
  const configMap = {
    admin: mainSidebarConfig,
    executive: mainSidebarConfig,
    manager: mainSidebarConfig,
    technician: technicianSidebarConfig,
    phone_agent: mainSidebarConfig,
    dispatcher: dispatcherSidebarConfig,
    billing: billingSidebarConfig,
  };
  return configMap[userRole] || mainSidebarConfig;
}

export default mainSidebarConfig;
