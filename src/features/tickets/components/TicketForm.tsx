import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Select } from "@/components/ui/Select.tsx";
import { Textarea } from "@/components/ui/Textarea.tsx";
import { Label } from "@/components/ui/Label.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import {
  ticketFormSchema,
  type TicketFormData,
  type Ticket,
  TICKET_TYPE_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
} from "@/api/types/ticket.ts";
import { RICEScoring } from "./RICEScoring.tsx";
import { useTechnicians } from "@/api/hooks/useTechnicians.ts";

export interface TicketFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TicketFormData) => Promise<void>;
  ticket?: Ticket | null;
  isLoading?: boolean;
}

/**
 * Ticket create/edit form modal
 */
export function TicketForm({
  open,
  onClose,
  onSubmit,
  ticket,
  isLoading,
}: TicketFormProps) {
  const isEdit = !!ticket;

  // Fetch technicians for assignment dropdown
  const { data: techniciansData } = useTechnicians({
    page: 1,
    page_size: 100,
    active_only: true,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: ticket
      ? {
          title: ticket.title,
          description: ticket.description,
          type: ticket.type,
          status: ticket.status,
          priority: ticket.priority,
          reach: ticket.reach || undefined,
          impact: ticket.impact || undefined,
          confidence: ticket.confidence || undefined,
          effort: ticket.effort || undefined,
          assigned_to: ticket.assigned_to || "",
        }
      : {
          title: "",
          description: "",
          type: "task",
          status: "open",
          priority: "medium",
          reach: undefined,
          impact: undefined,
          confidence: undefined,
          effort: undefined,
          assigned_to: "",
        },
  });

  const reach = watch("reach");
  const impact = watch("impact");
  const confidence = watch("confidence");
  const effort = watch("effort");

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = async (data: TicketFormData) => {
    const cleanedData: TicketFormData = {
      ...data,
      reach: data.reach || undefined,
      impact: data.impact || undefined,
      confidence: data.confidence || undefined,
      effort: data.effort || undefined,
      assigned_to: data.assigned_to || undefined,
    };

    await onSubmit(cleanedData);
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} disableOverlayClose={isDirty}>
      <DialogContent size="lg">
        <DialogHeader onClose={handleClose}>
          {isEdit ? "Edit Ticket" : "Create New Ticket"}
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogBody className="space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Basic Info Section */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Ticket Details
              </h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" required>
                    Title
                  </Label>
                  <Input
                    id="title"
                    {...register("title")}
                    error={!!errors.title}
                    placeholder="Brief description of the issue or request"
                  />
                  {errors.title && (
                    <p className="text-sm text-danger">
                      {errors.title.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" required>
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    {...register("description")}
                    error={!!errors.description}
                    placeholder="Detailed description of the ticket..."
                    rows={4}
                  />
                  {errors.description && (
                    <p className="text-sm text-danger">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type" required>
                      Type
                    </Label>
                    <Select id="type" {...register("type")}>
                      {Object.entries(TICKET_TYPE_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status" required>
                      Status
                    </Label>
                    <Select id="status" {...register("status")}>
                      {Object.entries(TICKET_STATUS_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority" required>
                      Priority
                    </Label>
                    <Select id="priority" {...register("priority")}>
                      {Object.entries(TICKET_PRIORITY_LABELS).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assigned_to">Assigned To</Label>
                    <Select id="assigned_to" {...register("assigned_to")}>
                      <option value="">Unassigned</option>
                      {techniciansData?.items.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.first_name} {tech.last_name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* RICE Scoring Section */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                RICE Priority Scoring (Optional)
              </h4>
              <RICEScoring
                reach={reach}
                impact={impact}
                confidence={confidence}
                effort={effort}
                onReachChange={(value) => setValue("reach", value)}
                onImpactChange={(value) => setValue("impact", value)}
                onConfidenceChange={(value) => setValue("confidence", value)}
                onEffortChange={(value) => setValue("effort", value)}
                errors={errors}
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Create Ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
