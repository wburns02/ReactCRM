/**
 * DeviceBindModal — tech-facing pairing flow.
 *
 * Tech selects an existing customer (CustomerCombobox), picks install_type
 * (conventional vs ATU), optionally fills site address overrides, then submits.
 *
 * Backend: POST /iot/devices/{id}/bind  (see react-crm-api `bind_device`).
 */
import { useEffect, useState } from "react";
import { Cpu } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { CustomerCombobox } from "@/components/ui/CustomerCombobox";
import { toastError, toastSuccess } from "@/components/ui/Toast";
import { getErrorMessage } from "@/api/client";

import { useBindDevice } from "@/api/hooks/useIoT";
import {
  INSTALL_TYPE_LABELS,
  type IoTDevice,
  type InstallType,
} from "@/api/types/iot";

interface DeviceBindModalProps {
  open: boolean;
  onClose: () => void;
  device: IoTDevice | null;
}

export function DeviceBindModal({
  open,
  onClose,
  device,
}: DeviceBindModalProps) {
  const bind = useBindDevice();

  const [customerId, setCustomerId] = useState<string>("");
  const [installType, setInstallType] = useState<InstallType>("conventional");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postal, setPostal] = useState("");
  const [notes, setNotes] = useState("");

  // Reset form when reopening on a new device.
  // We intentionally re-seed local state from props whenever the modal opens
  // for a different device — it's a one-shot sync, not cascading state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!open) return;
    setCustomerId(device?.customer_id ?? "");
    setInstallType((device?.install_type as InstallType) ?? "conventional");
    const addr = (device?.site_address ?? {}) as Record<string, unknown>;
    setAddressLine1(typeof addr.line1 === "string" ? addr.line1 : "");
    setCity(typeof addr.city === "string" ? addr.city : "");
    setState(typeof addr.state === "string" ? addr.state : "");
    setPostal(typeof addr.postal_code === "string" ? addr.postal_code : "");
    setNotes("");
  }, [open, device]);

  if (!device) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      toastError("Pick a customer to bind this device to.");
      return;
    }

    const site_address: Record<string, string> = {};
    if (addressLine1.trim()) site_address.line1 = addressLine1.trim();
    if (city.trim()) site_address.city = city.trim();
    if (state.trim()) site_address.state = state.trim();
    if (postal.trim()) site_address.postal_code = postal.trim();

    try {
      await bind.mutateAsync({
        device_id: device.id,
        payload: {
          customer_id: customerId,
          install_type: installType,
          site_address:
            Object.keys(site_address).length > 0 ? site_address : null,
          notes: notes.trim() || null,
        },
      });
      toastSuccess("Device bound to customer");
      onClose();
    } catch (err) {
      toastError(`Bind failed: ${getErrorMessage(err)}`);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} ariaLabel="Bind IoT device">
      <DialogContent size="lg">
        <DialogHeader onClose={onClose}>
          <span className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" />
            Bind Device — {device.serial}
          </span>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <Label className="mb-1 block">Customer</Label>
                <CustomerCombobox
                  value={customerId}
                  onChange={setCustomerId}
                  hideLabel
                />
              </div>

              <div>
                <Label htmlFor="install-type" className="mb-1 block">
                  Install Type
                </Label>
                <Select
                  id="install-type"
                  value={installType}
                  onChange={(e) =>
                    setInstallType(e.target.value as InstallType)
                  }
                >
                  {(["conventional", "atu"] as const).map((t) => (
                    <option key={t} value={t}>
                      {INSTALL_TYPE_LABELS[t]}
                    </option>
                  ))}
                </Select>
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-text-primary mb-1">
                  Site Address (optional)
                </legend>
                <Input
                  placeholder="Street address"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                  <Input
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                  <Input
                    placeholder="ZIP"
                    value={postal}
                    onChange={(e) => setPostal(e.target.value)}
                  />
                </div>
                <p className="text-xs text-text-muted">
                  Leave blank to inherit the customer's primary address.
                </p>
              </fieldset>

              <div>
                <Label htmlFor="bind-notes" className="mb-1 block">
                  Install Notes
                </Label>
                <Textarea
                  id="bind-notes"
                  placeholder="OEM panel make/model, sensor card configuration, anything weird about the install..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={bind.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!customerId || bind.isPending}
            >
              {bind.isPending ? "Binding…" : "Bind Device"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
