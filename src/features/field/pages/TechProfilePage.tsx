import { useState } from 'react';
import { useAuth } from '@/features/auth/useAuth.ts';

/**
 * Technician profile and settings page
 */
export function TechProfilePage() {
  const { user, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Listen for online/offline status
  window.addEventListener('online', () => setIsOnline(true));
  window.addEventListener('offline', () => setIsOnline(false));

  return (
    <div className="p-4 pb-20">
      <h1 className="text-xl font-semibold text-text-primary mb-4">Profile</h1>

      {/* Profile Card */}
      <div className="bg-bg-card border border-border rounded-lg p-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-mac-dark-blue text-white flex items-center justify-center text-2xl font-semibold">
            {user?.first_name?.charAt(0) || '?'}
          </div>
          <div>
            <h2 className="text-lg font-medium text-text-primary">
              {user?.first_name} {user?.last_name}
            </h2>
            <p className="text-sm text-text-muted">{user?.email}</p>
            <p className="text-sm text-text-secondary mt-1">Field Technician</p>
          </div>
        </div>
      </div>

      {/* Sync Status */}
      <div className="bg-bg-card border border-border rounded-lg p-4 mb-4">
        <h2 className="font-medium text-text-primary mb-3">Sync Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Connection</span>
            <span className={`flex items-center gap-2 text-sm ${isOnline ? 'text-success' : 'text-danger'}`}>
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-success' : 'bg-danger'}`}></span>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Last Sync</span>
            <span className="text-sm text-text-muted">Just now</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Pending Changes</span>
            <span className="text-sm text-text-muted">0</span>
          </div>
        </div>
        <button className="w-full mt-4 py-2 bg-bg-hover text-text-primary rounded-lg text-sm font-medium">
          Sync Now
        </button>
      </div>

      {/* Settings */}
      <div className="bg-bg-card border border-border rounded-lg p-4 mb-4">
        <h2 className="font-medium text-text-primary mb-3">Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-primary">Location Tracking</p>
              <p className="text-xs text-text-muted">Share location while on route</p>
            </div>
            <button className="w-12 h-6 bg-primary rounded-full relative">
              <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></span>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-primary">Push Notifications</p>
              <p className="text-xs text-text-muted">Receive job updates</p>
            </div>
            <button className="w-12 h-6 bg-primary rounded-full relative">
              <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></span>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-primary">Offline Mode</p>
              <p className="text-xs text-text-muted">Work without internet</p>
            </div>
            <button className="w-12 h-6 bg-border rounded-full relative">
              <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></span>
            </button>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="bg-bg-card border border-border rounded-lg p-4 mb-4">
        <h2 className="font-medium text-text-primary mb-3">App Info</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Version</span>
            <span className="text-sm text-text-muted">1.0.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-secondary">Storage Used</span>
            <span className="text-sm text-text-muted">12.3 MB</span>
          </div>
        </div>
        <button className="w-full mt-4 py-2 text-danger text-sm font-medium">
          Clear Cache
        </button>
      </div>

      {/* Sign Out */}
      <button
        onClick={logout}
        className="w-full py-3 bg-danger text-white rounded-lg font-medium"
      >
        Sign Out
      </button>
    </div>
  );
}
