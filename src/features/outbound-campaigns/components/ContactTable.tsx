import { useState, useMemo } from "react";
import { useOutboundStore } from "../store";
import {
  CALL_STATUS_CONFIG,
  ZONE_CONFIG,
  type CampaignContact,
  type ContactCallStatus,
} from "../types";
import { Phone, Search, Filter, Trash2, StickyNote } from "lucide-react";

interface ContactTableProps {
  campaignId: string;
  onDialContact: (contact: CampaignContact) => void;
}

type FilterMode = "all" | "pending" | "called" | "interested" | "callback" | "completed";

export function ContactTable({ campaignId, onDialContact }: ContactTableProps) {
  const allContacts = useOutboundStore((s) => s.contacts);
  const contacts = useMemo(
    () => allContacts.filter((c) => c.campaign_id === campaignId),
    [allContacts, campaignId],
  );

  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [notesId, setNotesId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");

  // Collect unique zones for the filter dropdown
  const availableZones = useMemo(() => {
    const zones = new Set<string>();
    for (const c of contacts) {
      if (c.service_zone) zones.add(c.service_zone);
    }
    return Array.from(zones).sort();
  }, [contacts]);

  const filtered = useMemo(() => {
    let list = contacts;

    // Filter by zone
    if (zoneFilter !== "all") {
      list = list.filter((c) => c.service_zone === zoneFilter);
    }

    // Filter by status group
    if (filterMode === "pending") {
      list = list.filter((c) => ["pending", "queued"].includes(c.call_status));
    } else if (filterMode === "called") {
      list = list.filter((c) =>
        ["calling", "connected", "voicemail", "no_answer", "busy"].includes(c.call_status),
      );
    } else if (filterMode === "interested") {
      list = list.filter((c) => c.call_status === "interested");
    } else if (filterMode === "callback") {
      list = list.filter((c) => c.call_status === "callback_scheduled");
    } else if (filterMode === "completed") {
      list = list.filter((c) =>
        ["completed", "interested", "not_interested", "wrong_number", "do_not_call"].includes(
          c.call_status,
        ),
      );
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.account_name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.account_number?.includes(q) ||
          c.service_zone?.toLowerCase().includes(q) ||
          c.zip_code?.includes(q) ||
          c.address?.toLowerCase().includes(q),
      );
    }

    return list;
  }, [contacts, filterMode, zoneFilter, search]);

  const filters: { key: FilterMode; label: string; count: number }[] = [
    { key: "all", label: "All", count: contacts.length },
    {
      key: "pending",
      label: "Pending",
      count: contacts.filter((c) => ["pending", "queued"].includes(c.call_status)).length,
    },
    {
      key: "callback",
      label: "Callbacks",
      count: contacts.filter((c) => c.call_status === "callback_scheduled").length,
    },
    {
      key: "interested",
      label: "Interested",
      count: contacts.filter((c) => c.call_status === "interested").length,
    },
    {
      key: "called",
      label: "Called",
      count: contacts.filter((c) =>
        ["calling", "connected", "voicemail", "no_answer", "busy"].includes(c.call_status),
      ).length,
    },
    {
      key: "completed",
      label: "Completed",
      count: contacts.filter((c) =>
        ["completed", "interested", "not_interested", "wrong_number", "do_not_call"].includes(
          c.call_status,
        ),
      ).length,
    },
  ];

  function handleQuickDisposition(id: string, status: ContactCallStatus) {
    useOutboundStore.getState().setContactCallStatus(id, status);
  }

  function saveNotes(id: string) {
    useOutboundStore.getState().updateContact(id, { notes: notesText });
    setNotesId(null);
    setNotesText("");
  }

  function formatPhone(digits: string) {
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return digits;
  }

  function getZoneBadge(serviceZone: string | null) {
    if (!serviceZone) return null;
    // Look up by exact match first, then try to find a matching key
    const conf = ZONE_CONFIG[serviceZone] ??
      Object.entries(ZONE_CONFIG).find(([k]) => serviceZone.includes(k.split(" - ")[0]))?.[1];
    if (!conf) return <span className="text-xs text-text-tertiary">{serviceZone}</span>;
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${conf.color}`}>
        {conf.shortLabel}
      </span>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="text-center py-12 text-text-tertiary text-sm">
        No contacts in this campaign. Import from an Excel file to get started.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            placeholder="Search contacts, zones, zip codes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-bg-body text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Zone filter dropdown */}
        {availableZones.length > 1 && (
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="text-xs bg-bg-body border border-border rounded-lg px-2 py-2 text-text-secondary cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Zones</option>
            {availableZones.map((z) => {
              const conf = ZONE_CONFIG[z];
              return (
                <option key={z} value={z}>
                  {conf ? conf.shortLabel + " — " : ""}{z}
                </option>
              );
            })}
          </select>
        )}

        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-text-tertiary" />
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterMode(f.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterMode === f.key
                  ? "bg-primary text-white"
                  : "bg-bg-hover text-text-secondary hover:text-text-primary"
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-hover border-b border-border text-text-secondary text-xs">
              <th className="px-3 py-2 text-left font-medium">Contact</th>
              <th className="px-3 py-2 text-left font-medium">Zone</th>
              <th className="px-3 py-2 text-left font-medium">Phone</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">Attempts</th>
              <th className="px-3 py-2 text-left font-medium">Contract</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((contact) => {
              const statusConf = CALL_STATUS_CONFIG[contact.call_status];
              return (
                <tr
                  key={contact.id}
                  className="border-b border-border last:border-0 hover:bg-bg-hover/50"
                >
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-text-primary">
                      {contact.account_name}
                    </div>
                    {contact.company && (
                      <div className="text-xs text-text-tertiary">
                        {contact.company}
                      </div>
                    )}
                    {contact.zip_code && (
                      <div className="text-[10px] text-text-tertiary font-mono">
                        {contact.zip_code}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {getZoneBadge(contact.service_zone)}
                  </td>
                  <td className="px-3 py-2.5 text-text-primary font-mono text-xs">
                    {formatPhone(contact.phone)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusConf.color}`}
                    >
                      <span>{statusConf.icon}</span>
                      {statusConf.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-text-secondary text-xs">
                    {contact.call_attempts > 0 ? contact.call_attempts : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-text-secondary text-xs">
                    <div>{contact.contract_status || contact.contract_type || "-"}</div>
                    {contact.days_since_expiry != null && contact.days_since_expiry > 0 && (
                      <div className="text-[10px] text-amber-600">
                        {contact.days_since_expiry}d expired
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {/* Quick disposition buttons */}
                      {["pending", "queued", "no_answer", "busy", "callback_scheduled"].includes(
                        contact.call_status,
                      ) && (
                        <button
                          onClick={() => onDialContact(contact)}
                          className="p-1.5 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-600 hover:bg-green-100 dark:hover:bg-green-950/50"
                          title="Dial"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setNotesId(contact.id);
                          setNotesText(contact.notes || "");
                        }}
                        className="p-1.5 rounded-lg hover:bg-bg-hover text-text-secondary"
                        title="Notes"
                      >
                        <StickyNote className="w-3.5 h-3.5" />
                      </button>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleQuickDisposition(
                              contact.id,
                              e.target.value as ContactCallStatus,
                            );
                          }
                        }}
                        className="text-xs bg-transparent border border-border rounded-lg px-1.5 py-1 text-text-secondary cursor-pointer"
                      >
                        <option value="">Set status...</option>
                        <option value="interested">Interested</option>
                        <option value="not_interested">Not Interested</option>
                        <option value="voicemail">Voicemail</option>
                        <option value="no_answer">No Answer</option>
                        <option value="busy">Busy</option>
                        <option value="callback_scheduled">Callback</option>
                        <option value="wrong_number">Wrong Number</option>
                        <option value="do_not_call">Do Not Call</option>
                        <option value="completed">Completed</option>
                      </select>
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${contact.account_name}?`)) {
                            useOutboundStore.getState().removeContact(contact.id);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-text-secondary hover:text-red-500"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-text-tertiary">
        Showing {filtered.length} of {contacts.length} contacts
      </div>

      {/* Notes modal */}
      {notesId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setNotesId(null)}
          />
          <div className="relative bg-bg-card border border-border rounded-xl shadow-xl max-w-md w-full mx-4 p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Contact Notes
            </h3>
            <textarea
              autoFocus
              rows={4}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg-body text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Add notes about this contact..."
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setNotesId(null)}
                className="px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={() => saveNotes(notesId)}
                className="px-3 py-1.5 rounded-lg text-sm bg-primary text-white hover:bg-primary/90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
