/**
 * Role Switcher Component
 *
 * Floating component that allows demo users to switch between different CRM roles.
 * Only visible to the demo user (will@macseptic.com).
 */

import { useState, useRef, useEffect } from 'react';
import { useRole, type RoleKey, type RoleView } from '@/providers';
import { cn } from '@/lib/utils';

// ============================================
// Role Color Map
// ============================================

const ROLE_COLORS: Record<string, { bg: string; text: string; hover: string; ring: string }> = {
  purple: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    hover: 'hover:bg-purple-200',
    ring: 'ring-purple-500',
  },
  blue: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    hover: 'hover:bg-blue-200',
    ring: 'ring-blue-500',
  },
  green: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    hover: 'hover:bg-green-200',
    ring: 'ring-green-500',
  },
  orange: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    hover: 'hover:bg-orange-200',
    ring: 'ring-orange-500',
  },
  cyan: {
    bg: 'bg-cyan-100',
    text: 'text-cyan-800',
    hover: 'hover:bg-cyan-200',
    ring: 'ring-cyan-500',
  },
  indigo: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-800',
    hover: 'hover:bg-indigo-200',
    ring: 'ring-indigo-500',
  },
  emerald: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    hover: 'hover:bg-emerald-200',
    ring: 'ring-emerald-500',
  },
};

const DEFAULT_COLOR = {
  bg: 'bg-gray-100',
  text: 'text-gray-800',
  hover: 'hover:bg-gray-200',
  ring: 'ring-gray-500',
};

// ============================================
// Role Option Component
// ============================================

interface RoleOptionProps {
  role: RoleView;
  isSelected: boolean;
  onClick: () => void;
}

function RoleOption({ role, isSelected, onClick }: RoleOptionProps) {
  const colors = ROLE_COLORS[role.color || ''] || DEFAULT_COLOR;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200',
        'text-left',
        colors.bg,
        colors.text,
        colors.hover,
        isSelected && `ring-2 ${colors.ring}`
      )}
    >
      <span className="text-xl flex-shrink-0">{role.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{role.display_name}</div>
        <div className="text-xs opacity-70 truncate">{role.description}</div>
      </div>
      {isSelected && (
        <svg
          className="w-5 h-5 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  );
}

// ============================================
// Main Component
// ============================================

export function RoleSwitcher() {
  const {
    isDemoUser,
    isLoading,
    currentRole,
    currentRoleKey,
    availableRoles,
    switchRole,
    isSwitching,
  } = useRole();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Don't render if not demo user or still loading
  if (!isDemoUser || isLoading) {
    return null;
  }

  const currentColors = currentRole?.color
    ? ROLE_COLORS[currentRole.color] || DEFAULT_COLOR
    : DEFAULT_COLOR;

  const handleRoleSelect = (roleKey: RoleKey) => {
    switchRole(roleKey);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="fixed top-4 right-4 z-50"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-full shadow-lg',
          'border border-white/20',
          'backdrop-blur-sm',
          'transition-all duration-200',
          currentColors.bg,
          currentColors.text,
          currentColors.hover,
          isSwitching && 'opacity-50 cursor-wait'
        )}
      >
        <span className="text-lg">{currentRole?.icon || '👤'}</span>
        <span className="font-medium">
          {isSwitching ? 'Switching...' : currentRole?.display_name || 'Select Role'}
        </span>
        <svg
          className={cn(
            'w-4 h-4 transition-transform',
            isOpen && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute top-full right-0 mt-2 w-80',
            'bg-white rounded-xl shadow-2xl',
            'border border-gray-200',
            'overflow-hidden',
            'animate-in fade-in slide-in-from-top-2 duration-200'
          )}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <div className="font-semibold">Demo Mode</div>
            <div className="text-sm opacity-90">
              Switch roles to explore different CRM views
            </div>
          </div>

          {/* Role List */}
          <div className="p-2 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="space-y-1">
              {availableRoles.map((role) => (
                <RoleOption
                  key={role.role_key}
                  role={role}
                  isSelected={role.role_key === currentRoleKey}
                  onClick={() => handleRoleSelect(role.role_key)}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              Role switching is for demonstration purposes only
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoleSwitcher;
