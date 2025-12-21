import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQueryClient } from '@tanstack/react-query';
import { type Prospect } from '@/api/types/prospect.ts';
import {
  type ProspectStage,
  ProspectStage as Stages,
  PROSPECT_STAGE_LABELS,
  LEAD_SOURCE_LABELS,
} from '@/api/types/common.ts';
import { useUpdateProspectStage, prospectKeys } from '@/api/hooks/useProspects.ts';

interface PipelineViewProps {
  prospects: Prospect[];
  onEdit?: (prospect: Prospect) => void;
}

// Pipeline stage configuration
const PIPELINE_STAGES: { stage: ProspectStage; color: string }[] = [
  { stage: Stages.NEW_LEAD, color: 'bg-gray-100 border-gray-300' },
  { stage: Stages.CONTACTED, color: 'bg-blue-50 border-blue-300' },
  { stage: Stages.QUALIFIED, color: 'bg-purple-50 border-purple-300' },
  { stage: Stages.QUOTED, color: 'bg-yellow-50 border-yellow-300' },
  { stage: Stages.NEGOTIATION, color: 'bg-orange-50 border-orange-300' },
  { stage: Stages.WON, color: 'bg-green-50 border-green-300' },
  { stage: Stages.LOST, color: 'bg-red-50 border-red-300' },
];

const STAGE_HEADER_COLORS: Record<ProspectStage, string> = {
  new_lead: 'bg-gray-500',
  contacted: 'bg-blue-500',
  qualified: 'bg-purple-500',
  quoted: 'bg-yellow-500',
  negotiation: 'bg-orange-500',
  won: 'bg-green-500',
  lost: 'bg-red-500',
};

/**
 * Draggable prospect card
 */
