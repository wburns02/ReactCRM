import { useState } from "react";
import { useRealtorStore } from "../store";
import { ReferralForm } from "./ReferralForm";
import {
  REALTOR_STAGE_LABELS,
  REALTOR_STAGE_COLORS,
  REALTOR_STAGES,
  REALTOR_DISPOSITION_LABELS,
} from "../types";
import type { RealtorAgent, RealtorStage, Referral } from "../types";
import {
  X, Phone, Mail, MapPin, Building2, ChevronRight, ChevronLeft,
  Trash2, Edit, DollarSign, FileText, ExternalLink, Clock,
} from "lucide-react";

interface AgentDetailPanelProps {
  agent: RealtorAgent;
  onClose: () => void;
  onEdit: () => void;
}

export function AgentDetailPanel({ agent, onClose, onEdit }: AgentDetailPanelProps) {
  const setAgentStage = useRealtorStore((s) => s.setAgentStage);
  const deleteAgent = useRealtorStore((s) => s.deleteAgent);
  const referrals = useRealtorStore((s) => s.referrals).filter((r) => r.realtor_id === agent.id);
  const [referralFormOpen, setReferralFormOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const currentStageIdx = REALTOR_STAGES.indexOf(agent.stage);

  function handleAdvanceStage() {
    if (currentStageIdx < REALTOR_STAGES.length - 1) {
      setAgentStage(agent.id, REALTOR_STAGES[currentStageIdx + 1]);
    }
  }

  function handleRegressStage() {
    if (currentStageIdx > 0) {
      setAgentStage(agent.id, REALTOR_STAGES[currentStageIdx - 1]);
    }
  }

  function handleDelete() {
    deleteAgent(agent.id);
    onClose();
  }

  function handleCall() {
    // Use the Web Phone by navigating to the web-phone page with the number
    window.open(`/web-phone?dial=${agent.phone}`, "_self");
  }

  function handleEmail() {
    const subject = encodeURIComponent("MAC Septic — Real Estate Inspection Partner");
    const body = encodeURIComponent(
      `Hi ${agent.first_name},\n\nGreat speaking with you! As discussed, MAC Septic handles real estate septic inspections in the Nashville area.\n\n` +
      `Quick summary:\n• Pump-out + Inspection: $825 flat\n• Usually 3-5 business day turnaround (same-day/next-day available)\n• Detailed reports with photos and repair recommendations\n• Coverage: South Nashville to 25-30 miles south of Columbia\n\n` +
      `I've attached our one-page overview for your reference. Feel free to call us anytime at 512.737.8711.\n\nBest,\nDannia\nMAC Septic Services`
    );
    window.open(`mailto:${agent.email}?subject=${subject}&body=${body}`, "_blank");
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="bg-bg-card w-full max-w-md h-full overflow-y-auto shadow-2xl border-l border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-bg-card z-10 px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-text-primary">
              {agent.first_name} {agent.last_name}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary">
              <X className="w-5 h-5" />
            </button>
          </div>
          {agent.brokerage && (
            <div className="text-sm text-text-secondary flex items-center gap-1.5 mb-3">
              <Building2 className="w-4 h-4" />
              {agent.brokerage}
            </div>
          )}

          {/* Stage Control */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRegressStage}
              disabled={currentStageIdx === 0}
              className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary disabled:opacity-30"
              title="Move to previous stage"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className={`flex-1 text-center text-sm font-bold px-3 py-1.5 rounded-full ${REALTOR_STAGE_COLORS[agent.stage]}`}>
              {REALTOR_STAGE_LABELS[agent.stage]}
            </span>
            <button
              onClick={handleAdvanceStage}
              disabled={currentStageIdx === REALTOR_STAGES.length - 1}
              className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary disabled:opacity-30"
              title="Advance to next stage"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-3 border-b border-border flex gap-2">
          <button
            onClick={handleCall}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
          >
            <Phone className="w-4 h-4" />
            Call
          </button>
          {agent.email && (
            <button
              onClick={handleEmail}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm font-medium"
              title="Send one-pager via email"
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
          )}
          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-bg-hover text-sm font-medium text-text-secondary"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>

        {/* Contact Info */}
        <div className="px-6 py-4 border-b border-border space-y-2">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Contact</h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-text-primary">
              <Phone className="w-3.5 h-3.5 text-text-secondary" />
              {agent.phone}
              {agent.cell && <span className="text-text-secondary">/ {agent.cell}</span>}
            </div>
            {agent.email && (
              <div className="flex items-center gap-2 text-text-primary">
                <Mail className="w-3.5 h-3.5 text-text-secondary" />
                {agent.email}
              </div>
            )}
            {(agent.coverage_area || agent.city) && (
              <div className="flex items-center gap-2 text-text-primary">
                <MapPin className="w-3.5 h-3.5 text-text-secondary" />
                {agent.coverage_area || agent.city}{agent.state ? `, ${agent.state}` : ""}
              </div>
            )}
          </div>
        </div>

        {/* Call History Summary */}
        <div className="px-6 py-4 border-b border-border space-y-2">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Activity</h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-bg-hover rounded-lg p-2">
              <div className="text-lg font-bold text-text-primary">{agent.call_attempts}</div>
              <div className="text-xs text-text-secondary">Calls</div>
            </div>
            <div className="bg-bg-hover rounded-lg p-2">
              <div className="text-lg font-bold text-text-primary">{agent.total_referrals}</div>
              <div className="text-xs text-text-secondary">Referrals</div>
            </div>
            <div className="bg-bg-hover rounded-lg p-2">
              <div className="text-lg font-bold text-emerald-600">${agent.total_revenue.toLocaleString()}</div>
              <div className="text-xs text-text-secondary">Revenue</div>
            </div>
          </div>
          {agent.last_call_date && (
            <div className="text-xs text-text-secondary flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Last contact: {new Date(agent.last_call_date).toLocaleDateString()}
              {agent.last_disposition && (
                <span className="ml-1">
                  — {REALTOR_DISPOSITION_LABELS[agent.last_disposition] || agent.last_disposition}
                </span>
              )}
            </div>
          )}
          {agent.one_pager_sent && (
            <div className="text-xs text-emerald-600 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              One-pager sent {agent.one_pager_sent_date ? new Date(agent.one_pager_sent_date).toLocaleDateString() : ""}
            </div>
          )}
          {agent.current_inspector && (
            <div className="text-xs text-text-secondary">
              Current inspector: <span className="font-medium text-text-primary">{agent.current_inspector}</span>
            </div>
          )}
        </div>

        {/* Referrals */}
        <div className="px-6 py-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Referrals</h3>
            <button
              onClick={() => setReferralFormOpen(true)}
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              <DollarSign className="w-3.5 h-3.5" />
              Log Referral
            </button>
          </div>
          {referrals.length === 0 ? (
            <p className="text-sm text-text-secondary">No referrals yet.</p>
          ) : (
            <div className="space-y-2">
              {referrals.map((ref) => (
                <div key={ref.id} className="bg-bg-hover rounded-lg p-3 text-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-text-primary">{ref.property_address}</div>
                      {ref.homeowner_name && (
                        <div className="text-xs text-text-secondary">{ref.homeowner_name}</div>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      ref.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                      ref.status === "completed" ? "bg-blue-100 text-blue-700" :
                      ref.status === "scheduled" ? "bg-amber-100 text-amber-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {ref.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-text-secondary">
                    <span>{ref.service_type}</span>
                    {ref.invoice_amount && <span className="font-medium text-emerald-600">${ref.invoice_amount}</span>}
                    <span>{new Date(ref.referred_date).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        {agent.notes && (
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Notes</h3>
            <p className="text-sm text-text-primary whitespace-pre-wrap">{agent.notes}</p>
          </div>
        )}

        {/* Delete */}
        <div className="px-6 py-4">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Delete Agent
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-red-600 font-medium">Delete {agent.first_name}?</span>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 border border-border rounded-lg text-sm text-text-secondary hover:bg-bg-hover"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Referral Form Modal */}
      {referralFormOpen && (
        <ReferralForm
          realtorId={agent.id}
          realtorName={`${agent.first_name} ${agent.last_name}`}
          onClose={() => setReferralFormOpen(false)}
        />
      )}
    </div>
  );
}
