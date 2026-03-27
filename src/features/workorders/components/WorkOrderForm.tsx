import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { CustomerCombobox } from "@/components/ui/CustomerCombobox.tsx";
import { useTechnicians } from "@/api/hooks/useTechnicians.ts";
import { useDumpSites } from "@/api/hooks/useDumpSites.ts";
import { formatCurrency } from "@/lib/utils";

export interface WorkOrderFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: WorkOrderFormData) => Promise<void>;
  workOrder?: WorkOrder | null;
  isLoading?: boolean;
  /** Pre-select a customer when creating (not editing) */
  defaultCustomerId?: string;
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
  defaultCustomerId,
}: WorkOrderFormProps) {
  const isEdit = !!workOrder;
  const [showBillTo, setShowBillTo] = useState(
    !!(workOrder?.billing_customer_id && workOrder.billing_customer_id !== workOrder.customer_id)
  );

  // Fetch technicians and dump sites for dropdowns
  const { data: techniciansData } = useTechnicians({
    page: 1,
    page_size: 100,
    active_only: true,
  });
  const { data: dumpSites } = useDumpSites({ is_active: true });

  const technicians = techniciansData?.items || [];

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
  } = useForm<WorkOrderFormData>({
    resolver: zodResolver(workOrderFormSchema),
    defaultValues: workOrder
      ? {
          customer_id: String(workOrder.customer_id),
          billing_customer_id: workOrder.billing_customer_id ? String(workOrder.billing_customer_id) : undefined,
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
          // Pumping fields
          gallons_pumped: workOrder.gallons_pumped || undefined,
          dump_site_id: workOrder.dump_site_id || "",
          dump_fee: workOrder.dump_fee || undefined,
          total_amount: workOrder.total_amount || undefined,
          system_type: workOrder.system_type || "conventional",
          notes: workOrder.notes || "",
        }
      : {
          customer_id: defaultCustomerId || "",
          billing_customer_id: undefined,
          job_type: "pumping" as JobType,
          status: "draft" as WorkOrderStatus,
          priority: "normal" as Priority,
          scheduled_date: "",
          time_window_start: "",
          time_window_end: "",
          estimated_duration_hours: 1,
          assigned_technician: "",
          assigned_vehicle: "",
          service_address_line1: "",
          service_address_line2: "",
          service_city: "",
          service_state: "",
          service_postal_code: "",
          system_type: "conventional",
          notes: "",
        },
  });

  const handleClose = () => {
    reset();
    setShowBillTo(false);
    onClose();
  };

  const handleFormSubmit = async (data: WorkOrderFormData) => {
    // Clean up empty strings to undefined
    const cleanedData: WorkOrderFormData = {
      ...data,
      billing_customer_id: showBillTo ? (data.billing_customer_id || undefined) : undefined,
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
      // Pumping fields
      gallons_pumped: data.gallons_pumped || undefined,
      dump_site_id: data.dump_site_id || undefined,
      dump_fee: data.dump_fee || undefined,
      total_amount: data.total_amount || undefined,
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
                <div className="col-span-2">
                  <Controller
                    name="customer_id"
                    control={control}
                    render={({ field }) => (
                      <CustomerCombobox
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isEdit}
                        error={errors.customer_id?.message}
                        onCustomerCreated={(c) => {
                          // Auto-fill service address from new customer
                          if (c.address_line1) setValue("service_address_line1", c.address_line1);
                          if (c.city) setValue("service_city", c.city);
                          if (c.state) setValue("service_state", c.state);
                          if (c.postal_code) setValue("service_postal_code", c.postal_code);
                        }}
                      />
                    )}
                  />
                </div>

                {/* Bill To toggle + field */}
                <div className="col-span-2">
                  {!showBillTo ? (
                    <button
                      type="button"
                      className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                      onClick={() => setShowBillTo(true)}
                    >
                      <span className="text-lg leading-none">+</span> Bill to a different customer
                    </button>
                  ) : (
                    <div className="border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-amber-800 dark:text-amber-300 font-medium text-sm">
                          Bill To (invoices go to this customer)
                        </Label>
                        <button
                          type="button"
                          className="text-xs text-text-muted hover:text-danger"
                          onClick={() => {
                            setShowBillTo(false);
                            setValue("billing_customer_id", undefined);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                      <Controller
                        name="billing_customer_id"
                        control={control}
                        render={({ field }) => (
                          <CustomerCombobox
                            value={field.value || ""}
                            onChange={field.onChange}
                            hideLabel
                          />
                        )}
                      />
                    </div>
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

                <div className="space-y-2">
                  <Label htmlFor="system_type">System Type</Label>
                  <Select id="system_type" {...register("system_type")}>
                    <option value="conventional">Conventional</option>
                    <option value="aerobic">Aerobic</option>
                    <option value="lift_station">Lift Station</option>
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

            {/* Pumping Details - Only show for pumping jobs */}
            {watch("job_type") === "pumping" && (
              <div>
                <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                  Pumping Details
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gallons_pumped">Gallons Pumped</Label>
                    <Input
                      id="gallons_pumped"
                      type="number"
                      min="0"
                      step="1"
                      {...register("gallons_pumped")}
                      placeholder="Enter gallons"
                      onChange={(e) => {
                        const gallons = parseInt(e.target.value) || 0;
                        const siteId = watch("dump_site_id");
                        const site = dumpSites?.find((s) => s.id === siteId);
                        if (site && gallons > 0) {
                          setValue("dump_fee", gallons * site.fee_per_gallon);
                        }
                      }}
                    />
                    <p className="text-xs text-text-secondary">
                      Enter the number of gallons pumped
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dump_site_id">Dump Site</Label>
                    <Select
                      id="dump_site_id"
                      {...register("dump_site_id")}
                      onChange={(e) => {
                        const siteId = e.target.value;
                        const site = dumpSites?.find((s) => s.id === siteId);
                        const gallons = watch("gallons_pumped") || 0;
                        if (site && gallons > 0) {
                          setValue("dump_fee", gallons * site.fee_per_gallon);
                        }
                      }}
                    >
                      <option value="">Select dump site...</option>
                      {dumpSites?.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.name} ({site.address_state}) -{" "}
                          {(site.fee_per_gallon * 100).toFixed(1)}¢/gal
                        </option>
                      ))}
                    </Select>
                    <p className="text-xs text-text-secondary">
                      Select where waste was disposed
                    </p>
                  </div>

                  {/* Auto-calculated dump fee display */}
                  {watch("gallons_pumped") && watch("dump_site_id") && (
                    <div className="col-span-2 bg-bg-muted rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-sm text-text-secondary">
                            Dump Fee Calculation
                          </span>
                          <div className="text-xs text-text-muted mt-1">
                            {watch("gallons_pumped")} gallons ×{" "}
                            {dumpSites?.find(
                              (s) => s.id === watch("dump_site_id"),
                            )?.fee_per_gallon
                              ? (
                                  dumpSites.find(
                                    (s) => s.id === watch("dump_site_id"),
                                  )!.fee_per_gallon * 100
                                ).toFixed(1) + "¢"
                              : "0¢"}
                            /gallon
                          </div>
                        </div>
                        <div className="text-xl font-bold text-primary">
                          {formatCurrency(watch("dump_fee") || 0)}
                        </div>
                      </div>
                    </div>
                  )}

                  <input type="hidden" {...register("dump_fee")} />
                </div>
              </div>
            )}

            {/* Job Amount */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Pricing
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total_amount">Job Amount ($)</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    {...register("total_amount", { valueAsNumber: true })}
                    placeholder="625.00"
                  />
                  <p className="text-xs text-text-secondary">
                    Total charged to customer. Sent to Google Ads as conversion value.
                  </p>
                </div>
                <div className="flex items-end pb-6">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setValue("total_amount", 595)}
                    >
                      $595
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setValue("total_amount", 625)}
                    >
                      $625
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setValue("total_amount", 825)}
                    >
                      $825
                    </Button>
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
