/**
 * Jargon Translator Component
 *
 * Helps users understand technical CRM terms in plain, simple language.
 * Displays tooltips that explain confusing terminology.
 */

import { useState } from 'react';
import { cn } from '@/lib/utils.ts';

interface JargonTerm {
  term: string;
  simple: string;
  emoji: string;
  example?: string;
}

const JARGON_TERMS: JargonTerm[] = [
  {
    term: 'Segment',
    simple: 'A group of customers',
    emoji: '👥',
    example: 'Like "All VIP customers" or "People who bought last month"',
  },
  {
    term: 'Cohort',
    simple: 'Customers who share something in common',
    emoji: '🤝',
    example: 'Like "People who signed up in January"',
  },
  {
    term: 'Filter',
    simple: 'Only show customers where...',
    emoji: '🔍',
    example: 'Like "Only show customers in Texas"',
  },
  {
    term: 'NPS',
    simple: 'How happy they are (0-10)',
    emoji: '😊',
    example: '9-10 = Love us! 7-8 = Like us. 0-6 = Not happy',
  },
  {
    term: 'Churn Risk',
    simple: 'Might stop using us',
    emoji: '⚠️',
    example: 'Customers showing signs they might leave',
  },
  {
    term: 'Health Score',
    simple: 'Overall happiness meter',
    emoji: '💚',
    example: 'Combines everything we know about how a customer is doing',
  },
  {
    term: 'Touchpoint',
    simple: 'Any time we talked to them',
    emoji: '💬',
    example: 'Calls, emails, meetings, support tickets',
  },
  {
    term: 'ARR',
    simple: 'How much they pay per year',
    emoji: '💰',
    example: 'Annual Recurring Revenue - their yearly subscription value',
  },
  {
    term: 'Playbook',
    simple: 'A step-by-step plan',
    emoji: '📋',
    example: 'Like "What to do when a customer is unhappy"',
  },
  {
    term: 'Journey',
    simple: "The path a customer takes",
    emoji: '🛤️',
    example: 'From first sign-up to becoming a happy regular customer',
  },
  {
    term: 'Engagement',
    simple: 'How much they use our stuff',
    emoji: '📊',
    example: 'Logging in, using features, reading our emails',
  },
  {
    term: 'Upsell',
    simple: 'Helping them get more value',
    emoji: '⬆️',
    example: 'When a customer upgrades to a better plan',
  },
];

interface JargonTranslatorProps {
  className?: string;
  variant?: 'inline' | 'card' | 'minimal';
}

export function JargonTranslator({ className, variant = 'card' }: JargonTranslatorProps) {
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTerms = JARGON_TERMS.filter(
    (term) =>
      term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      term.simple.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (variant === 'minimal') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {JARGON_TERMS.slice(0, 6).map((term) => (
          <JargonTooltip key={term.term} term={term} />
        ))}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn('inline-flex items-center gap-2', className)}>
        <span className="text-sm text-gray-500">Confused by a term?</span>
        <JargonTooltip term={JARGON_TERMS[0]} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
        'border border-amber-200 dark:border-amber-800 rounded-xl p-5',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">📚</span>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Confused by a term?</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Here's what all those fancy words actually mean
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search terms..."
          className={cn(
            'w-full px-4 py-2 rounded-lg text-sm',
            'bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700',
            'focus:outline-none focus:ring-2 focus:ring-amber-400',
            'placeholder:text-gray-400'
          )}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Terms Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {filteredTerms.map((term) => (
          <button
            key={term.term}
            onClick={() => setExpandedTerm(expandedTerm === term.term ? null : term.term)}
            className={cn(
              'p-3 rounded-lg text-left transition-all',
              'bg-white dark:bg-gray-800 border',
              expandedTerm === term.term
                ? 'border-amber-400 ring-2 ring-amber-400/30'
                : 'border-amber-100 dark:border-amber-800 hover:border-amber-300'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{term.emoji}</span>
              <span className="font-medium text-gray-900 dark:text-white text-sm">{term.term}</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300">{term.simple}</p>
            {expandedTerm === term.term && term.example && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 italic">
                {term.example}
              </p>
            )}
          </button>
        ))}
      </div>

      {filteredTerms.length === 0 && (
        <p className="text-center text-sm text-gray-500 py-4">
          No terms found. Try a different search!
        </p>
      )}
    </div>
  );
}

/**
 * Individual Jargon Tooltip
 * Can be used inline in text to explain a single term
 */
interface JargonTooltipProps {
  term: JargonTerm;
  className?: string;
}

export function JargonTooltip({ term, className }: JargonTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className={cn('relative inline-block', className)}>
      <button
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm',
          'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
          'hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors',
          'border border-amber-200 dark:border-amber-800'
        )}
      >
        <span>{term.emoji}</span>
        <span className="font-medium">{term.term}</span>
        <svg
          className="w-3 h-3 text-amber-600 dark:text-amber-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {/* Tooltip */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2',
            'bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 w-56',
            'border border-amber-200 dark:border-amber-700'
          )}
        >
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {term.term} = {term.simple}
          </p>
          {term.example && (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">{term.example}</p>
          )}
          {/* Arrow */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-white dark:bg-gray-800 border-r border-b border-amber-200 dark:border-amber-700" />
        </div>
      )}
    </span>
  );
}

/**
 * Helper function to wrap text with jargon tooltips
 * Use this to automatically add tooltips to text containing jargon terms
 */
export function withJargonTooltips(text: string): React.ReactNode {
  const words = text.split(' ');
  return words.map((word, index) => {
    const cleanWord = word.replace(/[.,!?]/g, '');
    const term = JARGON_TERMS.find(
      (t) => t.term.toLowerCase() === cleanWord.toLowerCase()
    );

    if (term) {
      const punctuation = word.replace(cleanWord, '');
      return (
        <span key={index}>
          <JargonTooltip term={term} />
          {punctuation}{' '}
        </span>
      );
    }

    return <span key={index}>{word} </span>;
  });
}

export default JargonTranslator;
