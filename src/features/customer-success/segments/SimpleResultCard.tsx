/**
 * Simple Result Card Component
 *
 * Friendly, approachable customer cards that show the most important info
 * at a glance. Designed for non-technical users.
 */

import { cn } from '@/lib/utils.ts';
import type { ActionType } from './ActionWizard.tsx';

export interface CustomerResult {
  id: number;
  name: string;
  email: string;
  company?: string;
  avatar?: string;
  healthScore: number;
  lastContact: string;
  matchReason: string;
  tags?: string[];
}

interface SimpleResultCardProps {
  customer: CustomerResult;
  isSelected: boolean;
  onToggleSelect: () => void;
  onQuickAction?: (action: ActionType) => void;
  className?: string;
}

function getHealthEmoji(score: number): string {
  if (score >= 80) return '😄';
  if (score >= 60) return '🙂';
  if (score >= 40) return '😐';
  if (score >= 20) return '😟';
  return '😰';
}

function getHealthColor(score: number): string {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-lime-500';
  if (score >= 40) return 'text-yellow-500';
  if (score >= 20) return 'text-orange-500';
  return 'text-red-500';
}

function getHealthBgColor(score: number): string {
  if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
  if (score >= 60) return 'bg-lime-100 dark:bg-lime-900/30';
  if (score >= 40) return 'bg-yellow-100 dark:bg-yellow-900/30';
  if (score >= 20) return 'bg-orange-100 dark:bg-orange-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
}

function getHealthLabel(score: number): string {
  if (score >= 80) return 'Very Happy';
  if (score >= 60) return 'Happy';
  if (score >= 40) return 'Okay';
  if (score >= 20) return 'Needs Attention';
  return 'At Risk';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500',
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}

export function SimpleResultCard({
  customer,
  isSelected,
  onToggleSelect,
  onQuickAction,
  className,
}: SimpleResultCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-xl border-2 p-5 transition-all cursor-pointer',
        'bg-white dark:bg-gray-800',
        isSelected
          ? 'border-primary ring-4 ring-primary/20 shadow-lg'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
        className
      )}
      onClick={onToggleSelect}
    >
      {/* Selection Checkbox */}
      <div className="absolute top-4 right-4">
        <div
          className={cn(
            'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
            isSelected
              ? 'bg-primary border-primary'
              : 'border-gray-300 dark:border-gray-600'
          )}
        >
          {isSelected && (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      {/* Customer Info */}
      <div className="flex items-start gap-4 mb-4">
        {/* Avatar */}
        {customer.avatar ? (
          <img
            src={customer.avatar}
            alt={customer.name}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700"
          />
        ) : (
          <div
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold',
              'ring-2 ring-gray-100 dark:ring-gray-700',
              getAvatarColor(customer.name)
            )}
          >
            {getInitials(customer.name)}
          </div>
        )}

        {/* Name & Company */}
        <div className="flex-1 min-w-0 pr-6">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{customer.name}</h3>
          {customer.company && (
            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{customer.company}</p>
          )}
          <p className="text-xs text-gray-400 truncate">{customer.email}</p>
        </div>
      </div>

      {/* Health Score - Big & Friendly */}
      <div
        className={cn(
          'rounded-lg p-3 mb-4',
          getHealthBgColor(customer.healthScore)
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getHealthEmoji(customer.healthScore)}</span>
            <div>
              <p className={cn('font-bold', getHealthColor(customer.healthScore))}>
                {getHealthLabel(customer.healthScore)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Happiness Score: {customer.healthScore}/100
              </p>
            </div>
          </div>
          <div
            className={cn(
              'text-2xl font-bold',
              getHealthColor(customer.healthScore)
            )}
          >
            {customer.healthScore}
          </div>
        </div>
      </div>

      {/* Match Reason - Why They're Here */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
        <p className="text-xs text-blue-600 dark:text-blue-300 font-medium mb-1">
          Why they match your search:
        </p>
        <p className="text-sm text-blue-800 dark:text-blue-200">{customer.matchReason}</p>
      </div>

      {/* Last Contact */}
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-500 dark:text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Last contact: {customer.lastContact}</span>
      </div>

      {/* Tags */}
      {customer.tags && customer.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {customer.tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                'px-2 py-0.5 text-xs rounded-full font-medium',
                tag.toLowerCase().includes('vip') || tag.toLowerCase().includes('enterprise')
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : tag.toLowerCase().includes('risk') || tag.toLowerCase().includes('critical')
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  : tag.toLowerCase().includes('champion')
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                  : tag.toLowerCase().includes('new')
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {onQuickAction && (
        <div
          className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onQuickAction('email')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors',
              'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200',
              'hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-300'
            )}
          >
            <span>📧</span> Email
          </button>
          <button
            onClick={() => onQuickAction('call')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors',
              'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200',
              'hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-300'
            )}
          >
            <span>📞</span> Call
          </button>
          <button
            onClick={() => onQuickAction('schedule')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors',
              'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200',
              'hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-300'
            )}
          >
            <span>📅</span> Book
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for lists
 */
interface CompactResultCardProps {
  customer: CustomerResult;
  isSelected: boolean;
  onToggleSelect: () => void;
  className?: string;
}

export function CompactResultCard({
  customer,
  isSelected,
  onToggleSelect,
  className,
}: CompactResultCardProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all',
        'bg-white dark:bg-gray-800',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300',
        className
      )}
      onClick={onToggleSelect}
    >
      {/* Checkbox */}
      <div
        className={cn(
          'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
          isSelected ? 'bg-primary border-primary' : 'border-gray-300'
        )}
      >
        {isSelected && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Avatar */}
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0',
          getAvatarColor(customer.name)
        )}
      >
        {getInitials(customer.name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white truncate">{customer.name}</p>
        <p className="text-sm text-gray-500 truncate">{customer.company || customer.email}</p>
      </div>

      {/* Health */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-lg">{getHealthEmoji(customer.healthScore)}</span>
        <span className={cn('font-bold', getHealthColor(customer.healthScore))}>
          {customer.healthScore}
        </span>
      </div>
    </div>
  );
}

export default SimpleResultCard;
