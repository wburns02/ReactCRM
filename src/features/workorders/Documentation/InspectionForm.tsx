/**
 * InspectionForm Component
 *
 * Dynamic checklist/inspection form for work order documentation.
 * Features:
 * - Render items based on InspectionItem[]
 * - Support checkbox, text, number, select, photo types
 * - Group by category
 * - Validation for required fields
 * - Save progress (works offline)
 */
import { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils";
import type {
  InspectionItem,
  InspectionForm as InspectionFormType,
  PhotoType,
} from "@/api/types/workOrder";

export interface InspectionFormProps {
  form: InspectionFormType;
  onUpdate: (items: InspectionItem[]) => void;
  onComplete?: () => void;
  onCapturePhoto?: (itemId: string, photoType: PhotoType) => void;
  className?: string;
  readOnly?: boolean;
}

interface ValidationErrors {
  [itemId: string]: string;
}

export function InspectionForm({
  form,
  onUpdate,
  onComplete,
  onCapturePhoto,
  className,
  readOnly = false,
}: InspectionFormProps) {
  const [items, setItems] = useState<InspectionItem[]>(form.items);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  // Sync items when form prop changes
  useEffect(() => {
    setItems(form.items);
  }, [form.items]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups = new Map<string, InspectionItem[]>();

    items.forEach((item) => {
      const category = item.category || "General";
      const existing = groups.get(category) || [];
      groups.set(category, [...existing, item]);
    });

    return groups;
  }, [items]);

  // Calculate progress
  const progress = useMemo(() => {
    const requiredItems = items.filter((item) => item.required);
    const completedRequired = requiredItems.filter((item) => {
      if (item.type === "checkbox") return item.value === true;
      if (item.type === "photo") return !!item.value;
      return (
        item.value !== undefined && item.value !== null && item.value !== ""
      );
    });

    const total = items.length;
    const completed = items.filter((item) => {
      if (item.type === "checkbox") return item.value === true;
      if (item.type === "photo") return !!item.value;
      return (
        item.value !== undefined && item.value !== null && item.value !== ""
      );
    }).length;

    return {
      required: requiredItems.length,
      completedRequired: completedRequired.length,
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      isComplete: completedRequired.length >= requiredItems.length,
    };
  }, [items]);

  // Initialize expanded categories
  useEffect(() => {
    setExpandedCategories(new Set(groupedItems.keys()));
  }, [groupedItems]);

  /**
   * Update an item's value
   */
  const handleItemChange = useCallback(
    (itemId: string, value: unknown) => {
      setItems((prev) => {
        const updated = prev.map((item) =>
          item.id === itemId ? { ...item, value } : item,
        );
        onUpdate(updated);
        return updated;
      });

      // Clear error for this item
      setErrors((prev) => {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      });
    },
    [onUpdate],
  );

  /**
   * Update an item's notes
   */
  const handleNotesChange = useCallback(
    (itemId: string, notes: string) => {
      setItems((prev) => {
        const updated = prev.map((item) =>
          item.id === itemId ? { ...item, notes } : item,
        );
        onUpdate(updated);
        return updated;
      });
    },
    [onUpdate],
  );

  /**
   * Toggle category expansion
   */
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  /**
   * Validate all required fields
   */
  const validate = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};

    items.forEach((item) => {
      if (item.required) {
        const isEmpty =
          item.value === undefined ||
          item.value === null ||
          item.value === "" ||
          (item.type === "checkbox" && item.value !== true);

        if (isEmpty) {
          newErrors[item.id] = `${item.label} is required`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [items]);

  /**
   * Handle form completion
   */
  const handleComplete = useCallback(() => {
    if (validate() && onComplete) {
      onComplete();
    }
  }, [validate, onComplete]);

  /**
   * Get category progress
   */
  const getCategoryProgress = useCallback((categoryItems: InspectionItem[]) => {
    const completed = categoryItems.filter((item) => {
      if (item.type === "checkbox") return item.value === true;
      if (item.type === "photo") return !!item.value;
      return (
        item.value !== undefined && item.value !== null && item.value !== ""
      );
    }).length;

    return {
      completed,
      total: categoryItems.length,
      percentage:
        categoryItems.length > 0
          ? Math.round((completed / categoryItems.length) * 100)
          : 0,
    };
  }, []);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">
              {form.templateName}
            </h3>
            <p className="text-sm text-text-muted">
              {progress.completed}/{progress.total} items completed
              {progress.required > 0 &&
                ` (${progress.completedRequired}/${progress.required} required)`}
            </p>
          </div>
          <Badge variant={progress.isComplete ? "success" : "warning"}>
            {progress.percentage}%
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-300",
              progress.isComplete ? "bg-success" : "bg-primary",
            )}
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {Array.from(groupedItems.entries()).map(([category, categoryItems]) => {
          const isExpanded = expandedCategories.has(category);
          const categoryProgress = getCategoryProgress(categoryItems);

          return (
            <div
              key={category}
              className="border border-border rounded-lg overflow-hidden"
            >
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-4 bg-bg-hover/50 hover:bg-bg-hover transition-colors"
              >
                <div className="flex items-center gap-3">
                  <svg
                    className={cn(
                      "w-5 h-5 text-text-muted transition-transform",
                      isExpanded && "rotate-90",
                    )}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <span className="font-medium text-text-primary">
                    {category}
                  </span>
                  <Badge variant="outline" size="sm">
                    {categoryProgress.completed}/{categoryProgress.total}
                  </Badge>
                </div>

                {/* Mini progress bar */}
                <div className="w-20 h-1.5 bg-bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full",
                      categoryProgress.percentage === 100
                        ? "bg-success"
                        : "bg-primary",
                    )}
                    style={{ width: `${categoryProgress.percentage}%` }}
                  />
                </div>
              </button>

              {/* Category items */}
              {isExpanded && (
                <div className="divide-y divide-border">
                  {categoryItems.map((item) => (
                    <InspectionFormItem
                      key={item.id}
                      item={item}
                      error={errors[item.id]}
                      onChange={(value) => handleItemChange(item.id, value)}
                      onNotesChange={(notes) =>
                        handleNotesChange(item.id, notes)
                      }
                      onCapturePhoto={
                        onCapturePhoto
                          ? () => onCapturePhoto(item.id, "other")
                          : undefined
                      }
                      readOnly={readOnly}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Error summary */}
      {Object.keys(errors).length > 0 && (
        <div className="p-4 bg-danger-light rounded-lg">
          <p className="text-sm font-medium text-danger">
            Please complete all required fields:
          </p>
          <ul className="mt-2 text-sm text-danger list-disc list-inside">
            {Object.values(errors).map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Complete button */}
      {!readOnly && onComplete && (
        <Button
          onClick={handleComplete}
          disabled={!progress.isComplete}
          className="w-full"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Complete Inspection
        </Button>
      )}
    </div>
  );
}

/**
 * Individual inspection item component
 */
interface InspectionFormItemProps {
  item: InspectionItem;
  error?: string;
  onChange: (value: unknown) => void;
  onNotesChange: (notes: string) => void;
  onCapturePhoto?: () => void;
  readOnly?: boolean;
}

function InspectionFormItem({
  item,
  error,
  onChange,
  onNotesChange,
  onCapturePhoto,
  readOnly = false,
}: InspectionFormItemProps) {
  const [showNotes, setShowNotes] = useState(!!item.notes);

  return (
    <div className={cn("p-4", error && "bg-danger-light/30")}>
      <div className="space-y-3">
        {/* Main input based on type */}
        {item.type === "checkbox" && (
          <Checkbox
            checked={item.value === true}
            onChange={(e) => onChange(e.target.checked)}
            label={item.label}
            description={item.required ? "Required" : undefined}
            disabled={readOnly}
            error={!!error}
          />
        )}

        {item.type === "text" && (
          <div className="space-y-2">
            <Label>
              {item.label}
              {item.required && <span className="text-danger ml-1">*</span>}
            </Label>
            <Input
              type="text"
              value={(item.value as string) || ""}
              onChange={(e) => onChange(e.target.value)}
              disabled={readOnly}
              error={!!error}
            />
          </div>
        )}

        {item.type === "number" && (
          <div className="space-y-2">
            <Label>
              {item.label}
              {item.required && <span className="text-danger ml-1">*</span>}
            </Label>
            <Input
              type="number"
              value={(item.value as number) ?? ""}
              onChange={(e) =>
                onChange(e.target.value ? Number(e.target.value) : undefined)
              }
              disabled={readOnly}
              error={!!error}
            />
          </div>
        )}

        {item.type === "select" && item.options && (
          <div className="space-y-2">
            <Label>
              {item.label}
              {item.required && <span className="text-danger ml-1">*</span>}
            </Label>
            <select
              value={(item.value as string) || ""}
              onChange={(e) => onChange(e.target.value || undefined)}
              disabled={readOnly}
              className={cn(
                "w-full h-10 px-3 rounded-md border bg-bg-card text-sm",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                error ? "border-danger" : "border-border",
              )}
            >
              <option value="">Select an option</option>
              {item.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}

        {item.type === "photo" && (
          <div className="space-y-2">
            <Label>
              {item.label}
              {item.required && <span className="text-danger ml-1">*</span>}
            </Label>

            {item.value ? (
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded border border-border overflow-hidden">
                  <img
                    src={item.value as string}
                    alt={item.label}
                    className="w-full h-full object-cover"
                  />
                </div>
                <Badge variant="success">Photo captured</Badge>
                {!readOnly && (
                  <Button variant="ghost" size="sm" onClick={onCapturePhoto}>
                    Retake
                  </Button>
                )}
              </div>
            ) : (
              <Button
                variant="secondary"
                onClick={onCapturePhoto}
                disabled={readOnly || !onCapturePhoto}
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Capture Photo
              </Button>
            )}
          </div>
        )}

        {/* Error message */}
        {error && <p className="text-sm text-danger">{error}</p>}

        {/* Notes toggle and input */}
        {!readOnly && (
          <div>
            {!showNotes ? (
              <button
                onClick={() => setShowNotes(true)}
                className="text-sm text-primary hover:underline"
              >
                + Add notes
              </button>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs text-text-muted">Notes</Label>
                <Textarea
                  value={item.notes || ""}
                  onChange={(e) => onNotesChange(e.target.value)}
                  placeholder="Add any additional notes..."
                  className="min-h-[60px] text-sm"
                />
              </div>
            )}
          </div>
        )}

        {/* Display notes in read-only mode */}
        {readOnly && item.notes && (
          <div className="text-sm text-text-muted bg-bg-muted p-2 rounded">
            <span className="font-medium">Notes:</span> {item.notes}
          </div>
        )}
      </div>
    </div>
  );
}

export default InspectionForm;
