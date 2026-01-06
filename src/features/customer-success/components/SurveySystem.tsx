/**
 * NPS/CSAT Survey System Component
 *
 * Complete survey management system featuring:
 * - Survey creation and templates
 * - NPS (Net Promoter Score) surveys
 * - CSAT (Customer Satisfaction) surveys
 * - CES (Customer Effort Score) surveys
 * - Survey analytics and response tracking
 * - Automated survey triggers
 */

import { useState } from 'react';
import { cn } from '@/lib/utils.ts';

// Types
export type SurveyType = 'nps' | 'csat' | 'ces' | 'custom';
export type SurveyStatus = 'draft' | 'active' | 'paused' | 'completed';
export type SurveyTrigger = 'manual' | 'scheduled' | 'event' | 'milestone';

export interface Survey {
  id: number;
  name: string;
  type: SurveyType;
  status: SurveyStatus;
  trigger: SurveyTrigger;
  questions: SurveyQuestion[];
  responses_count: number;
  avg_score?: number;
  created_at: string;
  scheduled_at?: string;
  target_segment_id?: number;
  target_segment_name?: string;
}

export interface SurveyQuestion {
  id: number;
  text: string;
  type: 'rating' | 'scale' | 'text' | 'multiple_choice';
  required: boolean;
  options?: string[];
  scale_min?: number;
  scale_max?: number;
}

export interface SurveyResponse {
  id: number;
  survey_id: number;
  customer_id: number;
  customer_name: string;
  score?: number;
  feedback?: string;
  created_at: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

// Sample data
const sampleSurveys: Survey[] = [
  {
    id: 1,
    name: 'Q1 NPS Survey',
    type: 'nps',
    status: 'active',
    trigger: 'scheduled',
    questions: [
      { id: 1, text: 'How likely are you to recommend us?', type: 'scale', required: true, scale_min: 0, scale_max: 10 },
      { id: 2, text: 'What is the primary reason for your score?', type: 'text', required: false },
    ],
    responses_count: 156,
    avg_score: 42,
    created_at: '2026-01-01',
    scheduled_at: '2026-01-15',
    target_segment_name: 'All Active Customers',
  },
  {
    id: 2,
    name: 'Post-Onboarding CSAT',
    type: 'csat',
    status: 'active',
    trigger: 'event',
    questions: [
      { id: 1, text: 'How satisfied are you with the onboarding process?', type: 'rating', required: true },
      { id: 2, text: 'What could we improve?', type: 'text', required: false },
    ],
    responses_count: 48,
    avg_score: 4.2,
    created_at: '2025-12-15',
    target_segment_name: 'New Customers',
  },
  {
    id: 3,
    name: 'Support Interaction CES',
    type: 'ces',
    status: 'active',
    trigger: 'event',
    questions: [
      { id: 1, text: 'How easy was it to get your issue resolved?', type: 'scale', required: true, scale_min: 1, scale_max: 7 },
    ],
    responses_count: 234,
    avg_score: 5.8,
    created_at: '2025-11-01',
  },
  {
    id: 4,
    name: 'Product Feature Survey',
    type: 'custom',
    status: 'draft',
    trigger: 'manual',
    questions: [
      { id: 1, text: 'Which features do you use most?', type: 'multiple_choice', required: true, options: ['Feature A', 'Feature B', 'Feature C'] },
    ],
    responses_count: 0,
    created_at: '2026-01-05',
  },
];

const sampleResponses: SurveyResponse[] = [
  { id: 1, survey_id: 1, customer_id: 1, customer_name: 'Acme Corp', score: 9, feedback: 'Great service!', created_at: '2026-01-05T10:30:00Z', sentiment: 'positive' },
  { id: 2, survey_id: 1, customer_id: 2, customer_name: 'TechStart Inc', score: 7, feedback: 'Good but room for improvement', created_at: '2026-01-05T09:15:00Z', sentiment: 'neutral' },
  { id: 3, survey_id: 1, customer_id: 3, customer_name: 'Global Services', score: 4, feedback: 'Had issues with support', created_at: '2026-01-04T16:45:00Z', sentiment: 'negative' },
  { id: 4, survey_id: 1, customer_id: 4, customer_name: 'Local Business Co', score: 10, feedback: 'Absolutely love it!', created_at: '2026-01-04T14:20:00Z', sentiment: 'positive' },
];

// Components
function SurveyTypeIcon({ type }: { type: SurveyType }) {
  switch (type) {
    case 'nps':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'csat':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      );
    case 'ces':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
  }
}

