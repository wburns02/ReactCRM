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
  equipmentFormSchema,
  type EquipmentFormData,
  type Equipment,
  EQUIPMENT_STATUS_LABELS,
} from "@/api/types/equipment.ts";
import { useTechnicians } from "@/api/hooks/useTechnicians.ts";

export interface EquipmentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: EquipmentFormData) => Promise<void>;
  equipment?: Equipment | null;
  isLoading?: boolean;
}

const EQUIPMENT_TYPES = [
  "Pump Truck",
  "Jetter Truck",
  "Vacuum Truck",
  "Camera Equipment",
  "Portable Pump",
  "Generator",
  "Power Tools",
  "Safety Equipment",
  "Other",
];

/**
 * Equipment create/edit form modal
 */
export function EquipmentForm({
  open,
  onClose,
  onSubmit,
  equipment,
  isLoading,
}: EquipmentFormProps) {
  const isEdit = !!equipment;

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
  } = useForm<EquipmentFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(equipmentFormSchema) as any,
    defaultValues: equipment
      ? {
          name: equipment.name,
          type: equipment.type,
          serial_number: equipment.serial_number || "",
          status: equipment.status,
          assigned_to: equipment.assigned_to || "",
          last_maintenance: equipment.last_maintenance || "",
          next_maintenance: equipment.next_maintenance || "",
          notes: equipment.notes || "",
        }
      : {
          name: "",
          type: "",
          serial_number: "",
          status: "available",
          assigned_to: "",
          last_maintenance: "",
          next_maintenance: "",
          notes: "",
        },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = async (data: EquipmentFormData) => {
    const cleanedData: EquipmentFormData = {
      ...data,
      serial_number: data.serial_number || undefined,
      assigned_to: data.assigned_to || undefined,
      last_maintenance: data.last_maintenance || undefined,
      next_maintenance: data.next_maintenance || undefined,
      notes: data.notes || undefined,
    };

    await onSubmit(cleanedData);
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} disableOverlayClose={isDirty}>
      <DialogContent size="md">
        <DialogHeader onClose={handleClose}>
          {isEdit ? "Edit Equipment" : "Add New Equipment"}
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogBody className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Basic Info Section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" required>
                  Equipment Name
                </Label>
                <Input
                  id="name"
                  {...register("name")}
                  error={!!errors.name}
                  placeholder="e.g., Truck #5 Pump"
                />
                {errors.name && (
                  <p className="text-sm text-danger">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="type" required>
                  Type
                </Label>
                <Select id="type" {...register("type")} error={!!errors.type}>
                  <option value="">Select type...</option>
                  {EQUIPMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
                {errors.type && (
                  <p className="text-sm text-danger">{errors.type.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="serial_number">Serial Number</Label>
                <Input
                  id="serial_number"
                  {...register("serial_number")}
                  placeholder="SN12345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" required>
                  Status
                </Label>
                <Select id="status" {...register("status")}>
                  {Object.entries(EQUIPMENT_STATUS_LABELS).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </Select>
              </div>
            </div>

            {/* Assignment Section */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Assignment
              </h4>
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

            {/* Maintenance Section */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Maintenance Schedule
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="last_maintenance">Last Maintenance</Label>
                  <Input
                    id="last_maintenance"
                    type="date"
                    {...register("last_maintenance")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="next_maintenance">Next Maintenance</Label>
                  <Input
                    id="next_maintenance"
                    type="date"
                    {...register("next_maintenance")}
                  />
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Notes
              </h4>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Additional notes about this equipment..."
                  rows={4}
                />
              </div>
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
                  : "Create Equipment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
