import { useState } from "react";
import { Button } from "@/components/ui/Button.tsx";
import { Select } from "@/components/ui/Select.tsx";
import { Textarea } from "@/components/ui/Textarea.tsx";
import { Label } from "@/components/ui/Label.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { useDispositions, useLogDisposition } from "../api.ts";
import { DISPOSITION_CATEGORY_LABELS } from "../types.ts";

interface CallDispositionModalProps {
  open: boolean;
  onClose: () => void;
  callId: string;
  phoneNumber?: string;
}

/**
 * Post-call outcome selection modal
 * Allows user to log call disposition after completing a call
 */
export function CallDispositionModal({
  open,
  onClose,
  callId,
  phoneNumber,
}: CallDispositionModalProps) {
  const [selectedDispositionId, setSelectedDispositionId] = useState("");
  const [notes, setNotes] = useState("");

  const { data: dispositions, isLoading: dispositionsLoading } =
    useDispositions();
  const logMutation = useLogDisposition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDispositionId) return;

    try {
      await logMutation.mutateAsync({
        call_id: callId,
        disposition_id: selectedDispositionId,
        notes: notes.trim() || undefined,
      });
      setSelectedDispositionId("");
      setNotes("");
      onClose();
    } catch (error) {
      console.error("Failed to log disposition:", error);
    }
  };

  const handleSkip = () => {
    setSelectedDispositionId("");
    setNotes("");
    onClose();
  };

  if (!open) return null;

  const selectedDisposition = dispositions?.find(
    (d) => d.id === selectedDispositionId,
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-bg-card rounded-lg shadow-xl p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text-primary">
            Call Disposition
          </h2>
          <button
            onClick={handleSkip}
            className="text-text-secondary hover:text-text-primary text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {phoneNumber && (
          <p className="text-sm text-text-secondary mb-4">
            Call to:{" "}
            <span className="font-mono font-medium">{phoneNumber}</span>
          </p>
        )}

        <form onSubmit={handleSubmit}>
          {/* Disposition Selection */}
          <div className="mb-4">
            <Label htmlFor="disposition">Call Outcome</Label>
            <Select
              id="disposition"
              value={selectedDispositionId}
              onChange={(e) => setSelectedDispositionId(e.target.value)}
              disabled={dispositionsLoading}
            >
              <option value="">Select outcome...</option>
              {dispositions?.map((disposition) => (
                <option key={disposition.id} value={disposition.id}>
                  {disposition.name}
                </option>
              ))}
            </Select>
            {selectedDisposition && (
              <div className="mt-2">
                <Badge
                  variant={
                    selectedDisposition.category === "positive"
                      ? "success"
                      : selectedDisposition.category === "negative"
                        ? "danger"
                        : "default"
                  }
                >
                  {DISPOSITION_CATEGORY_LABELS[selectedDisposition.category]}
                </Badge>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="mb-4">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this call..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleSkip}
              className="flex-1"
            >
              Skip
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!selectedDispositionId || logMutation.isPending}
            >
              {logMutation.isPending ? "Saving..." : "Save Disposition"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
