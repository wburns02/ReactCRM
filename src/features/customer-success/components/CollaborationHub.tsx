/**
 * Success Team Collaboration Hub Component
 *
 * Internal collaboration center for Customer Success teams featuring:
 * - Internal documentation
 * - Training materials
 * - Cross-functional notes
 * - Team knowledge base
 * - Resource library
 * - Best practices repository
 */

import { useState } from 'react';
import { cn } from '@/lib/utils.ts';

// Types
export type ResourceType = 'document' | 'video' | 'template' | 'checklist' | 'guide' | 'script';
export type ResourceCategory = 'onboarding' | 'training' | 'playbooks' | 'processes' | 'best_practices' | 'templates';

export interface Resource {
  id: number;
  title: string;
  description?: string;
  type: ResourceType;
  category: ResourceCategory;
  content?: string;
  url?: string;
  author: string;
  created_at: string;
  updated_at: string;
  views: number;
  likes: number;
  tags: string[];
  is_featured: boolean;
}

export interface TeamNote {
  id: number;
  customer_id?: number;
  customer_name?: string;
  title: string;
  content: string;
  author: string;
  created_at: string;
  is_pinned: boolean;
  visibility: 'team' | 'manager' | 'all';
  comments: TeamComment[];
}

export interface TeamComment {
  id: number;
  author: string;
  content: string;
  created_at: string;
}

// Sample data
const sampleResources: Resource[] = [
  {
    id: 1,
    title: 'New CSM Onboarding Guide',
    description: 'Complete onboarding checklist and training materials for new Customer Success Managers',
    type: 'guide',
    category: 'onboarding',
    author: 'Sarah Johnson',
    created_at: '2025-12-01',
    updated_at: '2026-01-05',
    views: 234,
    likes: 45,
    tags: ['onboarding', 'training', 'essential'],
    is_featured: true,
  },
  {
    id: 2,
    title: 'At-Risk Customer Playbook',
    description: 'Step-by-step guide for handling customers showing churn signals',
    type: 'template',
    category: 'playbooks',
    author: 'Mike Chen',
    created_at: '2025-11-15',
    updated_at: '2025-12-20',
    views: 189,
    likes: 38,
    tags: ['churn', 'retention', 'playbook'],
    is_featured: true,
  },
  {
    id: 3,
    title: 'Executive Business Review Template',
    description: 'EBR presentation template with talking points and success metrics',
    type: 'template',
    category: 'templates',
    author: 'Emily Davis',
    created_at: '2025-10-20',
    updated_at: '2025-11-30',
    views: 156,
    likes: 32,
    tags: ['ebr', 'executive', 'template'],
    is_featured: false,
  },
  {
    id: 4,
    title: 'Renewal Call Script',
    description: 'Talk track for annual renewal conversations',
    type: 'script',
    category: 'templates',
    author: 'Tom Wilson',
    created_at: '2025-09-10',
    updated_at: '2025-12-15',
    views: 98,
    likes: 21,
    tags: ['renewal', 'script', 'sales'],
    is_featured: false,
  },
  {
    id: 5,
    title: 'Product Feature Training: Advanced Analytics',
    description: 'Video walkthrough of the analytics dashboard features',
    type: 'video',
    category: 'training',
    author: 'Product Team',
    created_at: '2026-01-02',
    updated_at: '2026-01-02',
    views: 67,
    likes: 15,
    tags: ['training', 'product', 'analytics'],
    is_featured: true,
  },
  {
    id: 6,
    title: 'Quarterly Planning Process',
    description: 'How to conduct quarterly success planning with customers',
    type: 'checklist',
    category: 'processes',
    author: 'Sarah Johnson',
    created_at: '2025-08-15',
    updated_at: '2025-11-01',
    views: 112,
    likes: 28,
    tags: ['planning', 'process', 'quarterly'],
    is_featured: false,
  },
];