function SurveyStatusBadge({ status }: { status: SurveyStatus }) {
  const config = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
    active: { bg: 'bg-success/10', text: 'text-success', label: 'Active' },
    paused: { bg: 'bg-warning/10', text: 'text-warning', label: 'Paused' },
    completed: { bg: 'bg-info/10', text: 'text-info', label: 'Completed' },
  };

  const { bg, text, label } = config[status];

  return (
    <span className={cn('px-2 py-1 text-xs font-medium rounded-full', bg, text)}>
      {label}
    </span>
  );
}

function SurveyCard({ survey, onSelect }: { survey: Survey; onSelect: (survey: Survey) => void }) {
  const typeLabels: Record<SurveyType, string> = {
    nps: 'NPS',
    csat: 'CSAT',
    ces: 'CES',
    custom: 'Custom',
  };

  const typeColors: Record<SurveyType, string> = {
    nps: 'text-primary bg-primary/10',
    csat: 'text-warning bg-warning/10',
    ces: 'text-info bg-info/10',
    custom: 'text-text-secondary bg-bg-hover',
  };

  return (
    <div
      onClick={() => onSelect(survey)}
      className="bg-bg-card rounded-xl border border-border p-6 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-2 rounded-lg', typeColors[survey.type])}>
          <SurveyTypeIcon type={survey.type} />
        </div>
        <SurveyStatusBadge status={survey.status} />
      </div>

      <h3 className="font-semibold text-text-primary mb-1">{survey.name}</h3>
      <p className="text-sm text-text-muted mb-4">
        {typeLabels[survey.type]} Survey · {survey.questions.length} questions
      </p>

      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="text-text-muted">Responses:</span>
          <span className="ml-1 font-medium text-text-primary">{survey.responses_count}</span>
        </div>
        {survey.avg_score !== undefined && (
          <div>
            <span className="text-text-muted">Score:</span>
            <span className={cn(
              'ml-1 font-medium',
              survey.type === 'nps'
                ? survey.avg_score >= 50 ? 'text-success' : survey.avg_score >= 0 ? 'text-warning' : 'text-danger'
                : survey.avg_score >= 4 ? 'text-success' : survey.avg_score >= 3 ? 'text-warning' : 'text-danger'
            )}>
              {survey.type === 'nps' ? survey.avg_score : survey.avg_score.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {survey.target_segment_name && (
        <div className="mt-3 pt-3 border-t border-border">
          <span className="text-xs text-text-muted">
            Target: <span className="text-text-secondary">{survey.target_segment_name}</span>
          </span>
        </div>
      )}
    </div>
  );
}

function ResponsesList({ responses }: { responses: SurveyResponse[] }) {
  return (
    <div className="space-y-3">
      {responses.map((response) => (
        <div key={response.id} className="bg-bg-hover rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-medium text-text-primary">{response.customer_name}</p>
              <p className="text-xs text-text-muted">
                {new Date(response.created_at).toLocaleDateString()} at{' '}
                {new Date(response.created_at).toLocaleTimeString()}
              </p>
            </div>
            {response.score !== undefined && (
              <div className={cn(
                'px-3 py-1 rounded-full text-sm font-bold',
                response.score >= 9 ? 'bg-success/10 text-success' :
                response.score >= 7 ? 'bg-warning/10 text-warning' :
                'bg-danger/10 text-danger'
              )}>
                {response.score}
              </div>
            )}
          </div>
          {response.feedback && (
            <p className="text-sm text-text-secondary mt-2">"{response.feedback}"</p>
          )}
          {response.sentiment && (
            <div className="mt-2">
              <span className={cn(
                'text-xs px-2 py-0.5 rounded',
                response.sentiment === 'positive' ? 'bg-success/10 text-success' :
                response.sentiment === 'negative' ? 'bg-danger/10 text-danger' :
                'bg-gray-100 text-gray-600'
              )}>
                {response.sentiment}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function NPSScoreBreakdown({ promoters, passives, detractors }: {
  promoters: number;
  passives: number;
  detractors: number;
}) {
  const total = promoters + passives + detractors;
  const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

  return (
    <div className="bg-bg-card rounded-xl border border-border p-6">
      <h3 className="font-semibold text-text-primary mb-4">NPS Breakdown</h3>

      <div className="flex items-center justify-center mb-6">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-bg-hover" />
            <circle
              cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeDasharray={`${Math.abs(nps)} 100`}
              className={nps >= 50 ? 'text-success' : nps >= 0 ? 'text-warning' : 'text-danger'}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn(
              'text-3xl font-bold',
              nps >= 50 ? 'text-success' : nps >= 0 ? 'text-warning' : 'text-danger'
            )}>
              {nps >= 0 ? '+' : ''}{nps}
            </span>
            <span className="text-xs text-text-muted">NPS Score</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-success font-medium">Promoters (9-10)</span>
            <span className="text-text-primary">{promoters} ({total > 0 ? Math.round((promoters / total) * 100) : 0}%)</span>
          </div>
          <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
            <div className="h-full bg-success rounded-full" style={{ width: `${total > 0 ? (promoters / total) * 100 : 0}%` }} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-warning font-medium">Passives (7-8)</span>
            <span className="text-text-primary">{passives} ({total > 0 ? Math.round((passives / total) * 100) : 0}%)</span>
          </div>
          <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
            <div className="h-full bg-warning rounded-full" style={{ width: `${total > 0 ? (passives / total) * 100 : 0}%` }} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-danger font-medium">Detractors (0-6)</span>
            <span className="text-text-primary">{detractors} ({total > 0 ? Math.round((detractors / total) * 100) : 0}%)</span>
          </div>
          <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
            <div className="h-full bg-danger rounded-full" style={{ width: `${total > 0 ? (detractors / total) * 100 : 0}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateSurveyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [surveyType, setSurveyType] = useState<SurveyType>('nps');
  const [surveyName, setSurveyName] = useState('');
  const [trigger, setTrigger] = useState<SurveyTrigger>('manual');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-bg-card rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Create Survey</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Survey Name</label>
            <input
              type="text"
              value={surveyName}
              onChange={(e) => setSurveyName(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Q1 Customer Satisfaction"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Survey Type</label>
            <div className="grid grid-cols-4 gap-2">
              {(['nps', 'csat', 'ces', 'custom'] as SurveyType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSurveyType(type)}
                  className={cn(
                    'px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
                    surveyType === type
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-text-secondary hover:bg-bg-hover'
                  )}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Trigger</label>
            <select
              value={trigger}
              onChange={(e) => setTrigger(e.target.value as SurveyTrigger)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="manual">Manual</option>
              <option value="scheduled">Scheduled</option>
              <option value="event">Event-based</option>
              <option value="milestone">Milestone</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-bg-hover"
          >
            Cancel
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">
            Create Survey
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function SurveySystem() {
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<SurveyStatus | 'all'>('all');

  const filteredSurveys = filter === 'all'
    ? sampleSurveys
    : sampleSurveys.filter(s => s.status === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Survey Management</h2>
          <p className="text-sm text-text-muted">Create and manage NPS, CSAT, and CES surveys</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Survey
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {(['all', 'active', 'draft', 'paused', 'completed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
              filter === status
                ? 'bg-primary text-white'
                : 'bg-bg-hover text-text-secondary hover:text-text-primary'
            )}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Survey Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSurveys.map((survey) => (
          <SurveyCard
            key={survey.id}
            survey={survey}
            onSelect={setSelectedSurvey}
          />
        ))}
      </div>

      {/* Selected Survey Detail */}
      {selectedSurvey && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Response Details */}
          <div className="lg:col-span-2 bg-bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-primary">Recent Responses</h3>
              <button
                onClick={() => setSelectedSurvey(null)}
                className="text-text-muted hover:text-text-primary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ResponsesList responses={sampleResponses.filter(r => r.survey_id === selectedSurvey.id)} />
          </div>

          {/* NPS Breakdown */}
          {selectedSurvey.type === 'nps' && (
            <NPSScoreBreakdown
              promoters={65}
              passives={20}
              detractors={15}
            />
          )}
        </div>
      )}

      {/* Create Survey Modal */}
      <CreateSurveyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
