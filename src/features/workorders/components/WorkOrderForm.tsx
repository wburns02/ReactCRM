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
  workOrderFormSchema,
  type WorkOrderFormData,
  type WorkOrder,
  WORK_ORDER_STATUS_LABELS,
  JOB_TYPE_LABELS,
  PRIORITY_LABELS,
  type WorkOrderStatus,
  type JobType,
  type Priority,
} from "@/api/types/workOrder.ts";
import { useCustomers } from "@/api/hooks/useCustomers.ts";
import { useTechnicians } from "@/api/hooks/useTechnicians.ts";

export interface WorkOrderFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: WorkOrderFormData) => Promise<void>;
  workOrder?: WorkOrder | null;
  isLoading?: boolean;
}

/**
 * Work Order create/edit form modal
 */
export function WorkOrderForm({
  open,
  onClose,
  onSubmit,
  workOrder,
  isLoading,
}: WorkOrderFormProps) {
  const isEdit = !!workOrder;

  // Fetch customers and technicians for dropdowns
  const { data: customersData } = useCustomers({ page: 1, page_size: 200 });
  const { data: techniciansData } = useTechnicians({
    page: 1,
    page_size: 100,
    active_only: true,
  });

  const customers = customersData?.items || [];
  const technicians = techniciansData?.items || [];

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<WorkOrderFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(workOrderFormSchema) as any,
    defaultValues: workOrder
      ? {
          customer_id: Number(workOrder.customer_id),
          job_type: workOrder.job_type as JobType,
          status: workOrder.status as WorkOrderStatus,
          priority: workOrder.priority as Priority,
          scheduled_date: workOrder.scheduled_date || "",
          time_window_start: workOrder.time_window_start?.slice(0, 5) || "",
          time_window_end: workOrder.time_window_end?.slice(0, 5) || "",
          estimated_duration_hours:
            workOrder.estimated_duration_hours || undefined,
          assigned_technician: workOrder.assigned_technician || "",
          assigned_vehicle: workOrder.assigned_vehicle || "",
          service_address_line1: workOrder.service_address_line1 || "",
          service_address_line2: workOrder.service_address_line2 || "",
          service_city: workOrder.service_city || "",
          service_state: workOrder.service_state || "",
          service_postal_code: workOrder.service_postal_code || "",
          notes: workOrder.notes || "",
        }
      : {
          customer_id: 0,
          job_type: "pumping" as JobType,
          status: "draft" as WorkOrderStatus,
          priority: "normal" as Priority,
          scheduled_date: "",
          time_window_start: "",
          time_window_end: "",
          estimated_duration_hours: 2,
          assigned_technician: "",
          assigned_vehicle: "",
          service_address_line1: "",
          service_address_line2: "",
          service_city: "",
          service_state: "",
          service_postal_code: "",
          notes: "",
        },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = async (data: WorkOrderFormData) => {
    // Clean up empty strings to undefined
    const cleanedData: WorkOrderFormData = {
      ...data,
      scheduled_date: data.scheduled_date || undefined,
      time_window_start: data.time_window_start || undefined,
      time_window_end: data.time_window_end || undefined,
      estimated_duration_hours: data.estimated_duration_hours || undefined,
      assigned_technician: data.assigned_technician || undefined,
      assigned_vehicle: data.assigned_vehicle || undefined,
      service_address_line1: data.service_address_line1 || undefined,
      service_address_line2: data.service_address_line2 || undefined,
      service_city: data.service_city || undefined,
      service_state: data.service_state || undefined,
      service_postal_code: data.service_postal_code || undefined,
      notes: data.notes || undefined,
    };

    await onSubmit(cleanedData);
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} disableOverlayClose={isDirty}>
      <DialogContent size="lg">
        <DialogHeader onClose={handleClose}>
          {isEdit ? "Edit Work Order" : "Create Work Order"}
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogBody className="space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Customer & Job Type */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Job Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_id" required>
                    Customer
                  </Label>
                  <Select
                    id="customer_id"
                    {...register("customer_id")}
                    disabled={isEdit}
                  >
                    <option value="">Select customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}
                      </option>
                    ))}
                  </Select>
                  {errors.customer_id && (
                    <p className="text-sm text-danger">
                      {errors.customer_id.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="job_type" required>
                    Job Type
                  </Label>
                  <Select id="job_type" {...register("job_type")}>
                    {(
                      Object.entries(JOB_TYPE_LABELS) as [JobType, string][]
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select id="status" {...register("status")}>
                    {(
                      Object.entries(WORK_ORDER_STATUS_LABELS) as [
                        WorkOrderStatus,
                        string,
                      ][]
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select id="priority" {...register("priority")}>
                    {(
                      Object.entries(PRIORITY_LABELS) as [Priority, string][]
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            {/* Scheduling */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Scheduling
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduled_date">Date</Label>
                  <Input
                    id="scheduled_date"
                    type="date"
                    {...register("scheduled_date")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimated_duration_hours">
                    Duration (hours)
                  </Label>
                  <Input
                    id="estimated_duration_hours"
                    type="number"
                    min="0"
                    step="0.5"
                    {...register("estimated_duration_hours")}
                    placeholder="2"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time_window_start">Start Time</Label>
                  <Input
                    id="time_window_start"
                    type="time"
                    {...register("time_window_start")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time_window_end">End Time</Label>
                  <Input
                    id="time_window_end"
                    type="time"
                    {...register("time_window_end")}
                  />
                </div>
              </div>
            </div>

            {/* Assignment */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Assignment
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assigned_technician">Technician</Label>
                  <Select
                    id="assigned_technician"
                    {...register("assigned_technician")}
                  >
                    <option value="">Select technician...</option>
                    {technicians.map((t) => (
                      <option
                        key={t.id}
                        value={`${t.first_name} ${t.last_name}`}
                      >
                        {t.first_name} {t.last_name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigned_vehicle">Vehicle</Label>
                  <Input
                    id="assigned_vehicle"
                    {...register("assigned_vehicle")}
                    placeholder="Truck #1"
                  />
                </div>
              </div>
            </div>

            {/* Service Address */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Service Address
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="service_address_line1">Street Address</Label>
                  <Input
                    id="service_address_line1"
                    {...register("service_address_line1")}
                    placeholder="123 Main St"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="service_address_line2">Address Line 2</Label>
                  <Input
                    id="service_address_line2"
                    {...register("service_address_line2")}
                    placeholder="Apt 4B"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service_city">City</Label>
                  <Input
                    id="service_city"
                    {...register("service_city")}
                    placeholder="Tampa"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="service_state">State</Label>
                    <Input
                      id="service_state"
                      {...register("service_state")}
                      placeholder="FL"
                      maxLength={2}
                    />
                    {errors.service_state && (
                      <p className="text-sm text-danger">
                        {errors.service_state.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="service_postal_code">ZIP Code</Label>
                    <Input
                      id="service_postal_code"
                      {...register("service_postal_code")}
                      placeholder="33601"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Notes
              </h4>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Additional notes about this work order..."
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
                  : "Create Work Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
