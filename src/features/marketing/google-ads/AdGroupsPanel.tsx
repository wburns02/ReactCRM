import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { apiClient } from "@/api/client.ts";
import { useQuery } from "@tanstack/react-query";

interface AdGroup {
  ad_group_id: string;
  ad_group_name: string;
  ad_group_status: string;
  campaign_name: string;
  cost: number;
  clicks: number;
  impressions: number;
  conversions: number;
  ctr: number;
  cpa: number | null;
}

export function AdGroupsPanel() {
  const [days, setDays] = useState(7);

  const { data, isLoading } = useQuery({
    queryKey: ["marketing", "ads", "ad-groups", days],
    queryFn: async () => {
      const response = await apiClient.get<{
        success: boolean;
        ad_groups: AdGroup[];
      }>(`/marketing-hub/ads/ad-groups?days=${days}`);
      return response.data;
    },
  });

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v);

  const getCpaColor = (cpa: number | null) => {
    if (cpa === null) return "";
    if (cpa < 50) return "bg-green-50 dark:bg-green-900/20";
    if (cpa <= 100) return "bg-yellow-50 dark:bg-yellow-900/20";
    return "bg-red-50 dark:bg-red-900/20";
  };

  const getCpaBadge = (cpa: number | null) => {
    if (cpa === null) return null;
    if (cpa < 50) return <Badge variant="success">Low CPA</Badge>;
    if (cpa <= 100) return <Badge variant="warning">Mid CPA</Badge>;
    return <Badge variant="danger">High CPA</Badge>;
  };

  // Sort by CPA ascending (nulls last)
  const sortedGroups = [...(data?.ad_groups || [])].sort((a, b) => {
    if (a.cpa === null && b.cpa === null) return 0;
    if (a.cpa === null) return 1;
    if (b.cpa === null) return -1;
    return a.cpa - b.cpa;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-2 bg-surface border border-border rounded-md text-sm"
        >
          <option value={1}>Yesterday</option>
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
        <p className="text-sm text-text-secondary">
          CPA Target: $80 | CTR Target: 3.5%
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ad Group Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-surface-hover rounded" />
              ))}
            </div>
          ) : sortedGroups.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 font-medium text-text-secondary">Ad Group</th>
                    <th className="pb-2 font-medium text-text-secondary">Campaign</th>
                    <th className="pb-2 font-medium text-text-secondary text-right">Spend</th>
                    <th className="pb-2 font-medium text-text-secondary text-right">Clicks</th>
                    <th className="pb-2 font-medium text-text-secondary text-right">Conv.</th>
                    <th className="pb-2 font-medium text-text-secondary text-right">CTR</th>
                    <th className="pb-2 font-medium text-text-secondary text-right">CPA</th>
                    <th className="pb-2 font-medium text-text-secondary">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedGroups.map((ag) => (
                    <tr
                      key={ag.ad_group_id}
                      className={`border-b border-border/50 ${getCpaColor(ag.cpa)}`}
                    >
                      <td className="py-2.5 font-medium text-text-primary max-w-[200px] truncate">
                        {ag.ad_group_name}
                      </td>
                      <td className="py-2.5 text-text-secondary text-xs max-w-[160px] truncate">
                        {ag.campaign_name}
                      </td>
                      <td className="py-2.5 text-right">{formatCurrency(ag.cost)}</td>
                      <td className="py-2.5 text-right">{ag.clicks}</td>
                      <td className="py-2.5 text-right">{ag.conversions}</td>
                      <td className="py-2.5 text-right">{(ag.ctr * 100).toFixed(2)}%</td>
                      <td className="py-2.5 text-right font-medium">
                        {ag.cpa !== null ? formatCurrency(ag.cpa) : "—"}
                      </td>
                      <td className="py-2.5">{getCpaBadge(ag.cpa)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-text-secondary">
              <p>No ad group data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
