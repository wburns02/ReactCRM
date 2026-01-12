/**
 * ChecklistMode - Step-by-step task checklist for work orders
 *
 * Features:
 * - Sequential task list
 * - Check off completed items
 * - Required items highlighted
 * - Progress bar
 * - Notes per item
 * - Works at 375px width minimum
 * - Large touch targets (44px min)
 */

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

// ============================================
// Types
// ============================================

export interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  required: boolean;
  completed: boolean;
  notes?: string;
  completedAt?: string;
  order: number;
  category?: string;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  description?: string;
  items: ChecklistItem[];
}

interface ChecklistModeProps {
  workOrderId: string;
  template: ChecklistTemplate;
  items: ChecklistItem[];
  onItemToggle: (itemId: string, completed: boolean) => Promise<void>;
  onItemNote: (itemId: string, note: string) => Promise<void>;
  onComplete?: () => void;
  isOffline?: boolean;
}

interface ChecklistItemProps {
  item: ChecklistItem;
  onToggle: () => Promise<void>;
  onAddNote: (note: string) => Promise<void>;
  isFirst: boolean;
  previousCompleted: boolean;
}

// ============================================
// Progress Header Component
// ============================================

interface ProgressHeaderProps {
  completed: number;
  total: number;
  requiredCompleted: number;
  requiredTotal: number;
}

function ProgressHeader({
  completed,
  total,
  requiredCompleted,
  requiredTotal,
}: ProgressHeaderProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allRequiredComplete = requiredCompleted >= requiredTotal;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-text-primary">
          {completed} of {total} completed
        </span>
        <span className="text-text-secondary">{percentage}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            allRequiredComplete ? "bg-success" : "bg-primary",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Required items status */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary">
          Required: {requiredCompleted}/{requiredTotal}
        </span>
        {allRequiredComplete ? (
          <Badge variant="success" size="sm">
            All required complete
          </Badge>
        ) : (
          <Badge variant="warning" size="sm">
            {requiredTotal - requiredCompleted} required remaining
          </Badge>
        )}
      </div>
    </div>
  );
}

// ============================================
// Checklist Item Component
// ============================================

