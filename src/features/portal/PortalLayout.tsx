import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

/**
 * Layout for the customer self-service portal.
 * Simplified navigation compared to the main app.
 */
export function PortalLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_customer');
    navigate('/portal/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/portal" className="flex items-center space-x-2">
              <span className="text-2xl">🚽</span>
              <span className="font-bold text-lg text-text-primary">MAC Septic - Customer Portal</span>
            </Link>

            <nav className="hidden md:flex items-center space-x-6">
              <Link
                to="/portal"
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/portal/work-orders"
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                Work Orders
              </Link>
              <Link
                to="/portal/invoices"
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                Invoices
              </Link>
              <Link
                to="/portal/request-service"
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                Request Service
              </Link>
              <Link
                to="/portal/profile"
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                Profile
              </Link>
            </nav>

            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-2 flex justify-around">
          <Link to="/portal" className="text-xs text-text-secondary">Dashboard</Link>
          <Link to="/portal/work-orders" className="text-xs text-text-secondary">Work Orders</Link>
          <Link to="/portal/invoices" className="text-xs text-text-secondary">Invoices</Link>
          <Link to="/portal/request-service" className="text-xs text-text-secondary">Request</Link>
          <Link to="/portal/profile" className="text-xs text-text-secondary">Profile</Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-surface border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-text-muted text-sm">
            MAC Septic Services - Customer Portal | Need help? Call (512) 555-0123
          </p>
        </div>
      </footer>
    </div>
  );
}
