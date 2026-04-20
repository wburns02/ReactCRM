import { useState } from "react";
import { useRealtorStore } from "../store";
import type { Referral } from "../types";
import { X, Save, DollarSign } from "lucide-react";

interface ReferralFormProps {
  realtorId: string;
  realtorName: string;
  referral?: Referral | null;
  onClose: () => void;
}

export function ReferralForm({ realtorId, realtorName, referral, onClose }: ReferralFormProps) {
  const addReferral = useRealtorStore((s) => s.addReferral);
  const updateReferral = useRealtorStore((s) => s.updateReferral);

  const [propertyAddress, setPropertyAddress] = useState(referral?.property_address ?? "");
  const [homeownerName, setHomeownerName] = useState(referral?.homeowner_name ?? "");
  const [serviceType, setServiceType] = useState<Referral["service_type"]>(referral?.service_type ?? "inspection");
  const [invoiceAmount, setInvoiceAmount] = useState(referral?.invoice_amount?.toString() ?? "825");
  const [status, setStatus] = useState<Referral["status"]>(referral?.status ?? "pending");
  const [notes, setNotes] = useState(referral?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!propertyAddress.trim()) {
      setError("Property address is required");
      return;
    }

    const data = {
      realtor_id: realtorId,
      property_address: propertyAddress.trim(),
      homeowner_name: homeownerName.trim() || null,
      service_type: serviceType,
      invoice_amount: parseFloat(invoiceAmount) || null,
      status,
      referred_date: referral?.referred_date ?? new Date().toISOString(),
      completed_date: status === "completed" || status === "paid" ? new Date().toISOString() : null,
      notes: notes.trim() || null,
    };

    if (referral) {
      updateReferral(referral.id, data);
    } else {
      addReferral(data);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.stopPropagation()}>
      <div className="bg-bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            {referral ? "Edit Referral" : "Log Referral"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-sm text-text-secondary">
            Referral from <span className="font-semibold text-text-primary">{realtorName}</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Property Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={propertyAddress}
              onChange={(e) => setPropertyAddress(e.target.value)}
              placeholder="123 Main St, Nashville, TN"
              className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Homeowner Name</label>
              <input
                type="text"
                value={homeownerName}
                onChange={(e) => setHomeownerName(e.target.value)}
                placeholder="John Smith"
                className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Service Type</label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as Referral["service_type"])}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="inspection">Inspection ($825)</option>
                <option value="pumpout">Pump-Out ($625)</option>
                <option value="maintenance">Maintenance</option>
                <option value="repair">Repair</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Invoice Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
                <input
                  type="number"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-border text-sm bg-bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Referral["status"])}
                className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="pending">Pending</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-hover rounded-lg">
              Cancel
            </button>
            <button type="submit" className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm">
              <Save className="w-4 h-4" />
              {referral ? "Update" : "Log Referral"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