const sampleNotes: TeamNote[] = [
  {
    id: 1,
    customer_id: 1,
    customer_name: 'Acme Corp',
    title: 'Q1 Strategy Discussion',
    content: 'Met with VP of Ops. They are planning major expansion in Q2. We should prepare upsell proposal for enterprise tier.',
    author: 'Mike Chen',
    created_at: '2026-01-05T14:30:00Z',
    is_pinned: true,
    visibility: 'team',
    comments: [
      { id: 1, author: 'Sarah Johnson', content: 'Great insight! I\'ll prepare the enterprise proposal.', created_at: '2026-01-05T15:00:00Z' },
    ],
  },
  {
    id: 2,
    title: 'Team Update: New Escalation Process',
    content: 'Starting next week, all critical escalations must be logged in the new system. Training session on Friday at 2pm.',
    author: 'Emily Davis',
    created_at: '2026-01-04T10:00:00Z',
    is_pinned: true,
    visibility: 'all',
    comments: [],
  },
  {
    id: 3,
    customer_id: 2,
    customer_name: 'TechStart Inc',
    title: 'Support Issue Resolution',
    content: 'Resolved the integration issue they reported. Root cause was incorrect API credentials. Customer satisfied.',
    author: 'Tom Wilson',
    created_at: '2026-01-03T16:45:00Z',
    is_pinned: false,
    visibility: 'team',
    comments: [],
  },
];

// Components
function ResourceTypeIcon({ type }: { type: ResourceType }) {
  const icons: Record<ResourceType, React.ReactNode> = {
    document: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    video: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    template: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
    checklist: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    guide: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    script: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  };

  return icons[type];
}

function ResourceCard({ resource, onSelect, isSelected }: { resource: Resource; onSelect: (r: Resource) => void; isSelected?: boolean }) {
  const categoryColors: Record<ResourceCategory, string> = {
    onboarding: 'bg-success/10 text-success',
    training: 'bg-info/10 text-info',
    playbooks: 'bg-warning/10 text-warning',
    processes: 'bg-primary/10 text-primary',
    best_practices: 'bg-purple-100 text-purple-700',
    templates: 'bg-pink-100 text-pink-700',
  };

  return (
    <div
      onClick={() => onSelect(resource)}
      className={cn(
        "bg-bg-card rounded-xl border p-6 hover:shadow-md transition-all cursor-pointer relative",
        isSelected ? "border-primary ring-2 ring-primary/20" : "border-border"
      )}
    >
      {resource.is_featured && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-warning text-white text-xs font-medium rounded-full">
          Featured
        </div>
      )}

      <div className="flex items-start gap-4 mb-3">
        <div className={cn('p-2 rounded-lg', categoryColors[resource.category])}>
          <ResourceTypeIcon type={resource.type} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary line-clamp-1">{resource.title}</h3>
          <p className="text-xs text-text-muted capitalize">{resource.type} · {resource.category.replace('_', ' ')}</p>
        </div>
      </div>

      {resource.description && (
        <p className="text-sm text-text-secondary mb-4 line-clamp-2">{resource.description}</p>
      )}

      <div className="flex flex-wrap gap-1 mb-4">
        {resource.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="px-2 py-0.5 text-xs bg-bg-hover text-text-muted rounded">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-text-muted pt-4 border-t border-border">
        <span>{resource.author}</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {resource.views}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {resource.likes}
          </span>
        </div>
      </div>
    </div>
  );
}

