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
  technicianFormSchema,
  type TechnicianFormData,
  type Technician,
  TECHNICIAN_SKILL_LABELS,
  type TechnicianSkill,
} from "@/api/types/technician.ts";

export interface TechnicianFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TechnicianFormData) => Promise<void>;
  /** Existing technician for edit mode */
  technician?: Technician | null;
  isLoading?: boolean;
}

const SKILL_OPTIONS = Object.entries(TECHNICIAN_SKILL_LABELS) as [
  TechnicianSkill,
  string,
][];

const REGION_OPTIONS = ["North", "South", "East", "West", "Central"];

/**
 * Technician create/edit form modal
 */
export function TechnicianForm({
  open,
  onClose,
  onSubmit,
  technician,
  isLoading,
}: TechnicianFormProps) {
  const isEdit = !!technician;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
    setValue,
  } = useForm<TechnicianFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(technicianFormSchema) as any,
    defaultValues: technician
      ? {
          first_name: technician.first_name,
          last_name: technician.last_name,
          email: technician.email || "",
          phone: technician.phone || "",
          employee_id: technician.employee_id || "",
          is_active: technician.is_active,
          home_region: technician.home_region || "",
          home_address: technician.home_address || "",
          home_city: technician.home_city || "",
          home_state: technician.home_state || "",
          home_postal_code: technician.home_postal_code || "",
          home_latitude: technician.home_latitude || undefined,
          home_longitude: technician.home_longitude || undefined,
          skills: (technician.skills as TechnicianSkill[]) || [],
          assigned_vehicle: technician.assigned_vehicle || "",
          vehicle_capacity_gallons:
            technician.vehicle_capacity_gallons || undefined,
          license_number: technician.license_number || "",
          license_expiry: technician.license_expiry || "",
          hourly_rate: technician.hourly_rate || undefined,
          notes: technician.notes || "",
        }
      : {
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          employee_id: "",
          is_active: true,
          home_region: "",
          home_address: "",
          home_city: "",
          home_state: "",
          home_postal_code: "",
          home_latitude: undefined,
          home_longitude: undefined,
          skills: [],
          assigned_vehicle: "",
          vehicle_capacity_gallons: undefined,
          license_number: "",
          license_expiry: "",
          hourly_rate: undefined,
          notes: "",
        },
  });

  const selectedSkills = watch("skills") || [];

  const handleSkillToggle = (skill: TechnicianSkill) => {
    const current = selectedSkills;
    const newSkills = current.includes(skill)
      ? current.filter((s) => s !== skill)
      : [...current, skill];
    setValue("skills", newSkills, { shouldDirty: true });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = async (data: TechnicianFormData) => {
    // Clean up empty strings to undefined
    const cleanedData: TechnicianFormData = {
      ...data,
      email: data.email || undefined,
      phone: data.phone || undefined,
      employee_id: data.employee_id || undefined,
      home_region: data.home_region || undefined,
      home_address: data.home_address || undefined,
      home_city: data.home_city || undefined,
      home_state: data.home_state || undefined,
      home_postal_code: data.home_postal_code || undefined,
      home_latitude: data.home_latitude || undefined,
      home_longitude: data.home_longitude || undefined,
      skills: data.skills?.length ? data.skills : undefined,
      assigned_vehicle: data.assigned_vehicle || undefined,
      vehicle_capacity_gallons: data.vehicle_capacity_gallons || undefined,
      license_number: data.license_number || undefined,
      license_expiry: data.license_expiry || undefined,
      hourly_rate: data.hourly_rate || undefined,
      notes: data.notes || undefined,
    };

    await onSubmit(cleanedData);
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} disableOverlayClose={isDirty}>
      <DialogContent size="lg">
        <DialogHeader onClose={handleClose}>
          {isEdit ? "Edit Technician" : "Add New Technician"}
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogBody className="space-y-6 max-h-[60vh] overflow-y-auto">
            {/* Basic Info Section */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Contact Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name" required>
                    First Name
                  </Label>
                  <Input
                    id="first_name"
                    {...register("first_name")}
                    error={!!errors.first_name}
                    placeholder="John"
                  />
                  {errors.first_name && (
                    <p className="text-sm text-danger">
                      {errors.first_name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name" required>
                    Last Name
                  </Label>
                  <Input
                    id="last_name"
                    {...register("last_name")}
                    error={!!errors.last_name}
                    placeholder="Doe"
                  />
                  {errors.last_name && (
                    <p className="text-sm text-danger">
                      {errors.last_name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    error={!!errors.email}
                    placeholder="john@example.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-danger">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register("phone")}
                    error={!!errors.phone}
                    placeholder="(555) 123-4567"
                  />
                  {errors.phone && (
                    <p className="text-sm text-danger">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employee_id">Employee ID</Label>
                  <Input
                    id="employee_id"
                    {...register("employee_id")}
                    error={!!errors.employee_id}
                    placeholder="EMP001"
                  />
                </div>
              </div>
            </div>

            {/* Skills Section */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Skills & Certifications
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {SKILL_OPTIONS.map(([skill, label]) => (
                  <label
                    key={skill}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-bg-hover"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSkills.includes(skill)}
                      onChange={() => handleSkillToggle(skill)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="text-sm text-text-primary">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Vehicle Info */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Vehicle Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assigned_vehicle">Assigned Vehicle</Label>
                  <Input
                    id="assigned_vehicle"
                    {...register("assigned_vehicle")}
                    placeholder="Truck #5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicle_capacity_gallons">
                    Capacity (Gallons)
                  </Label>
                  <Input
                    id="vehicle_capacity_gallons"
                    type="number"
                    min="0"
                    {...register("vehicle_capacity_gallons")}
                    placeholder="2000"
                  />
                </div>
              </div>
            </div>

            {/* License Info */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                License & Payroll
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="license_number">License Number</Label>
                  <Input
                    id="license_number"
                    {...register("license_number")}
                    placeholder="LIC12345"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="license_expiry">License Expiry</Label>
                  <Input
                    id="license_expiry"
                    type="date"
                    {...register("license_expiry")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    min="0"
                    step="0.01"
                    {...register("hourly_rate")}
                    placeholder="25.00"
                  />
                </div>
              </div>
            </div>

            {/* Home Location */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Home Location
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="home_region">Region</Label>
                  <Select id="home_region" {...register("home_region")}>
                    <option value="">Select region...</option>
                    {REGION_OPTIONS.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="home_address">Street Address</Label>
                  <Input
                    id="home_address"
                    {...register("home_address")}
                    placeholder="123 Main St"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="home_city">City</Label>
                  <Input
                    id="home_city"
                    {...register("home_city")}
                    placeholder="Tampa"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="home_state">State</Label>
                    <Input
                      id="home_state"
                      {...register("home_state")}
                      placeholder="FL"
                      maxLength={2}
                    />
                    {errors.home_state && (
                      <p className="text-sm text-danger">
                        {errors.home_state.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="home_postal_code">ZIP Code</Label>
                    <Input
                      id="home_postal_code"
                      {...register("home_postal_code")}
                      placeholder="33601"
                    />
                  </div>
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
                  error={!!errors.notes}
                  placeholder="Additional notes about this technician..."
                  rows={4}
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-3 uppercase tracking-wide">
                Status
              </h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register("is_active")}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="text-sm text-text-primary">
                    Active Technician
                  </span>
                </label>
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
                  : "Create Technician"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
