import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Label } from "@/components/ui/Label.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from "@/components/ui/Dialog.tsx";
import { toastSuccess, toastError } from "@/components/ui/Toast.tsx";
import { getErrorMessage } from "@/api/client";
import { formatCurrency } from "@/lib/utils";
import {
  useDumpSites,
  useCreateDumpSite,
  useUpdateDumpSite,
  useDeleteDumpSite,
} from "@/api/hooks/useDumpSites.ts";
import type { DumpSite, CreateDumpSiteInput, UpdateDumpSiteInput } from "@/api/types/dumpSite.ts";

// Common US state codes for the dropdown
const STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

// Default fee rates by state (for suggestion only)
const STATE_FEE_SUGGESTIONS: Record<string, number> = {
  TX: 0.07,
  SC: 0.10,
  TN: 0.12,
};

/**
 * Dump Sites Management Page
 * Manages waste disposal locations with state-specific fees
 */
export function DumpSitesPage() {
  const [stateFilter, setStateFilter] = useState<string>("");
  const [showInactive, setShowInactive] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSite, setEditingSite] = useState<DumpSite | null>(null);
  const [siteToDelete, setSiteToDelete] = useState<DumpSite | null>(null);

  const { data: sites, isLoading } = useDumpSites({
    state: stateFilter || undefined,
    is_active: showInactive ? undefined : true,
  });

  const deleteDumpSite = useDeleteDumpSite();

  const handleOpenCreate = () => {
    setEditingSite(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (site: DumpSite) => {
    setEditingSite(site);
    setShowFormModal(true);
  };

  const handleDelete = async () => {
    if (!siteToDelete) return;
    try {
      await deleteDumpSite.mutateAsync(siteToDelete.id);
      toastSuccess("Dump Site Deactivated", "The dump site has been marked as inactive.");
      setSiteToDelete(null);
    } catch (error) {
      toastError("Error", getErrorMessage(error));
    }
  };

  // Group sites by state for display
  const sitesByState = sites?.reduce((acc, site) => {
    const state = site.address_state || "Other";
    if (!acc[state]) acc[state] = [];
    acc[state].push(site);
    return acc;
  }, {} as Record<string, DumpSite[]>) || {};

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Dump Sites</h1>
            <p className="text-text-secondary mt-1">
              Manage waste disposal locations and per-gallon fees
            </p>
          </div>
          <Button variant="primary" onClick={handleOpenCreate}>
            + Add Dump Site
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-40">
              <Label htmlFor="state-filter">Filter by State</Label>
              <select
                id="state-filter"
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All States</option>
                {STATE_CODES.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="show-inactive"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 rounded border-border"
              />
              <Label htmlFor="show-inactive" className="cursor-pointer">
                Show Inactive
              </Label>
            </div>
            <div className="text-sm text-text-secondary">
              {sites?.length || 0} site{sites?.length !== 1 ? "s" : ""} found
            </div>
          </div>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card className="p-8 text-center">
            <div className="animate-spin text-4xl">&#9696;</div>
            <p className="text-text-secondary mt-2">Loading dump sites...</p>
          </Card>
        )}

        {/* Sites List - Grouped by State */}
        {!isLoading && Object.keys(sitesByState).length > 0 && (
          <div className="space-y-6">
            {Object.entries(sitesByState)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([state, stateSites]) => (
                <div key={state}>
                  <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                    {state}
                    <Badge variant="secondary">{stateSites.length}</Badge>
                    {STATE_FEE_SUGGESTIONS[state] && (
                      <span className="text-sm font-normal text-text-secondary">
                        (Standard: {(STATE_FEE_SUGGESTIONS[state] * 100).toFixed(0)}¢/gal)
                      </span>
                    )}
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {stateSites.map((site) => (
                      <Card key={site.id} className={`p-4 ${!site.is_active ? "opacity-60" : ""}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-text-primary">{site.name}</h3>
                            {site.address_city && (
                              <p className="text-sm text-text-secondary">{site.address_city}</p>
                            )}
                          </div>
                          <Badge variant={site.is_active ? "success" : "secondary"}>
                            {site.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>

                        {/* Fee Display */}
                        <div className="bg-bg-muted rounded-lg p-3 mb-3">
                          <div className="text-xs text-text-secondary uppercase tracking-wide">
                            Fee per Gallon
                          </div>
                          <div className="text-2xl font-bold text-primary">
                            {(site.fee_per_gallon * 100).toFixed(1)}¢
                          </div>
                          <div className="text-sm text-text-secondary">
                            = {formatCurrency(site.fee_per_gallon)}/gallon
                          </div>
                        </div>

                        {/* Contact Info */}
                        {(site.contact_name || site.contact_phone) && (
                          <div className="text-sm text-text-secondary mb-3">
                            {site.contact_name && <div>Contact: {site.contact_name}</div>}
                            {site.contact_phone && <div>Phone: {site.contact_phone}</div>}
                          </div>
                        )}

                        {/* Notes */}
                        {site.notes && (
                          <div className="text-sm text-text-secondary mb-3 italic">
                            {site.notes}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t border-border">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(site)}
                          >
                            Edit
                          </Button>
                          {site.is_active && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setSiteToDelete(site)}
                            >
                              Deactivate
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!sites || sites.length === 0) && (
          <Card className="p-8 text-center">
            <div className="text-6xl mb-4">&#128506;</div>
            <h3 className="font-semibold text-text-primary text-xl mb-2">
              No Dump Sites Found
            </h3>
            <p className="text-text-secondary mb-4">
              {stateFilter
                ? `No dump sites found for ${stateFilter}`
                : "Get started by adding your first dump site"}
            </p>
            <Button variant="primary" onClick={handleOpenCreate}>
              + Add First Dump Site
            </Button>
          </Card>
        )}

        {/* Form Modal */}
        <DumpSiteFormModal
          open={showFormModal}
          onClose={() => setShowFormModal(false)}
          editingSite={editingSite}
        />

        {/* Delete Confirmation */}
        <Dialog open={!!siteToDelete} onClose={() => setSiteToDelete(null)}>
          <DialogContent>
            <DialogHeader onClose={() => setSiteToDelete(null)}>
              Deactivate Dump Site
            </DialogHeader>
            <DialogBody>
              <p className="text-text-primary">
                Are you sure you want to deactivate <strong>{siteToDelete?.name}</strong>?
              </p>
              <p className="text-text-secondary mt-2">
                This will mark the site as inactive. It can be reactivated later.
              </p>
            </DialogBody>
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => setSiteToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deleteDumpSite.isPending}
              >
                {deleteDumpSite.isPending ? "Deactivating..." : "Deactivate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

/**
 * Form Modal for creating/editing dump sites
 */
function DumpSiteFormModal({
  open,
  onClose,
  editingSite,
}: {
  open: boolean;
  onClose: () => void;
  editingSite: DumpSite | null;
}) {
  const createDumpSite = useCreateDumpSite();
  const updateDumpSite = useUpdateDumpSite();

  const [name, setName] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressPostalCode, setAddressPostalCode] = useState("");
  const [feePerGallon, setFeePerGallon] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Reset form when modal opens or editing site changes
  useEffect(() => {
    if (editingSite) {
      setName(editingSite.name);
      setAddressState(editingSite.address_state);
      setAddressCity(editingSite.address_city || "");
      setAddressLine1(editingSite.address_line1 || "");
      setAddressPostalCode(editingSite.address_postal_code || "");
      setFeePerGallon((editingSite.fee_per_gallon * 100).toString()); // Convert to cents for display
      setContactName(editingSite.contact_name || "");
      setContactPhone(editingSite.contact_phone || "");
      setNotes(editingSite.notes || "");
      setIsActive(editingSite.is_active);
    } else {
      setName("");
      setAddressState("");
      setAddressCity("");
      setAddressLine1("");
      setAddressPostalCode("");
      setFeePerGallon("");
      setContactName("");
      setContactPhone("");
      setNotes("");
      setIsActive(true);
    }
  }, [editingSite, open]);

  // Auto-suggest fee when state changes
  const handleStateChange = (state: string) => {
    setAddressState(state);
    if (!editingSite && STATE_FEE_SUGGESTIONS[state] && !feePerGallon) {
      setFeePerGallon((STATE_FEE_SUGGESTIONS[state] * 100).toString());
    }
  };

  const handleSubmit = async () => {
    if (!name || !addressState || !feePerGallon) return;

    const feeInDollars = parseFloat(feePerGallon) / 100; // Convert cents to dollars

    const siteData: CreateDumpSiteInput | UpdateDumpSiteInput = {
      name,
      address_state: addressState.toUpperCase(),
      address_city: addressCity || undefined,
      address_line1: addressLine1 || undefined,
      address_postal_code: addressPostalCode || undefined,
      fee_per_gallon: feeInDollars,
      contact_name: contactName || undefined,
      contact_phone: contactPhone || undefined,
      notes: notes || undefined,
      is_active: isActive,
    };

    try {
      if (editingSite) {
        await updateDumpSite.mutateAsync({
          siteId: editingSite.id,
          input: siteData,
        });
        toastSuccess("Dump Site Updated", "The dump site has been updated successfully.");
      } else {
        await createDumpSite.mutateAsync(siteData as CreateDumpSiteInput);
        toastSuccess("Dump Site Created", "New dump site has been added.");
      }
      onClose();
    } catch (error) {
      toastError("Error", getErrorMessage(error));
    }
  };

  const isLoading = createDumpSite.isPending || updateDumpSite.isPending;
  const isValid = name && addressState && feePerGallon && parseFloat(feePerGallon) > 0;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent>
        <DialogHeader onClose={onClose}>
          {editingSite ? "Edit Dump Site" : "Add New Dump Site"}
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <Label htmlFor="site-name">Site Name *</Label>
              <Input
                id="site-name"
                placeholder="e.g., Texas Disposal Facility"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* State and City */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="site-state">State *</Label>
                <select
                  id="site-state"
                  value={addressState}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select state...</option>
                  {STATE_CODES.map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="site-city">City</Label>
                <Input
                  id="site-city"
                  placeholder="City name"
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <Label htmlFor="site-address">Street Address</Label>
              <Input
                id="site-address"
                placeholder="123 Main St"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
              />
            </div>

            {/* Postal Code */}
            <div>
              <Label htmlFor="site-postal">Postal Code</Label>
              <Input
                id="site-postal"
                placeholder="12345"
                value={addressPostalCode}
                onChange={(e) => setAddressPostalCode(e.target.value)}
              />
            </div>

            {/* Fee per Gallon */}
            <div>
              <Label htmlFor="site-fee">Fee per Gallon (cents) *</Label>
              <Input
                id="site-fee"
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="7"
                value={feePerGallon}
                onChange={(e) => setFeePerGallon(e.target.value)}
              />
              <p className="text-xs text-text-secondary mt-1">
                Enter fee in cents (e.g., 7 for 7¢/gallon = $0.07/gallon)
                {addressState && STATE_FEE_SUGGESTIONS[addressState] && (
                  <span className="ml-2 text-primary">
                    Suggested for {addressState}: {(STATE_FEE_SUGGESTIONS[addressState] * 100).toFixed(0)}¢
                  </span>
                )}
              </p>
            </div>

            {/* Contact Information */}
            <div className="border-t border-border pt-4 mt-4">
              <h4 className="font-medium text-text-primary mb-3">Contact Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact-name">Contact Name</Label>
                  <Input
                    id="contact-name"
                    placeholder="John Doe"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="contact-phone">Phone</Label>
                  <Input
                    id="contact-phone"
                    placeholder="(555) 123-4567"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="site-notes">Notes</Label>
              <textarea
                id="site-notes"
                rows={3}
                placeholder="Any additional notes about this site..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* Active Status (for editing) */}
            {editingSite && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="site-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                />
                <Label htmlFor="site-active" className="cursor-pointer">
                  Active
                </Label>
              </div>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
          >
            {isLoading
              ? "Saving..."
              : editingSite
                ? "Update Site"
                : "Add Site"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
