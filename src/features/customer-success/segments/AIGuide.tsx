/**
 * AI Guide Component - "12-year-old mode" for Segments
 *
 * A super friendly, conversational AI interface for finding customers.
 * Designed to be so simple anyone can use it - no jargon, just plain language.
 */

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils.ts';
import { SimpleResultCard, type CustomerResult } from './SimpleResultCard.tsx';
import { ActionWizard, type ActionType } from './ActionWizard.tsx';
import { JargonTranslator } from './JargonTranslator.tsx';
import { GuidedTour } from './GuidedTour.tsx';

// Mock data for demo - in production, this would come from the API
const MOCK_CUSTOMERS: CustomerResult[] = [
  {
    id: 1,
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    company: 'TechCorp Inc.',
    avatar: undefined,
    healthScore: 85,
    lastContact: '2 days ago',
    matchReason: 'Happy customer with high engagement',
    tags: ['VIP', 'Enterprise'],
  },
  {
    id: 2,
    name: 'Mike Chen',
    email: 'mike@startup.io',
    company: 'Startup.io',
    avatar: undefined,
    healthScore: 45,
    lastContact: '3 weeks ago',
    matchReason: "Haven't heard from them in a while",
    tags: ['SMB', 'At Risk'],
  },
  {
    id: 3,
    name: 'Emily Davis',
    email: 'emily@growthco.com',
    company: 'GrowthCo',
    avatar: undefined,
    healthScore: 92,
    lastContact: '1 day ago',
    matchReason: 'One of your best customers!',
    tags: ['Champion', 'Enterprise'],
  },
  {
    id: 4,
    name: 'James Wilson',
    email: 'james@newbiz.com',
    company: 'NewBiz LLC',
    avatar: undefined,
    healthScore: 72,
    lastContact: '5 days ago',
    matchReason: 'Service is due next month',
    tags: ['New', 'SMB'],
  },
  {
    id: 5,
    name: 'Lisa Thompson',
    email: 'lisa@enterprise.co',
    company: 'Enterprise Co',
    avatar: undefined,
    healthScore: 28,
    lastContact: '1 month ago',
    matchReason: 'Might be unhappy - low engagement',
    tags: ['Critical', 'Enterprise'],
  },
];

interface QuickQuestion {
  id: string;
  label: string;
  emoji: string;
  description: string;
  query: string;
}

const QUICK_QUESTIONS: QuickQuestion[] = [
  {
    id: 'attention',
    label: 'Who needs attention right now?',
    emoji: '🚨',
    description: 'Customers who might be struggling or at risk',
    query: 'needs attention',
  },
  {
    id: 'best',
    label: 'Who are our best customers?',
    emoji: '⭐',
    description: 'Your happiest, most engaged customers',
    query: 'best customers',
  },
  {
    id: 'silent',
    label: "Who haven't we talked to in a while?",
    emoji: '🤫',
    description: 'Customers who might feel forgotten',
    query: 'no contact',
  },
  {
    id: 'service',
    label: "Who's due for service?",
    emoji: '🔧',
    description: 'Customers with upcoming service needs',
    query: 'service due',
  },
  {
    id: 'unhappy',
    label: "Who's unhappy?",
    emoji: '😟',
    description: 'Customers showing signs of dissatisfaction',
    query: 'unhappy',
  },
  {
    id: 'new',
    label: "Who's new?",
    emoji: '👋',
    description: 'Recently joined customers to welcome',
    query: 'new customers',
  },
];

interface AIGuideProps {
  className?: string;
  onSegmentCreated?: (name: string, customerIds: number[]) => void;
}

type ViewState = 'search' | 'results' | 'action';