function ProspectCard({
  prospect,
  onEdit,
  isDragging,
}: {
  prospect: Prospect;
  onEdit?: (prospect: Prospect) => void;
  isDragging?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: prospect.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCurrentlyDragging = isDragging || isSortableDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        bg-white rounded-lg border border-border p-3 shadow-sm cursor-grab active:cursor-grabbing
        hover:shadow-md transition-shadow
        ${isCurrentlyDragging ? 'opacity-50 shadow-lg ring-2 ring-primary' : ''}
      `}
    >
      {/* Header with name and value */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link
          to={`/app/prospects/${prospect.id}`}
          className="font-medium text-text-primary hover:text-primary text-sm line-clamp-1"
          onClick={(e) => e.stopPropagation()}
        >
          {prospect.first_name} {prospect.last_name}
        </Link>
        {prospect.estimated_value && (
          <span className="text-xs font-semibold text-green-600 whitespace-nowrap">
            ${prospect.estimated_value.toLocaleString()}
          </span>
        )}
      </div>

      {/* Company */}
      {prospect.company_name && (
        <p className="text-xs text-text-secondary mb-2 line-clamp-1">
          {prospect.company_name}
        </p>
      )}

      {/* Contact info */}
      <div className="space-y-1 mb-2">
        {prospect.phone && (
          <p className="text-xs text-text-muted flex items-center gap-1">
            <span>📞</span> {prospect.phone}
          </p>
        )}
        {prospect.email && (
          <p className="text-xs text-text-muted flex items-center gap-1 truncate">
            <span>✉️</span> {prospect.email}
          </p>
        )}
      </div>

      {/* Footer: source and follow-up */}
      <div className="flex items-center justify-between text-xs">
        {prospect.lead_source && (
          <span className="px-1.5 py-0.5 bg-bg-subtle rounded text-text-muted">
            {LEAD_SOURCE_LABELS[prospect.lead_source]}
          </span>
        )}
        {prospect.next_follow_up_date && (
          <span className="text-text-muted">
            📅 {new Date(prospect.next_follow_up_date).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Quick actions */}
      <div className="mt-2 pt-2 border-t border-border flex gap-2">
        <Link
          to={`/app/prospects/${prospect.id}`}
          className="flex-1 text-center text-xs py-1 rounded bg-bg-subtle hover:bg-bg-hover text-text-secondary"
          onClick={(e) => e.stopPropagation()}
        >
          View
        </Link>
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(prospect);
            }}
            className="flex-1 text-center text-xs py-1 rounded bg-bg-subtle hover:bg-bg-hover text-text-secondary"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Overlay card shown while dragging
 */
function DragOverlayCard({ prospect }: { prospect: Prospect }) {
  return (
    <div className="bg-white rounded-lg border-2 border-primary p-3 shadow-xl cursor-grabbing w-64">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-medium text-text-primary text-sm">
          {prospect.first_name} {prospect.last_name}
        </span>
        {prospect.estimated_value && (
          <span className="text-xs font-semibold text-green-600">
            ${prospect.estimated_value.toLocaleString()}
          </span>
        )}
      </div>
      {prospect.company_name && (
        <p className="text-xs text-text-secondary">{prospect.company_name}</p>
      )}
    </div>
  );
}

/**
 * Pipeline column for a stage
 */
function PipelineColumn({
  stage,
  color,
  prospects,
  onEdit,
}: {
  stage: ProspectStage;
  color: string;
  prospects: Prospect[];
  onEdit?: (prospect: Prospect) => void;
}) {
  const totalValue = prospects.reduce((sum, p) => sum + (p.estimated_value || 0), 0);

  return (
    <div className={`flex flex-col min-w-[280px] max-w-[280px] rounded-lg border ${color}`}>
      {/* Column header */}
      <div className={`${STAGE_HEADER_COLORS[stage]} text-white px-3 py-2 rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{PROSPECT_STAGE_LABELS[stage]}</h3>
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
            {prospects.length}
          </span>
        </div>
        {totalValue > 0 && (
          <p className="text-xs opacity-90 mt-1">
            ${totalValue.toLocaleString()} total
          </p>
        )}
      </div>

      {/* Cards container - droppable area */}
      <div
        className="flex-1 p-2 space-y-2 min-h-[200px] overflow-y-auto"
        data-stage={stage}
      >
        {prospects.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-muted text-sm">
            Drop prospects here
          </div>
        ) : (
          prospects.map((prospect) => (
            <ProspectCard key={prospect.id} prospect={prospect} onEdit={onEdit} />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Main Pipeline/Kanban view component
 */
export function PipelineView({ prospects, onEdit }: PipelineViewProps) {
  const [activeProspect, setActiveProspect] = useState<Prospect | null>(null);
  const queryClient = useQueryClient();
  const updateStage = useUpdateProspectStage();

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Start dragging after 8px movement
      },
    })
  );

  // Group prospects by stage
  const prospectsByStage = useMemo(() => {
    const grouped: Record<ProspectStage, Prospect[]> = {
      new_lead: [],
      contacted: [],
      qualified: [],
      quoted: [],
      negotiation: [],
      won: [],
      lost: [],
    };

    prospects.forEach((prospect) => {
      const stage = prospect.prospect_stage as ProspectStage;
      if (grouped[stage]) {
        grouped[stage].push(prospect);
      }
    });

    // Sort by estimated value descending within each stage
    Object.keys(grouped).forEach((stage) => {
      grouped[stage as ProspectStage].sort(
        (a, b) => (b.estimated_value || 0) - (a.estimated_value || 0)
      );
    });

    return grouped;
  }, [prospects]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const prospect = prospects.find((p) => p.id === active.id);
    setActiveProspect(prospect || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProspect(null);

    if (!over) return;

    // Get the stage from the closest column
    let targetStage: ProspectStage | null = null;

    // Check if we dropped on another card
    const droppedOnProspect = prospects.find((p) => p.id === over.id);
    if (droppedOnProspect) {
      targetStage = droppedOnProspect.prospect_stage as ProspectStage;
    } else {
      // Dropped on column itself
      targetStage = over.id as ProspectStage;
    }

    if (!targetStage || !PIPELINE_STAGES.some((s) => s.stage === targetStage)) {
      return;
    }

    const prospectId = active.id as string;
    const currentProspect = prospects.find((p) => p.id === prospectId);

    if (!currentProspect || currentProspect.prospect_stage === targetStage) {
      return;
    }

    // Optimistic update
    queryClient.setQueryData(
      prospectKeys.lists(),
      (oldData: { items: Prospect[] } | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          items: oldData.items.map((p: Prospect) =>
            p.id === prospectId ? { ...p, prospect_stage: targetStage } : p
          ),
        };
      }
    );

    // Perform the actual update
    updateStage.mutate(
      { id: prospectId, stage: targetStage },
      {
        onError: () => {
          // Rollback on error
          queryClient.invalidateQueries({ queryKey: prospectKeys.lists() });
        },
      }
    );
  };

  // Calculate totals
  const totalProspects = prospects.length;
  const totalValue = prospects.reduce((sum, p) => sum + (p.estimated_value || 0), 0);
  const wonValue = prospectsByStage.won.reduce((sum, p) => sum + (p.estimated_value || 0), 0);

  return (
    <div className="h-full flex flex-col">
      {/* Summary bar */}
      <div className="flex items-center gap-6 px-4 py-3 bg-bg-subtle border-b border-border">
        <div className="text-sm">
          <span className="text-text-muted">Total Prospects:</span>{' '}
          <span className="font-semibold text-text-primary">{totalProspects}</span>
        </div>
        <div className="text-sm">
          <span className="text-text-muted">Pipeline Value:</span>{' '}
          <span className="font-semibold text-text-primary">
            ${totalValue.toLocaleString()}
          </span>
        </div>
        <div className="text-sm">
          <span className="text-text-muted">Won Value:</span>{' '}
          <span className="font-semibold text-green-600">${wonValue.toLocaleString()}</span>
        </div>
      </div>

      {/* Pipeline columns */}
      <div className="flex-1 overflow-x-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full">
            {PIPELINE_STAGES.map(({ stage, color }) => (
              <PipelineColumn
                key={stage}
                stage={stage}
                color={color}
                prospects={prospectsByStage[stage]}
                onEdit={onEdit}
              />
            ))}
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeProspect ? <DragOverlayCard prospect={activeProspect} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
