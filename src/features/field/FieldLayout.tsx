import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth.ts';

/**
 * Mobile-first layout for field technicians
 * Features bottom navigation optimized for touch
 */
export function FieldLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/field', label: 'My Jobs', icon: '📋', exact: true },
    { path: '/field/route', label: 'Route', icon: '🗺️' },
    { path: '/field/stats', label: 'Stats', icon: '📊' },
    { path: '/field/profile', label: 'Profile', icon: '👤' },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col h-screen bg-bg-body">
      {/* Header - Simplified for mobile */}
      <header className="h-14 bg-bg-card border-b border-border flex items-center px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚽</span>
          <span className="font-semibold text-text-primary">MAC Septic</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-mac-dark-blue text-white flex items-center justify-center text-sm font-semibold">
            {user?.first_name?.charAt(0) || '?'}
          </div>
          <button
            onClick={logout}
            className="text-sm text-text-secondary hover:text-danger"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main content - Scrollable */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Bottom Navigation - Fixed */}
      <nav className="h-16 bg-bg-card border-t border-border flex items-center justify-around px-2 flex-shrink-0 safe-area-bottom">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
              isActive(item.path, item.exact)
                ? 'text-primary bg-primary-light'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
