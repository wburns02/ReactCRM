/**
 * SegmentsPage Component
 *
 * Main page for the visual segment builder with:
 * - List of all segments with member counts and AI insights
 * - Quick actions (view members, edit, duplicate, delete)
 * - Pre-built smart segments section
 * - AI suggestion cards
 */

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils.ts';
import type { Segment, SegmentType, SegmentRuleSet } from '@/api/types/customerSuccess.ts';
import {
  useSegmentsList,
  useDeleteSegment,
  useDuplicateSegment,
  useCreateSegment,
  useUpdateSegment,
  useSegmentSuggestions,
  useSmartSegments,
  type SegmentSuggestion,
  type SmartSegment,
} from '@/hooks/useSegments.ts';
import { SegmentCard } from './components/SegmentCard.tsx';
import { AISuggestionsPanel } from './components/SegmentInsight.tsx';
import { SegmentBuilder } from './SegmentBuilder.tsx';
import { SegmentDetail } from './SegmentDetail.tsx';
import { AISegmentChat } from './AISegmentChat.tsx';

type ViewMode = 'list' | 'builder' | 'detail' | 'chat';

export function SegmentsPage() {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [filterType, setFilterType] = useState<SegmentType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAISuggestions, setShowAISuggestions] = useState(true);
  const [showSmartSegments, setShowSmartSegments] = useState(true);

  // Queries
  const { data: segmentsData, isLoading, refetch } = useSegmentsList({
    segment_type: filterType === 'all' ? undefined : filterType,
    search: searchQuery || undefined,
  });
  const { data: suggestions } = useSegmentSuggestions();
  const { data: smartSegments } = useSmartSegments();

  // Mutations
  const deleteMutation = useDeleteSegment();
  const duplicateMutation = useDuplicateSegment();
  const createMutation = useCreateSegment();
  const updateMutation = useUpdateSegment();

  // Filtered segments
  const segments = segmentsData?.items || [];

  // Group smart segments by category
  const smartSegmentsByCategory = useMemo(() => {
    if (!smartSegments) return {};
    return smartSegments.reduce((acc, segment) => {
      if (!acc[segment.category]) {
        acc[segment.category] = [];
      }
      acc[segment.category].push(segment);
      return acc;
    }, {} as Record<string, SmartSegment[]>);
  }, [smartSegments]);

  // Handlers
  const handleSelectSegment = (segment: Segment) => {
    setSelectedSegment(segment);
    setViewMode('detail');
  };

  const handleEditSegment = (segment: Segment) => {
    setEditingSegment(segment);
    setViewMode('builder');
  };

  const handleDuplicateSegment = async (segment: Segment) => {
    try {
      await duplicateMutation.mutateAsync(segment);
      refetch();
    } catch (error) {
      console.error('Failed to duplicate segment:', error);
    }
  };

  const handleDeleteSegment = async (segment: Segment) => {
    if (!confirm(`Are you sure you want to delete "${segment.name}"?`)) return;

    try {
      await deleteMutation.mutateAsync(segment.id);
      if (selectedSegment?.id === segment.id) {
        setSelectedSegment(null);
        setViewMode('list');
      }
      refetch();
    } catch (error) {
      console.error('Failed to delete segment:', error);
    }
  };

  const handleCreateNew = () => {
    setEditingSegment(null);
    setViewMode('builder');
  };

  const handleOpenChat = () => {
    setViewMode('chat');
  };

  const handleSaveSegment = async (data: {
    name: string;
    description: string;
    segment_type: SegmentType;
    rules: SegmentRuleSet;
    color: string;
  }) => {
    try {
      if (editingSegment) {
        await updateMutation.mutateAsync({
          id: editingSegment.id,
          data: {
            name: data.name,
            description: data.description,
            segment_type: data.segment_type,
            rules: data.rules,
            color: data.color,
            is_active: true,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          description: data.description,
          segment_type: data.segment_type,
          rules: data.rules,
          color: data.color,
          is_active: true,
        });
      }
      setViewMode('list');
      setEditingSegment(null);
      refetch();
    } catch (error) {
      console.error('Failed to save segment:', error);
    }
  };

  const handleApplySuggestion = (suggestion: SegmentSuggestion) => {
    void suggestion; // Will use in future implementation
    setEditingSegment(null);
    setViewMode('builder');
    // TODO: The builder will be pre-filled with suggestion data
  };

  const handleApplySmartSegment = async (smartSegment: SmartSegment) => {
    try {
      await createMutation.mutateAsync({
        name: smartSegment.name,
        description: smartSegment.description,
        segment_type: 'dynamic',
        rules: smartSegment.rules,
        is_active: true,
      });
      refetch();
    } catch (error) {
      console.error('Failed to create segment:', error);
    }
  };

  const handleApplyFromChat = async (data: { name: string; rules: SegmentRuleSet }) => {
    try {
      await createMutation.mutateAsync({
        name: data.name,
        description: 'Created via AI chat',
        segment_type: 'ai_generated',
        rules: data.rules,
        is_active: true,
      });
      setViewMode('list');
      refetch();
    } catch (error) {
      console.error('Failed to create segment:', error);
    }
  };

  const handleEditFromChat = (rules: SegmentRuleSet) => {
    void rules; // Will use in future implementation
    setEditingSegment(null);
    setViewMode('builder');
    // TODO: Pass rules to builder
  };

  // Render based on view mode
  if (viewMode === 'builder') {
    return (
      <div className="h-full">
        <SegmentBuilder
          initialRules={editingSegment?.rules as SegmentRuleSet | undefined}
          initialName={editingSegment?.name}
          initialDescription={editingSegment?.description || ''}
          initialType={editingSegment?.segment_type || 'dynamic'}
          initialColor={editingSegment?.color || undefined}
          isEditing={!!editingSegment}
          onSave={handleSaveSegment}
          onCancel={() => {
            setViewMode('list');
            setEditingSegment(null);
          }}
        />
      </div>
    );
  }

  if (viewMode === 'detail' && selectedSegment) {
    return (
      <div className="h-full">
        <SegmentDetail
          segment={selectedSegment}
          onEdit={() => handleEditSegment(selectedSegment)}
          onViewBuilder={() => handleEditSegment(selectedSegment)}
          onClose={() => {
            setViewMode('list');
            setSelectedSegment(null);
          }}
        />
      </div>
    );
  }

  if (viewMode === 'chat') {
    return (
      <div className="h-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setViewMode('list')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Segments
          </button>
        </div>
        <div className="h-[calc(100%-64px)]">
          <AISegmentChat
            onApplySegment={handleApplyFromChat}
            onEditInBuilder={handleEditFromChat}
          />
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Segments</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Create and manage customer segments for targeted engagement
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenChat}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-purple-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI Builder
              </button>
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Segment
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search segments..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div className="flex gap-2">
              {(['all', 'dynamic', 'static', 'ai_generated'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    filterType === type
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                >
                  {type === 'all' ? 'All' : type === 'ai_generated' ? 'AI' : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">
        {/* AI Suggestions */}
        {showAISuggestions && suggestions && suggestions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-primary">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </span>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Suggestions</h2>
              </div>
              <button
                onClick={() => setShowAISuggestions(false)}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Hide
              </button>
            </div>
            <AISuggestionsPanel
              suggestions={suggestions.slice(0, 3)}
              onApply={handleApplySuggestion}
              onDismiss={() => {}}
            />
          </div>
        )}

        {/* Smart Segments */}
        {showSmartSegments && Object.keys(smartSegmentsByCategory).length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-purple-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </span>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Start Segments</h2>
              </div>
              <button
                onClick={() => setShowSmartSegments(false)}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Hide
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Object.entries(smartSegmentsByCategory).map(([category, categorySegments]) => (
                <div key={category} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3">{category}</h3>
                  <div className="space-y-2">
                    {categorySegments.map((segment) => (
                      <button
                        key={segment.id}
                        onClick={() => handleApplySmartSegment(segment)}
                        disabled={createMutation.isPending}
                        className="w-full flex items-center gap-2 p-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <span className="text-primary">+</span>
                        <span className="text-gray-700 dark:text-gray-300">{segment.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Segments */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              My Segments
              {segmentsData && (
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({segmentsData.total} total)
                </span>
              )}
            </h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : segments.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No segments yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Create your first segment to start targeting customers
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleOpenChat}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-purple-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Try AI Builder
                </button>
                <button
                  onClick={handleCreateNew}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Create Manually
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {segments.map((segment) => (
                <SegmentCard
                  key={segment.id}
                  segment={segment}
                  isSelected={selectedSegment?.id === segment.id}
                  onClick={() => handleSelectSegment(segment)}
                  onEdit={() => handleEditSegment(segment)}
                  onDuplicate={() => handleDuplicateSegment(segment)}
                  onDelete={() => handleDeleteSegment(segment)}
                  onViewMembers={() => handleSelectSegment(segment)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