function ChecklistItemRow({
  item,
  onToggle,
  onAddNote,
  isFirst,
  previousCompleted,
}: ChecklistItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [noteText, setNoteText] = useState(item.notes || "");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  // Can only toggle if it's the first item or previous is completed
  const canToggle = isFirst || previousCompleted || item.completed;

  const handleToggle = useCallback(async () => {
    if (!canToggle || isToggling) return;

    setIsToggling(true);
    try {
      await onToggle();
    } finally {
      setIsToggling(false);
    }
  }, [canToggle, isToggling, onToggle]);

  const handleSaveNote = useCallback(async () => {
    if (!noteText.trim() || isSavingNote) return;

    setIsSavingNote(true);
    try {
      await onAddNote(noteText.trim());
      setIsExpanded(false);
    } finally {
      setIsSavingNote(false);
    }
  }, [noteText, isSavingNote, onAddNote]);

  return (
    <div
      className={cn(
        "border-b border-border last:border-b-0",
        !canToggle && !item.completed && "opacity-50",
      )}
    >
      {/* Main row */}
      <div className="flex items-start gap-3 p-4">
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          disabled={!canToggle || isToggling}
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center min-h-[44px] min-w-[44px] touch-manipulation transition-colors",
            item.completed
              ? "bg-success border-success text-white"
              : canToggle
                ? "border-border hover:border-primary"
                : "border-border bg-bg-muted cursor-not-allowed",
          )}
          aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
        >
          {item.completed && (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
          {isToggling && (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p
                className={cn(
                  "font-medium",
                  item.completed
                    ? "text-text-secondary line-through"
                    : "text-text-primary",
                )}
              >
                {item.label}
              </p>
              {item.description && (
                <p className="text-sm text-text-secondary mt-0.5">
                  {item.description}
                </p>
              )}
            </div>
            {item.required && !item.completed && (
              <Badge variant="danger" size="sm">
                Required
              </Badge>
            )}
          </div>

          {/* Notes indicator */}
          {item.notes && !isExpanded && (
            <p className="text-sm text-text-secondary mt-2 italic">
              Note: {item.notes}
            </p>
          )}

          {/* Completed timestamp */}
          {item.completed && item.completedAt && (
            <p className="text-xs text-text-secondary mt-1">
              Completed {new Date(item.completedAt).toLocaleString()}
            </p>
          )}
        </div>

        {/* Expand button for notes */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 text-text-secondary hover:text-text-primary min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
          aria-label={isExpanded ? "Close notes" : "Add note"}
        >
          <svg
            className={cn(
              "w-5 h-5 transition-transform",
              isExpanded && "rotate-180",
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
      </div>

      {/* Expanded notes section */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0">
          <div className="ml-11 space-y-3">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add notes for this item..."
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm min-h-[80px]"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveNote}
                disabled={!noteText.trim() || isSavingNote}
                className="min-h-[44px] touch-manipulation"
              >
                {isSavingNote ? "Saving..." : "Save Note"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setNoteText(item.notes || "");
                  setIsExpanded(false);
                }}
                className="min-h-[44px] touch-manipulation"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Category Group Component
// ============================================

interface CategoryGroupProps {
  category: string;
  items: ChecklistItem[];
  onItemToggle: (itemId: string, completed: boolean) => Promise<void>;
  onItemNote: (itemId: string, note: string) => Promise<void>;
  allItems: ChecklistItem[];
}

function CategoryGroup({
  category,
  items,
  onItemToggle,
  onItemNote,
  allItems,
}: CategoryGroupProps) {
  const completedCount = items.filter((i) => i.completed).length;
  const isAllComplete = completedCount === items.length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3 bg-bg-muted">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{category}</CardTitle>
          <Badge variant={isAllComplete ? "success" : "default"} size="sm">
            {completedCount}/{items.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {items.map((item, _index) => {
          // Find previous item in full list to check if it's completed
          const globalIndex = allItems.findIndex((i) => i.id === item.id);
          const previousItem =
            globalIndex > 0 ? allItems[globalIndex - 1] : null;
          const previousCompleted = previousItem
            ? previousItem.completed
            : true;

          return (
            <ChecklistItemRow
              key={item.id}
              item={item}
              onToggle={() => onItemToggle(item.id, !item.completed)}
              onAddNote={(note) => onItemNote(item.id, note)}
              isFirst={globalIndex === 0}
              previousCompleted={previousCompleted}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

// ============================================
// Main Component
// ============================================

export function ChecklistMode({
  workOrderId: _workOrderId,
  template,
  items,
  onItemToggle,
  onItemNote,
  onComplete,
  isOffline = false,
}: ChecklistModeProps) {
  // Sort items by order
  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.order - b.order),
    [items],
  );

  // Group by category if categories exist
  const categorizedItems = useMemo(() => {
    const categories = new Map<string, ChecklistItem[]>();
    const uncategorized: ChecklistItem[] = [];

    sortedItems.forEach((item) => {
      if (item.category) {
        const existing = categories.get(item.category) || [];
        categories.set(item.category, [...existing, item]);
      } else {
        uncategorized.push(item);
      }
    });

    return { categories, uncategorized };
  }, [sortedItems]);

  // Calculate progress
  const totalItems = items.length;
  const completedItems = items.filter((i) => i.completed).length;
  const requiredItems = items.filter((i) => i.required);
  const completedRequired = requiredItems.filter((i) => i.completed).length;

  // Check if all required are complete
  const canComplete = completedRequired >= requiredItems.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{template.name}</CardTitle>
            {isOffline && (
              <Badge variant="warning" size="sm">
                Offline
              </Badge>
            )}
          </div>
          {template.description && (
            <p className="text-sm text-text-secondary mt-1">
              {template.description}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <ProgressHeader
            completed={completedItems}
            total={totalItems}
            requiredCompleted={completedRequired}
            requiredTotal={requiredItems.length}
          />
        </CardContent>
      </Card>

      {/* Categorized Items */}
      {Array.from(categorizedItems.categories.entries()).map(
        ([category, categoryItems]) => (
          <CategoryGroup
            key={category}
            category={category}
            items={categoryItems}
            onItemToggle={onItemToggle}
            onItemNote={onItemNote}
            allItems={sortedItems}
          />
        ),
      )}

      {/* Uncategorized Items */}
      {categorizedItems.uncategorized.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="py-3 bg-bg-muted">
            <CardTitle className="text-base">Tasks</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {categorizedItems.uncategorized.map((item, _index) => {
              const globalIndex = sortedItems.findIndex(
                (i) => i.id === item.id,
              );
              const previousItem =
                globalIndex > 0 ? sortedItems[globalIndex - 1] : null;
              const previousCompleted = previousItem
                ? previousItem.completed
                : true;

              return (
                <ChecklistItemRow
                  key={item.id}
                  item={item}
                  onToggle={() => onItemToggle(item.id, !item.completed)}
                  onAddNote={(note) => onItemNote(item.id, note)}
                  isFirst={globalIndex === 0}
                  previousCompleted={previousCompleted}
                />
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Complete Button */}
      {onComplete && (
        <Button
          variant={canComplete ? "primary" : "secondary"}
          size="lg"
          onClick={onComplete}
          disabled={!canComplete}
          className={cn(
            "w-full min-h-[56px] touch-manipulation text-base font-semibold",
            canComplete && "bg-success hover:bg-success/90",
          )}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>Complete Checklist</span>
        </Button>
      )}

      {!canComplete && onComplete && (
        <p className="text-center text-sm text-text-secondary">
          Complete all required items to finish
        </p>
      )}
    </div>
  );
}

// ============================================
// Default Checklist Templates
// ============================================

export const DEFAULT_CHECKLIST_TEMPLATES: Record<string, ChecklistTemplate> = {
  pumping: {
    id: "pumping-standard",
    name: "Septic Pumping Checklist",
    description: "Standard checklist for septic tank pumping service",
    items: [
      {
        id: "1",
        label: "Locate septic tank",
        required: true,
        completed: false,
        order: 1,
        category: "Preparation",
      },
      {
        id: "2",
        label: "Expose tank lid(s)",
        required: true,
        completed: false,
        order: 2,
        category: "Preparation",
      },
      {
        id: "3",
        label: "Take before photos",
        required: true,
        completed: false,
        order: 3,
        category: "Documentation",
      },
      {
        id: "4",
        label: "Inspect tank condition",
        required: true,
        completed: false,
        order: 4,
        category: "Inspection",
      },
      {
        id: "5",
        label: "Check baffles",
        required: true,
        completed: false,
        order: 5,
        category: "Inspection",
      },
      {
        id: "6",
        label: "Pump tank",
        required: true,
        completed: false,
        order: 6,
        category: "Service",
      },
      {
        id: "7",
        label: "Backflush if needed",
        required: false,
        completed: false,
        order: 7,
        category: "Service",
      },
      {
        id: "8",
        label: "Take after photos",
        required: true,
        completed: false,
        order: 8,
        category: "Documentation",
      },
      {
        id: "9",
        label: "Replace lid(s)",
        required: true,
        completed: false,
        order: 9,
        category: "Completion",
      },
      {
        id: "10",
        label: "Clean work area",
        required: true,
        completed: false,
        order: 10,
        category: "Completion",
      },
      {
        id: "11",
        label: "Get customer signature",
        required: true,
        completed: false,
        order: 11,
        category: "Completion",
      },
    ],
  },
  inspection: {
    id: "inspection-standard",
    name: "Septic Inspection Checklist",
    description: "Standard checklist for septic system inspection",
    items: [
      {
        id: "1",
        label: "Locate system components",
        required: true,
        completed: false,
        order: 1,
        category: "Site Survey",
      },
      {
        id: "2",
        label: "Check for surface issues",
        required: true,
        completed: false,
        order: 2,
        category: "Site Survey",
      },
      {
        id: "3",
        label: "Inspect tank access",
        required: true,
        completed: false,
        order: 3,
        category: "Tank Inspection",
      },
      {
        id: "4",
        label: "Measure sludge level",
        required: true,
        completed: false,
        order: 4,
        category: "Tank Inspection",
      },
      {
        id: "5",
        label: "Measure scum level",
        required: true,
        completed: false,
        order: 5,
        category: "Tank Inspection",
      },
      {
        id: "6",
        label: "Check inlet baffle",
        required: true,
        completed: false,
        order: 6,
        category: "Tank Inspection",
      },
      {
        id: "7",
        label: "Check outlet baffle",
        required: true,
        completed: false,
        order: 7,
        category: "Tank Inspection",
      },
      {
        id: "8",
        label: "Inspect distribution box",
        required: false,
        completed: false,
        order: 8,
        category: "Drain Field",
      },
      {
        id: "9",
        label: "Check drain field condition",
        required: true,
        completed: false,
        order: 9,
        category: "Drain Field",
      },
      {
        id: "10",
        label: "Document findings",
        required: true,
        completed: false,
        order: 10,
        category: "Documentation",
      },
      {
        id: "11",
        label: "Take photos",
        required: true,
        completed: false,
        order: 11,
        category: "Documentation",
      },
      {
        id: "12",
        label: "Discuss findings with customer",
        required: true,
        completed: false,
        order: 12,
        category: "Completion",
      },
    ],
  },
};

export default ChecklistMode;
