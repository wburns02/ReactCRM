import { useState, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Select } from "@/components/ui/Select.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import {
  useAssets,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
  useAssetMaintenance,
  useCreateMaintenanceLog,
  useAssetAssignments,
} from "@/api/hooks/useAssets.ts";
import {
  type Asset,
  type AssetFormData,
  type AssetFilters,
  ASSET_STATUS_LABELS,
  ASSET_STATUS_COLORS,
  ASSET_CONDITION_LABELS,
  ASSET_CONDITION_COLORS,
  ASSET_TYPES,
  ASSET_TYPE_MAP,
} from "@/api/types/assets.ts";

const PAGE_SIZE = 20;

// ---- Detail Field ----
function DetailField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}

// ---- Maintenance Form ----
function MaintenanceForm({
  assetId,
  onSubmit,
  isLoading,
}: {
  assetId: string;
  onSubmit: (data: {
    asset_id: string;
    maintenance_type: string;
    title: string;
    description?: string;
    cost?: number;
    condition_before?: string;
    condition_after?: string;
    notes?: string;
  }) => Promise<void>;
  isLoading: boolean;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("scheduled");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [condBefore, setCondBefore] = useState("");
  const [condAfter, setCondAfter] = useState("");

  return (
    <div className="p-4 border border-border rounded-lg bg-surface-secondary">
      <h4 className="text-sm font-semibold mb-3">Log Maintenance</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-text-secondary mb-1">
            Title *
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Oil Change, Brake Inspection"
          />
        </div>
        <div>
          <label className="block text-xs text-text-secondary mb-1">Type</label>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="scheduled">Scheduled</option>
            <option value="repair">Repair</option>
            <option value="inspection">Inspection</option>
            <option value="preventive">Preventive</option>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-text-secondary mb-1">
            Description
          </label>
          <textarea
            className="w-full px-3 py-2 border border-border rounded-md bg-surface-primary text-text-primary text-sm resize-none"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the maintenance performed"
          />
        </div>
        <div>
          <label className="block text-xs text-text-secondary mb-1">
            Cost ($)
          </label>
          <Input
            type="number"
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-text-secondary mb-1">
              Condition Before
            </label>
            <Select
              value={condBefore}
              onChange={(e) => setCondBefore(e.target.value)}
            >
              <option value="">Select...</option>
              {Object.entries(ASSET_CONDITION_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-text-secondary mb-1">
              Condition After
            </label>
            <Select
              value={condAfter}
              onChange={(e) => setCondAfter(e.target.value)}
            >
              <option value="">Select...</option>
              {Object.entries(ASSET_CONDITION_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>
      <div className="flex justify-end mt-3">
        <Button
          size="sm"
          disabled={isLoading || !title}
          onClick={() =>
            onSubmit({
              asset_id: assetId,
              maintenance_type: type,
              title,
              description: description || undefined,
              cost: cost ? Number(cost) : undefined,
              condition_before: condBefore || undefined,
              condition_after: condAfter || undefined,
            })
          }
        >
          {isLoading ? "Saving..." : "Save Maintenance Log"}
        </Button>
      </div>
    </div>
  );
}

// ---- Asset Card ----
function AssetCard({
  asset,
  onView,
  onEdit,
  onDelete,
}: {
  asset: Asset;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const typeInfo = ASSET_TYPE_MAP[asset.asset_type];

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onView}
    >
      <CardContent className="py-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{typeInfo?.icon || "📦"}</span>
            <div>
              <h3 className="text-sm font-semibold text-text-primary leading-tight">
                {asset.name}
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                {asset.asset_tag || "No tag"}
                {asset.serial_number && ` · S/N: ${asset.serial_number}`}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              ASSET_STATUS_COLORS[asset.status as keyof typeof ASSET_STATUS_COLORS] || "bg-gray-100 text-gray-700"
            }`}
          >
            {ASSET_STATUS_LABELS[asset.status as keyof typeof ASSET_STATUS_LABELS] || asset.status}
          </span>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          {asset.make && (
            <div>
              <span className="text-text-secondary">Make/Model: </span>
              <span className="text-text-primary">
                {asset.make} {asset.model || ""}
              </span>
            </div>
          )}
          {asset.year && (
            <div>
              <span className="text-text-secondary">Year: </span>
              <span className="text-text-primary">{asset.year}</span>
            </div>
          )}
          {asset.condition && (
            <div>
              <span className="text-text-secondary">Condition: </span>
              <span
                className={`font-medium ${
                  asset.condition === "poor"
                    ? "text-red-600"
                    : asset.condition === "fair"
                      ? "text-amber-600"
                      : "text-green-600"
                }`}
              >
                {ASSET_CONDITION_LABELS[asset.condition as keyof typeof ASSET_CONDITION_LABELS] || asset.condition}
              </span>
            </div>
          )}
          {asset.assigned_technician_name && (
            <div>
              <span className="text-text-secondary">Assigned: </span>
              <span className="text-text-primary">
                {asset.assigned_technician_name}
              </span>
            </div>
          )}
          {asset.purchase_price != null && (
            <div>
              <span className="text-text-secondary">Value: </span>
              <span className="text-text-primary">
                ${(asset.depreciated_value ?? asset.purchase_price).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
          )}
          {asset.next_maintenance_date && (
            <div>
              <span className="text-text-secondary">Next Maint: </span>
              <span
                className={`text-text-primary ${
                  new Date(asset.next_maintenance_date) < new Date()
                    ? "text-red-600 font-medium"
                    : ""
                }`}
              >
                {new Date(asset.next_maintenance_date).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* QR Code */}
        {asset.qr_code && (
          <div className="flex items-center gap-1 mb-3">
            <span className="text-xs text-text-secondary">QR:</span>
            <code className="text-xs bg-surface-secondary px-1.5 py-0.5 rounded font-mono">
              {asset.qr_code}
            </code>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            Edit
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            Retire
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Asset Form Modal ----
function AssetFormModal({
  open,
  onClose,
  onSubmit,
  asset,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AssetFormData) => Promise<void>;
  asset: Asset | null;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<AssetFormData>({
    name: "",
    asset_type: "tool",
    status: "available",
    condition: "good",
  });

  // Reset form when asset changes
  useState(() => {
    if (asset) {
      setFormData({
        name: asset.name,
        asset_tag: asset.asset_tag || undefined,
        asset_type: asset.asset_type,
        category: asset.category || undefined,
        description: asset.description || undefined,
        make: asset.make || undefined,
        model: asset.model || undefined,
        serial_number: asset.serial_number || undefined,
        year: asset.year || undefined,
        purchase_date: asset.purchase_date || undefined,
        purchase_price: asset.purchase_price || undefined,
        current_value: asset.current_value || undefined,
        salvage_value: asset.salvage_value || undefined,
        useful_life_years: asset.useful_life_years || undefined,
        status: asset.status || "available",
        condition: asset.condition || "good",
        location_description: asset.location_description || undefined,
        samsara_vehicle_id: asset.samsara_vehicle_id || undefined,
        maintenance_interval_days: asset.maintenance_interval_days || undefined,
        total_hours: asset.total_hours || undefined,
        odometer_miles: asset.odometer_miles || undefined,
        warranty_expiry: asset.warranty_expiry || undefined,
        insurance_policy: asset.insurance_policy || undefined,
        insurance_expiry: asset.insurance_expiry || undefined,
        notes: asset.notes || undefined,
      });
    } else {
      setFormData({
        name: "",
        asset_type: "tool",
        status: "available",
        condition: "good",
      });
    }
  });

  const handleOpen = useCallback(() => {
    if (asset) {
      setFormData({
        name: asset.name,
        asset_tag: asset.asset_tag || undefined,
        asset_type: asset.asset_type,
        category: asset.category || undefined,
        description: asset.description || undefined,
        make: asset.make || undefined,
        model: asset.model || undefined,
        serial_number: asset.serial_number || undefined,
        year: asset.year || undefined,
        purchase_date: asset.purchase_date || undefined,
        purchase_price: asset.purchase_price || undefined,
        current_value: asset.current_value || undefined,
        salvage_value: asset.salvage_value || undefined,
        useful_life_years: asset.useful_life_years || undefined,
        status: asset.status || "available",
        condition: asset.condition || "good",
        location_description: asset.location_description || undefined,
        samsara_vehicle_id: asset.samsara_vehicle_id || undefined,
        maintenance_interval_days: asset.maintenance_interval_days || undefined,
        total_hours: asset.total_hours || undefined,
        odometer_miles: asset.odometer_miles || undefined,
        warranty_expiry: asset.warranty_expiry || undefined,
        insurance_policy: asset.insurance_policy || undefined,
        insurance_expiry: asset.insurance_expiry || undefined,
        notes: asset.notes || undefined,
      });
    } else {
      setFormData({
        name: "",
        asset_type: "tool",
        status: "available",
        condition: "good",
      });
    }
  }, [asset]);

  useMemo(() => {
    if (open) handleOpen();
  }, [open, handleOpen]);

  const updateField = (field: keyof AssetFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value || undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.asset_type) return;
    await onSubmit(formData);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent size="lg">
        <DialogHeader onClose={onClose}>
          {asset ? "Edit Asset" : "Add New Asset"}
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody className="max-h-[70vh] overflow-y-auto">
            <div className="space-y-6">
              {/* Basic Info */}
              <fieldset>
                <legend className="text-sm font-semibold text-text-primary mb-3">
                  Basic Information
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Name *
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="e.g., Ford F-550 Vacuum Truck"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Asset Type *
                    </label>
                    <Select
                      value={formData.asset_type}
                      onChange={(e) => updateField("asset_type", e.target.value)}
                      required
                    >
                      {ASSET_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.icon} {t.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Category
                    </label>
                    <Input
                      value={formData.category || ""}
                      onChange={(e) => updateField("category", e.target.value)}
                      placeholder="e.g., Vacuum Truck, Jetter, Shovel"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Asset Tag
                    </label>
                    <Input
                      value={formData.asset_tag || ""}
                      onChange={(e) => updateField("asset_tag", e.target.value)}
                      placeholder="Auto-generated if empty"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Make/Model/Serial */}
              <fieldset>
                <legend className="text-sm font-semibold text-text-primary mb-3">
                  Identification
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Make
                    </label>
                    <Input
                      value={formData.make || ""}
                      onChange={(e) => updateField("make", e.target.value)}
                      placeholder="e.g., Ford, CAT"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Model
                    </label>
                    <Input
                      value={formData.model || ""}
                      onChange={(e) => updateField("model", e.target.value)}
                      placeholder="e.g., F-550, 320D"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Serial Number
                    </label>
                    <Input
                      value={formData.serial_number || ""}
                      onChange={(e) => updateField("serial_number", e.target.value)}
                      placeholder="Enter serial number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Year
                    </label>
                    <Input
                      type="number"
                      value={formData.year || ""}
                      onChange={(e) =>
                        updateField("year", e.target.value ? Number(e.target.value) : undefined)
                      }
                      placeholder="e.g., 2024"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Financial */}
              <fieldset>
                <legend className="text-sm font-semibold text-text-primary mb-3">
                  Financial
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Purchase Date
                    </label>
                    <Input
                      type="date"
                      value={formData.purchase_date || ""}
                      onChange={(e) => updateField("purchase_date", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Purchase Price ($)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.purchase_price || ""}
                      onChange={(e) =>
                        updateField(
                          "purchase_price",
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Useful Life (years)
                    </label>
                    <Input
                      type="number"
                      value={formData.useful_life_years || ""}
                      onChange={(e) =>
                        updateField(
                          "useful_life_years",
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      placeholder="10"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Status & Condition */}
              <fieldset>
                <legend className="text-sm font-semibold text-text-primary mb-3">
                  Status
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Status
                    </label>
                    <Select
                      value={formData.status || "available"}
                      onChange={(e) => updateField("status", e.target.value)}
                    >
                      {Object.entries(ASSET_STATUS_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Condition
                    </label>
                    <Select
                      value={formData.condition || "good"}
                      onChange={(e) => updateField("condition", e.target.value)}
                    >
                      {Object.entries(ASSET_CONDITION_LABELS).map(
                        ([val, label]) => (
                          <option key={val} value={val}>
                            {label}
                          </option>
                        ),
                      )}
                    </Select>
                  </div>
                </div>
              </fieldset>

              {/* Location & Tracking */}
              <fieldset>
                <legend className="text-sm font-semibold text-text-primary mb-3">
                  Location & Tracking
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Location
                    </label>
                    <Input
                      value={formData.location_description || ""}
                      onChange={(e) =>
                        updateField("location_description", e.target.value)
                      }
                      placeholder="e.g., Main shop, Truck #1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Samsara Vehicle ID
                    </label>
                    <Input
                      value={formData.samsara_vehicle_id || ""}
                      onChange={(e) =>
                        updateField("samsara_vehicle_id", e.target.value)
                      }
                      placeholder="Link to Samsara GPS"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Maintenance */}
              <fieldset>
                <legend className="text-sm font-semibold text-text-primary mb-3">
                  Maintenance
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Maintenance Interval (days)
                    </label>
                    <Input
                      type="number"
                      value={formData.maintenance_interval_days || ""}
                      onChange={(e) =>
                        updateField(
                          "maintenance_interval_days",
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      placeholder="e.g., 90"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Total Hours
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.total_hours || ""}
                      onChange={(e) =>
                        updateField(
                          "total_hours",
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Odometer (miles)
                    </label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.odometer_miles || ""}
                      onChange={(e) =>
                        updateField(
                          "odometer_miles",
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Warranty & Insurance */}
              <fieldset>
                <legend className="text-sm font-semibold text-text-primary mb-3">
                  Warranty & Insurance
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Warranty Expiry
                    </label>
                    <Input
                      type="date"
                      value={formData.warranty_expiry || ""}
                      onChange={(e) =>
                        updateField("warranty_expiry", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Insurance Policy #
                    </label>
                    <Input
                      value={formData.insurance_policy || ""}
                      onChange={(e) =>
                        updateField("insurance_policy", e.target.value)
                      }
                      placeholder="Policy number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Insurance Expiry
                    </label>
                    <Input
                      type="date"
                      value={formData.insurance_expiry || ""}
                      onChange={(e) =>
                        updateField("insurance_expiry", e.target.value)
                      }
                    />
                  </div>
                </div>
              </fieldset>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Notes
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface-primary text-text-primary text-sm resize-none"
                  rows={3}
                  value={formData.notes || ""}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name}>
              {isLoading
                ? "Saving..."
                : asset
                  ? "Update Asset"
                  : "Create Asset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---- Asset Detail Modal ----
function AssetDetailModal({
  asset,
  onClose,
  onEdit,
}: {
  asset: Asset;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [activeDetailTab, setActiveDetailTab] = useState<
    "overview" | "maintenance" | "assignments"
  >("overview");
  const { data: maintenanceData } = useAssetMaintenance(asset.id);
  const { data: assignmentData } = useAssetAssignments(asset.id);

  const [showMaintForm, setShowMaintForm] = useState(false);
  const createMaintLog = useCreateMaintenanceLog();

  const typeInfo = ASSET_TYPE_MAP[asset.asset_type];

  return (
    <Dialog open onClose={onClose}>
      <DialogContent size="lg">
        <DialogHeader onClose={onClose}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{typeInfo?.icon || "📦"}</span>
            <div>
              <span className="text-lg font-semibold">{asset.name}</span>
              <span className="block text-xs text-text-secondary">
                {asset.asset_tag} &middot;{" "}
                {typeInfo?.label || asset.asset_type}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Detail Tabs */}
        <div className="flex gap-1 px-6 border-b border-border">
          {(
            [
              { id: "overview", label: "Overview" },
              { id: "maintenance", label: `Maintenance (${maintenanceData?.total || 0})` },
              { id: "assignments", label: `History (${assignmentData?.total || 0})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveDetailTab(tab.id)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeDetailTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <DialogBody className="max-h-[60vh] overflow-y-auto">
          {activeDetailTab === "overview" && (
            <div className="space-y-4">
              {/* Status Badges */}
              <div className="flex gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    ASSET_STATUS_COLORS[asset.status as keyof typeof ASSET_STATUS_COLORS] || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {ASSET_STATUS_LABELS[asset.status as keyof typeof ASSET_STATUS_LABELS] || asset.status}
                </span>
                {asset.condition && (
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      ASSET_CONDITION_COLORS[asset.condition as keyof typeof ASSET_CONDITION_COLORS] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {ASSET_CONDITION_LABELS[asset.condition as keyof typeof ASSET_CONDITION_LABELS] || asset.condition}
                  </span>
                )}
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <DetailField label="Make" value={asset.make} />
                <DetailField label="Model" value={asset.model} />
                <DetailField label="Year" value={asset.year?.toString()} />
                <DetailField label="Serial #" value={asset.serial_number} />
                <DetailField label="Category" value={asset.category} />
                <DetailField label="Location" value={asset.location_description} />
                <DetailField
                  label="Purchase Date"
                  value={
                    asset.purchase_date
                      ? new Date(asset.purchase_date).toLocaleDateString()
                      : undefined
                  }
                />
                <DetailField
                  label="Purchase Price"
                  value={
                    asset.purchase_price != null
                      ? `$${asset.purchase_price.toLocaleString()}`
                      : undefined
                  }
                />
                <DetailField
                  label="Depreciated Value"
                  value={
                    asset.depreciated_value != null
                      ? `$${asset.depreciated_value.toLocaleString()}`
                      : undefined
                  }
                />
                <DetailField
                  label="Useful Life"
                  value={
                    asset.useful_life_years
                      ? `${asset.useful_life_years} years`
                      : undefined
                  }
                />
                <DetailField
                  label="Warranty Expiry"
                  value={
                    asset.warranty_expiry
                      ? new Date(asset.warranty_expiry).toLocaleDateString()
                      : undefined
                  }
                />
                <DetailField label="Insurance" value={asset.insurance_policy} />
                <DetailField
                  label="Next Maintenance"
                  value={
                    asset.next_maintenance_date
                      ? new Date(
                          asset.next_maintenance_date,
                        ).toLocaleDateString()
                      : undefined
                  }
                />
                <DetailField
                  label="Maint. Interval"
                  value={
                    asset.maintenance_interval_days
                      ? `${asset.maintenance_interval_days} days`
                      : undefined
                  }
                />
                <DetailField
                  label="Total Hours"
                  value={asset.total_hours?.toString()}
                />
                <DetailField
                  label="Odometer"
                  value={
                    asset.odometer_miles
                      ? `${asset.odometer_miles.toLocaleString()} mi`
                      : undefined
                  }
                />
                <DetailField
                  label="Assigned To"
                  value={asset.assigned_technician_name}
                />
                <DetailField
                  label="Samsara ID"
                  value={asset.samsara_vehicle_id}
                />
              </div>

              {/* QR Code */}
              {asset.qr_code && (
                <div className="p-3 bg-surface-secondary rounded-lg">
                  <p className="text-xs text-text-secondary mb-1">QR Code</p>
                  <code className="text-sm font-mono">{asset.qr_code}</code>
                </div>
              )}

              {/* Notes */}
              {asset.notes && (
                <div>
                  <p className="text-xs font-medium text-text-secondary mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-text-primary whitespace-pre-wrap">
                    {asset.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeDetailTab === "maintenance" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-text-secondary">
                  {maintenanceData?.total || 0} service records
                </p>
                <Button
                  size="sm"
                  onClick={() => setShowMaintForm(!showMaintForm)}
                >
                  {showMaintForm ? "Cancel" : "+ Log Maintenance"}
                </Button>
              </div>

              {showMaintForm && (
                <MaintenanceForm
                  assetId={asset.id}
                  onSubmit={async (data) => {
                    await createMaintLog.mutateAsync(data);
                    setShowMaintForm(false);
                  }}
                  isLoading={createMaintLog.isPending}
                />
              )}

              {maintenanceData?.items?.length === 0 && !showMaintForm ? (
                <div className="text-center py-8">
                  <span className="text-3xl block mb-2">🔧</span>
                  <p className="text-sm text-text-secondary">
                    No maintenance records yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {maintenanceData?.items?.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 border border-border rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {log.title}
                          </p>
                          <p className="text-xs text-text-secondary mt-0.5">
                            {log.maintenance_type} &middot;{" "}
                            {log.performed_at
                              ? new Date(log.performed_at).toLocaleDateString()
                              : "Unknown date"}
                            {log.performed_by_name &&
                              ` by ${log.performed_by_name}`}
                          </p>
                        </div>
                        {log.cost != null && log.cost > 0 && (
                          <span className="text-sm font-medium text-text-primary">
                            ${log.cost.toFixed(2)}
                          </span>
                        )}
                      </div>
                      {log.description && (
                        <p className="text-xs text-text-secondary mt-2">
                          {log.description}
                        </p>
                      )}
                      {log.condition_before && log.condition_after && (
                        <p className="text-xs mt-1">
                          <span className="text-text-secondary">
                            Condition:{" "}
                          </span>
                          {log.condition_before} → {log.condition_after}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeDetailTab === "assignments" && (
            <div className="space-y-3">
              {assignmentData?.items?.length === 0 ? (
                <div className="text-center py-8">
                  <span className="text-3xl block mb-2">📋</span>
                  <p className="text-sm text-text-secondary">
                    No assignment history
                  </p>
                </div>
              ) : (
                assignmentData?.items?.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 border border-border rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {a.assigned_to_name || "Unknown"}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {a.assigned_to_type === "technician"
                            ? "Technician"
                            : "Work Order"}{" "}
                          &middot; Checked out{" "}
                          {a.checked_out_at
                            ? new Date(a.checked_out_at).toLocaleDateString()
                            : "Unknown"}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          a.checked_in_at
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {a.checked_in_at ? "Returned" : "Checked Out"}
                      </span>
                    </div>
                    {a.checked_in_at && (
                      <p className="text-xs text-text-secondary mt-1">
                        Returned{" "}
                        {new Date(a.checked_in_at).toLocaleDateString()}
                        {a.condition_at_checkin &&
                          ` · Condition: ${a.condition_at_checkin}`}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onEdit}>Edit Asset</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Asset List Tab (main export) ----
export function AssetListTab() {
  const [filters, setFilters] = useState<AssetFilters>({
    page: 1,
    page_size: PAGE_SIZE,
    search: "",
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);

  const { data, isLoading } = useAssets(filters);
  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();
  const deleteMutation = useDeleteAsset();

  const handleCreate = useCallback(() => {
    setEditingAsset(null);
    setIsFormOpen(true);
  }, []);

  const handleEdit = useCallback((asset: Asset) => {
    setEditingAsset(asset);
    setIsFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    async (formData: AssetFormData) => {
      if (editingAsset) {
        await updateMutation.mutateAsync({ id: editingAsset.id, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setIsFormOpen(false);
      setEditingAsset(null);
    },
    [editingAsset, createMutation, updateMutation],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (deletingAsset) {
      await deleteMutation.mutateAsync(deletingAsset.id);
      setDeletingAsset(null);
    }
  }, [deletingAsset, deleteMutation]);

  return (
    <>
      {/* Filters + Add Button */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search assets by name, tag, serial number..."
            value={filters.search || ""}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                search: e.target.value,
                page: 1,
              }))
            }
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={filters.asset_type || ""}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                asset_type: e.target.value || undefined,
                page: 1,
              }))
            }
          >
            <option value="">All Types</option>
            {ASSET_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.icon} {t.label}
              </option>
            ))}
          </Select>
          <Select
            value={filters.status || ""}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                status: e.target.value || undefined,
                page: 1,
              }))
            }
          >
            <option value="">All Statuses</option>
            {Object.entries(ASSET_STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </Select>
          <Button onClick={handleCreate}>+ Add Asset</Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-text-secondary">
          {data?.total
            ? `${data.total} asset${data.total !== 1 ? "s" : ""}`
            : "No assets found"}
        </p>
      </div>

      {/* Asset Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="py-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-surface-secondary rounded w-3/4" />
                  <div className="h-3 bg-surface-secondary rounded w-1/2" />
                  <div className="h-3 bg-surface-secondary rounded w-1/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !data?.items?.length ? (
        <Card>
          <CardContent className="py-16 text-center">
            <span className="text-5xl block mb-4">📦</span>
            <h3 className="text-lg font-medium text-text-primary mb-2">
              No assets found
            </h3>
            <p className="text-sm text-text-secondary mb-6">
              {filters.search || filters.asset_type || filters.status
                ? "Try adjusting your filters"
                : "Add your first asset to get started tracking your equipment"}
            </p>
            {!filters.search && !filters.asset_type && !filters.status && (
              <Button onClick={handleCreate}>+ Add Your First Asset</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.items.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onView={() => setDetailAsset(asset)}
                onEdit={() => handleEdit(asset)}
                onDelete={() => setDeletingAsset(asset)}
              />
            ))}
          </div>

          {/* Pagination */}
          {data.total > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-text-secondary">
                Showing {(filters.page! - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(filters.page! * PAGE_SIZE, data.total)} of {data.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={filters.page === 1}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      page: (prev.page || 1) - 1,
                    }))
                  }
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={filters.page! * PAGE_SIZE >= data.total}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      page: (prev.page || 1) + 1,
                    }))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Form */}
      <AssetFormModal
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingAsset(null);
        }}
        onSubmit={handleFormSubmit}
        asset={editingAsset}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Detail Modal */}
      {detailAsset && (
        <AssetDetailModal
          asset={detailAsset}
          onClose={() => setDetailAsset(null)}
          onEdit={() => {
            setDetailAsset(null);
            handleEdit(detailAsset);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog
        open={!!deletingAsset}
        onClose={() => setDeletingAsset(null)}
      >
        <DialogContent size="sm">
          <DialogHeader onClose={() => setDeletingAsset(null)}>
            Retire Asset
          </DialogHeader>
          <DialogBody>
            <p className="text-text-secondary">
              Are you sure you want to retire{" "}
              <span className="font-medium text-text-primary">
                {deletingAsset?.name}
              </span>
              ? The asset will be marked as retired and hidden from active views.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeletingAsset(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Retiring..." : "Retire Asset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