export function AIGuide({ className, onSegmentCreated }: AIGuideProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewState, setViewState] = useState<ViewState>('search');
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<number>>(new Set());
  const [currentAction, setCurrentAction] = useState<ActionType | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [hasSeenTour, setHasSeenTour] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ai-guide-tour-seen') === 'true';
    }
    return false;
  });

  // Simulate AI search
  const performSearch = useCallback(async (query: string) => {
    setIsSearching(true);
    setSearchQuery(query);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Filter mock data based on query (in production, this would be an AI/API call)
    let filtered = [...MOCK_CUSTOMERS];

    if (query.includes('attention') || query.includes('risk')) {
      filtered = filtered.filter((c) => c.healthScore < 50);
    } else if (query.includes('best') || query.includes('happy')) {
      filtered = filtered.filter((c) => c.healthScore >= 80);
    } else if (query.includes('no contact') || query.includes("haven't")) {
      filtered = filtered.filter((c) => c.lastContact.includes('week') || c.lastContact.includes('month'));
    } else if (query.includes('service') || query.includes('due')) {
      filtered = filtered.filter((c) => (c.tags && c.tags.includes('SMB')) || c.matchReason.includes('service'));
    } else if (query.includes('unhappy') || query.includes('dissatisfied')) {
      filtered = filtered.filter((c) => c.healthScore < 40);
    } else if (query.includes('new')) {
      filtered = filtered.filter((c) => c.tags && c.tags.includes('New'));
    }

    // If no specific filter, just return some results
    if (filtered.length === 0) {
      filtered = MOCK_CUSTOMERS.slice(0, 3);
    }

    setResults(filtered);
    setSelectedCustomers(new Set(filtered.map((c) => c.id)));
    setViewState('results');
    setIsSearching(false);
  }, []);

  const handleQuickQuestion = (question: QuickQuestion) => {
    performSearch(question.query);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  };

  const toggleCustomerSelection = (customerId: number) => {
    setSelectedCustomers((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedCustomers(new Set(results.map((c) => c.id)));
  };

  const deselectAll = () => {
    setSelectedCustomers(new Set());
  };

  const handleAction = (action: ActionType) => {
    setCurrentAction(action);
    setViewState('action');
  };

  const handleActionComplete = (data: Record<string, unknown>) => {
    console.log('Action completed:', currentAction, data);

    // If saving segment, notify parent
    if (currentAction === 'save' && onSegmentCreated) {
      onSegmentCreated(
        (data.segmentName as string) || 'My Segment',
        Array.from(selectedCustomers)
      );
    }

    // Reset to search
    setViewState('search');
    setCurrentAction(null);
    setResults([]);
    setSelectedCustomers(new Set());
    setSearchQuery('');
  };

  const handleBackToSearch = () => {
    setViewState('search');
    setResults([]);
    setSelectedCustomers(new Set());
    setSearchQuery('');
  };

  const handleBackToResults = () => {
    setViewState('results');
    setCurrentAction(null);
  };

  const handleNarrowDown = () => {
    setViewState('search');
  };

  const closeTour = () => {
    setShowTour(false);
    setHasSeenTour(true);
    localStorage.setItem('ai-guide-tour-seen', 'true');
  };

  const startTour = () => {
    setShowTour(true);
  };

  return (
    <div className={cn('relative', className)}>
      {/* Guided Tour */}
      {showTour && <GuidedTour onComplete={closeTour} onSkip={closeTour} />}

      {/* Search View */}
      {viewState === 'search' && (
        <div className="space-y-8">
          {/* Header with Tour Button */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-4xl">🔍</span>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Find Your Customers
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
              Just tell me who you're looking for - like you're talking to a friend!
            </p>
            {!hasSeenTour && (
              <button
                onClick={startTour}
                className="mt-3 text-sm text-primary hover:text-primary-hover underline"
              >
                First time here? Take a quick tour!
              </button>
            )}
          </div>

          {/* Big Friendly Search Box */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative" data-tour="search-box">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What customers are you looking for?"
                className={cn(
                  'w-full px-6 py-5 text-lg rounded-2xl border-2 transition-all',
                  'bg-white dark:bg-gray-800',
                  'border-gray-200 dark:border-gray-700',
                  'focus:border-primary focus:ring-4 focus:ring-primary/20',
                  'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                  'text-gray-900 dark:text-white'
                )}
                disabled={isSearching}
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className={cn(
                  'absolute right-3 top-1/2 -translate-y-1/2',
                  'px-6 py-2.5 rounded-xl font-medium transition-all',
                  'bg-primary text-white hover:bg-primary-hover',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isSearching ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Searching...
                  </span>
                ) : (
                  'Search'
                )}
              </button>
            </div>
          </form>

          {/* Quick Questions */}
          <div className="max-w-3xl mx-auto" data-tour="quick-questions">
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
              Or try one of these common questions:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {QUICK_QUESTIONS.map((question) => (
                <button
                  key={question.id}
                  onClick={() => handleQuickQuestion(question)}
                  disabled={isSearching}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    'bg-white dark:bg-gray-800',
                    'border-gray-200 dark:border-gray-700',
                    'hover:border-primary hover:bg-primary/5',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'group'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl group-hover:scale-110 transition-transform">
                      {question.emoji}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {question.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {question.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Jargon Help */}
          <div className="max-w-2xl mx-auto">
            <JargonTranslator />
          </div>
        </div>
      )}

      {/* Results View */}
      {viewState === 'results' && (
        <div className="space-y-6">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackToSearch}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to search
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={selectAll}
                className="text-sm text-primary hover:text-primary-hover"
              >
                Select all
              </button>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <button
                onClick={deselectAll}
                className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Deselect all
              </button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
            <span className="text-3xl mb-2 block">🎉</span>
            <h3 className="text-xl font-bold text-green-800 dark:text-green-200 mb-1">
              Great! I found {results.length} customer{results.length !== 1 ? 's' : ''}
            </h3>
            <p className="text-green-600 dark:text-green-300 text-sm">
              {selectedCustomers.size} selected - What would you like to do?
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-center" data-tour="action-buttons">
            <button
              onClick={() => handleAction('email')}
              disabled={selectedCustomers.size === 0}
              className={cn(
                'flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all',
                'bg-blue-500 text-white hover:bg-blue-600',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <span>📧</span> Send them an email
            </button>
            <button
              onClick={() => handleAction('call')}
              disabled={selectedCustomers.size === 0}
              className={cn(
                'flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all',
                'bg-green-500 text-white hover:bg-green-600',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <span>📞</span> Call them
            </button>
            <button
              onClick={() => handleAction('schedule')}
              disabled={selectedCustomers.size === 0}
              className={cn(
                'flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all',
                'bg-purple-500 text-white hover:bg-purple-600',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <span>📅</span> Book service
            </button>
            <button
              onClick={() => handleAction('save')}
              disabled={selectedCustomers.size === 0}
              className={cn(
                'flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all',
                'bg-amber-500 text-white hover:bg-amber-600',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <span>💾</span> Save for later
            </button>
            <button
              onClick={handleNarrowDown}
              className={cn(
                'flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all',
                'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200',
                'hover:bg-gray-300 dark:hover:bg-gray-600'
              )}
            >
              <span>🔍</span> Narrow down more
            </button>
          </div>

          {/* Customer Results Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.map((customer) => (
              <SimpleResultCard
                key={customer.id}
                customer={customer}
                isSelected={selectedCustomers.has(customer.id)}
                onToggleSelect={() => toggleCustomerSelection(customer.id)}
                onQuickAction={(action) => {
                  setSelectedCustomers(new Set([customer.id]));
                  handleAction(action);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Action Wizard View */}
      {viewState === 'action' && currentAction && (
        <ActionWizard
          action={currentAction}
          customers={results.filter((c) => selectedCustomers.has(c.id))}
          onComplete={handleActionComplete}
          onBack={handleBackToResults}
        />
      )}
    </div>
  );
}

export default AIGuide;
