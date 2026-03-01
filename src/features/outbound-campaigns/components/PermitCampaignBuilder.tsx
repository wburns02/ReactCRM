import { useState } from "react";
import {
  useProspects,
} from "@/api/hooks/usePermits.ts";
import type { ProspectFilters, ProspectRecord } from "@/api/types/permit.ts";
import { useOutboundStore } from "../store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Input } from "@/components/ui/Input.tsx";
import { Select } from "@/components/ui/Select.tsx";
import { Label } from "@/components/ui/Label.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { apiClient } from "@/api/client.ts";
import {
  Search,
  Download,
  UserPlus,
  Filter,
  MapPin,
  Calendar,
  Phone,
} from "lucide-react";
import { formatDate } from "@/lib/utils.ts";

export function PermitCampaignBuilder() {
  const [filters, setFilters] = useState<ProspectFilters>({
    page: 1,
    page_size: 50,
  });
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading } = useProspects(searchTriggered ? filters : {});
  const createCampaign = useOutboundStore((s) => s.createCampaign);
  const importContacts = useOutboundStore((s) => s.importContacts);

  const prospects = data?.prospects || [];
  const total = data?.total || 0;

  const handleSearch = () => {
    setSearchTriggered(true);
  };

  const handleCreateCampaign = () => {
    if (!campaignName.trim() || prospects.length === 0) return;

    // Create campaign
    const campaignId = createCampaign({
      name: campaignName.trim(),
      description: `Permit-sourced campaign: ${buildFilterDescription()}`,
      status: "draft",
    });

    // Convert prospects to campaign contacts
    const contacts = prospects.map((p: ProspectRecord) => ({
      account_name: p.owner_name || "Unknown",
      phone: p.phone || "",
      address: p.address || "",
      city: p.city || "",
      state: "TX",
      system_type: p.system_type || "",
      notes: p.system_age_years
        ? `System age: ${p.system_age_years} years. Permit date: ${p.permit_date || "N/A"}`
        : "",
    }));

    importContacts(campaignId, contacts);
    setCampaignName("");
    alert(`Campaign "${campaignName}" created with ${contacts.length} contacts`);
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.county) params.set("county", filters.county);
      if (filters.system_type) params.set("system_type", filters.system_type);
      if (filters.min_age != null) params.set("min_age", String(filters.min_age));
      if (filters.max_age != null) params.set("max_age", String(filters.max_age));
      if (filters.has_phone != null) params.set("has_phone", String(filters.has_phone));

      const response = await apiClient.post(
        `/permits/prospects/export?${params.toString()}`,
        {},
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "permit_prospects.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  function buildFilterDescription(): string {
    const parts: string[] = [];
    if (filters.county) parts.push(`County: ${filters.county}`);
    if (filters.system_type) parts.push(`Type: ${filters.system_type}`);
    if (filters.min_age) parts.push(`Min age: ${filters.min_age}yr`);
    if (filters.max_age) parts.push(`Max age: ${filters.max_age}yr`);
    if (filters.has_phone) parts.push("Has phone");
    return parts.join(", ") || "All permits";
  }

  return (
    <div className="space-y-6">
      {/* Filter Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
            Build Campaign from Permit Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-1">
              <Label>County</Label>
              <Input
                placeholder="e.g., Guadalupe"
                value={filters.county || ""}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, county: e.target.value || undefined }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>System Type</Label>
              <Select
                value={filters.system_type || ""}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, system_type: e.target.value || undefined }))
                }
              >
                <option value="">Any type</option>
                <option value="Aerobic">Aerobic / ATU</option>
                <option value="Conventional">Conventional</option>
                <option value="Spray">Spray</option>
                <option value="Drip">Drip</option>
                <option value="Mound">Mound</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Min System Age (years)</Label>
              <Input
                type="number"
                min="0"
                placeholder="e.g., 10"
                value={filters.min_age ?? ""}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, min_age: e.target.value ? Number(e.target.value) : undefined }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Max System Age (years)</Label>
              <Input
                type="number"
                min="0"
                placeholder="e.g., 30"
                value={filters.max_age ?? ""}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, max_age: e.target.value ? Number(e.target.value) : undefined }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Has Phone Number</Label>
              <Select
                value={filters.has_phone == null ? "" : String(filters.has_phone)}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    has_phone: e.target.value === "" ? undefined : e.target.value === "true",
                  }))
                }
              >
                <option value="">Any</option>
                <option value="true">Yes - has phone</option>
                <option value="false">No phone</option>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSearch} disabled={isLoading}>
              <Search className="w-4 h-4 mr-1" />
              {isLoading ? "Searching..." : "Search Prospects"}
            </Button>
            {searchTriggered && (
              <span className="text-sm text-text-secondary">
                Found <strong>{total.toLocaleString()}</strong> prospects
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {searchTriggered && prospects.length > 0 && (
        <>
          {/* Actions */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Campaign name (e.g., Guadalupe ATU 15+ Years)"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleCreateCampaign}
                  disabled={!campaignName.trim()}
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Create Campaign ({prospects.length})
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleExportCSV}
                  disabled={isExporting}
                >
                  <Download className="w-4 h-4 mr-1" />
                  {isExporting ? "Exporting..." : "Export CSV"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Prospect Table */}
          <Card>
            <CardHeader>
              <CardTitle>Prospect Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 font-medium text-text-secondary">Owner</th>
                      <th className="pb-2 font-medium text-text-secondary">Address</th>
                      <th className="pb-2 font-medium text-text-secondary">City</th>
                      <th className="pb-2 font-medium text-text-secondary">System</th>
                      <th className="pb-2 font-medium text-text-secondary">Age</th>
                      <th className="pb-2 font-medium text-text-secondary">Phone</th>
                      <th className="pb-2 font-medium text-text-secondary">Permit Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prospects.map((p) => (
                      <tr key={p.permit_id} className="border-b border-border/50 hover:bg-bg-hover">
                        <td className="py-2 font-medium">{p.owner_name || "—"}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-text-muted" />
                            {p.address || "—"}
                          </div>
                        </td>
                        <td className="py-2">{p.city || "—"}</td>
                        <td className="py-2">
                          {p.system_type ? (
                            <Badge variant="default">{p.system_type}</Badge>
                          ) : "—"}
                        </td>
                        <td className="py-2">
                          {p.system_age_years != null ? (
                            <span
                              className={`font-medium ${
                                p.system_age_years < 10
                                  ? "text-green-600"
                                  : p.system_age_years < 20
                                    ? "text-yellow-600"
                                    : "text-red-600"
                              }`}
                            >
                              {p.system_age_years}yr
                            </span>
                          ) : "—"}
                        </td>
                        <td className="py-2">
                          {p.phone ? (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-green-500" />
                              {p.phone}
                            </div>
                          ) : (
                            <span className="text-text-muted">No phone</span>
                          )}
                        </td>
                        <td className="py-2">
                          {p.permit_date ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-text-muted" />
                              {formatDate(p.permit_date)}
                            </div>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {total > (filters.page_size || 50) && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <span className="text-sm text-text-muted">
                    Page {filters.page || 1} of {Math.ceil(total / (filters.page_size || 50))}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={(filters.page || 1) <= 1}
                      onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={(filters.page || 1) >= Math.ceil(total / (filters.page_size || 50))}
                      onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty state */}
      {searchTriggered && !isLoading && prospects.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary font-medium">No prospects found</p>
            <p className="text-sm text-text-muted mt-1">
              Try adjusting your filters or broadening the search criteria
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