function NoteCard({ note }: { note: TeamNote }) {
  return (
    <div className={cn(
      'bg-bg-card rounded-xl border p-6',
      note.is_pinned ? 'border-primary' : 'border-border'
    )}>
      {note.is_pinned && (
        <div className="flex items-center gap-1 text-primary text-xs mb-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 3H8a1 1 0 00-1 1v2.586L5.707 7.879A1 1 0 005 8.586V21a1 1 0 001.707.707L12 16.414l5.293 5.293A1 1 0 0019 21V8.586a1 1 0 00-.293-.707L17 6.586V4a1 1 0 00-1-1z" />
          </svg>
          Pinned
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-text-primary">{note.title}</h3>
          {note.customer_name && (
            <p className="text-xs text-primary">{note.customer_name}</p>
          )}
        </div>
        <span className={cn(
          'px-2 py-0.5 text-xs rounded-full',
          note.visibility === 'all' ? 'bg-success/10 text-success' :
          note.visibility === 'manager' ? 'bg-warning/10 text-warning' :
          'bg-bg-hover text-text-muted'
        )}>
          {note.visibility}
        </span>
      </div>

      <p className="text-sm text-text-secondary mb-4">{note.content}</p>

      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>{note.author} · {new Date(note.created_at).toLocaleDateString()}</span>
        {note.comments.length > 0 && (
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {note.comments.length}
          </span>
        )}
      </div>

      {/* Comments */}
      {note.comments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          {note.comments.map((comment) => (
            <div key={comment.id} className="text-sm">
              <p className="text-text-secondary">{comment.content}</p>
              <p className="text-xs text-text-muted mt-1">
                {comment.author} · {new Date(comment.created_at).toLocaleTimeString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickSearch({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('');

  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onSearch(e.target.value);
        }}
        placeholder="Search resources, notes, and documents..."
        className="w-full pl-10 pr-4 py-3 border border-border rounded-xl bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

// Resource Detail Modal
function ResourceDetailModal({ resource, isOpen, onClose }: { resource: Resource; isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  const categoryColors: Record<ResourceCategory, string> = {
    onboarding: 'bg-success/10 text-success',
    training: 'bg-info/10 text-info',
    playbooks: 'bg-warning/10 text-warning',
    processes: 'bg-primary/10 text-primary',
    best_practices: 'bg-purple-100 text-purple-700',
    templates: 'bg-pink-100 text-pink-700',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-bg-primary border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={cn('p-3 rounded-lg', categoryColors[resource.category])}>
                <ResourceTypeIcon type={resource.type} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn('px-2 py-0.5 text-xs rounded-full', categoryColors[resource.category])}>
                    {resource.category.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-text-muted capitalize">{resource.type}</span>
                </div>
                <h2 className="text-xl font-bold text-text-primary">{resource.title}</h2>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-text-muted hover:text-text-primary transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {resource.description && (
            <div>
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">Description</h3>
              <p className="text-text-secondary">{resource.description}</p>
            </div>
          )}

          {resource.content && (
            <div>
              <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">Content</h3>
              <div className="bg-bg-secondary rounded-lg border border-border p-4 text-text-secondary whitespace-pre-wrap">
                {resource.content}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {resource.tags.map((tag) => (
              <span key={tag} className="px-2 py-1 bg-bg-tertiary text-text-muted text-sm rounded">
                {tag}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-2xl font-bold text-text-primary">{resource.views}</p>
              <p className="text-xs text-text-muted">Views</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-text-primary">{resource.likes}</p>
              <p className="text-xs text-text-muted">Likes</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-text-primary">{resource.author}</p>
              <p className="text-xs text-text-muted">Author</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-border bg-bg-secondary flex items-center justify-between">
          <p className="text-xs text-text-muted">
            Updated: {new Date(resource.updated_at).toLocaleDateString()}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => alert('Like functionality coming soon!')}
              className="px-4 py-2 text-sm text-text-secondary hover:text-primary transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Like
            </button>
            {resource.url && (
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open Resource
              </a>
            )}
            {!resource.url && (
              <button
                onClick={() => alert(`Opening "${resource.title}"...\n\nResource viewer coming soon!`)}
                className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function CollaborationHub() {
  const [activeTab, setActiveTab] = useState<'resources' | 'notes' | 'activity'>('resources');
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteVisibility, setNoteVisibility] = useState<'team' | 'manager' | 'all'>('team');

  const filteredResources = sampleResources.filter((r) => {
    const matchesCategory = selectedCategory === 'all' || r.category === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleSelectResource = (resource: Resource) => {
    setSelectedResource(resource);
  };

  const handlePostNote = () => {
    if (!noteText.trim()) {
      alert('Please enter a note before posting.');
      return;
    }
    alert(`Note posted successfully!\n\nVisibility: ${noteVisibility}\nContent: ${noteText.substring(0, 100)}${noteText.length > 100 ? '...' : ''}\n\nNote posting to backend coming soon!`);
    setNoteText('');
  };

  const handleAddResource = () => {
    alert('Add new resource\n\nResource upload is coming soon!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Collaboration Hub</h2>
          <p className="text-sm text-text-muted">Team resources, documentation, and shared knowledge</p>
        </div>
        <button
          onClick={handleAddResource}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Resource
        </button>
      </div>

      {/* Search */}
      <QuickSearch onSearch={setSearchQuery} />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {(['resources', 'notes', 'activity'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize',
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Resources Tab */}
      {activeTab === 'resources' && (
        <>
          {/* Category Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
                selectedCategory === 'all' ? 'bg-primary text-white' : 'bg-bg-hover text-text-secondary hover:text-text-primary'
              )}
            >
              All
            </button>
            {(['onboarding', 'training', 'playbooks', 'processes', 'best_practices', 'templates'] as ResourceCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors capitalize',
                  selectedCategory === cat ? 'bg-primary text-white' : 'bg-bg-hover text-text-secondary hover:text-text-primary'
                )}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Featured Resources */}
          {selectedCategory === 'all' && searchQuery === '' && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-text-secondary mb-3">Featured Resources</h3>
              <div className="grid md:grid-cols-3 gap-4">
                {sampleResources.filter(r => r.is_featured).map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    onSelect={handleSelectResource}
                    isSelected={selectedResource?.id === resource.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Resources */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onSelect={handleSelectResource}
                isSelected={selectedResource?.id === resource.id}
              />
            ))}
          </div>

          {filteredResources.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-12 h-12 mx-auto text-text-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-text-muted">No resources found matching your criteria</p>
            </div>
          )}
        </>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          {/* Quick Note Input */}
          <div className="bg-bg-card rounded-xl border border-border p-4">
            <textarea
              placeholder="Share an update or insight with your team..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-bg-primary text-text-primary resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
            />
            <div className="flex items-center justify-between mt-3">
              <select
                value={noteVisibility}
                onChange={(e) => setNoteVisibility(e.target.value as 'team' | 'manager' | 'all')}
                className="text-sm border border-border rounded-lg px-3 py-1.5 bg-bg-primary text-text-secondary"
              >
                <option value="team">Team Only</option>
                <option value="manager">Managers</option>
                <option value="all">Everyone</option>
              </select>
              <button
                onClick={handlePostNote}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark"
              >
                Post Note
              </button>
            </div>
          </div>

          {/* Notes List */}
          <div className="space-y-4">
            {sampleNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="bg-bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold text-text-primary mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { action: 'Sarah Johnson updated', resource: 'New CSM Onboarding Guide', time: '2 hours ago' },
              { action: 'Mike Chen added', resource: 'Q1 Strategy Discussion note', time: '5 hours ago' },
              { action: 'Emily Davis created', resource: 'Team Update: New Escalation Process', time: 'Yesterday' },
              { action: 'Tom Wilson viewed', resource: 'Renewal Call Script', time: 'Yesterday' },
              { action: 'Product Team published', resource: 'Product Feature Training: Advanced Analytics', time: '3 days ago' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                  {activity.action.split(' ')[0].charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-text-primary">
                    <span className="font-medium">{activity.action}</span>{' '}
                    <span className="text-primary">{activity.resource}</span>
                  </p>
                  <p className="text-xs text-text-muted">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resource Detail Modal */}
      {selectedResource && (
        <ResourceDetailModal
          resource={selectedResource}
          isOpen={true}
          onClose={() => setSelectedResource(null)}
        />
      )}
    </div>
  );
}
