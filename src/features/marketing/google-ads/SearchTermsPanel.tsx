import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import {
  useSearchTermsAnalysis,
  useNegativeKeywords,
  useSaveNegativeKeyword,
  type SearchTermAnalysis,
} from "@/api/hooks/useMarketingHub.ts";

const FLAG_CONFIG = {
  competitor: { label: "Competitor", color: "danger" as const, bg: "bg-red-50 dark:bg-red-900/20" },
  out_of_area: { label: "Out of Area", color: "warning" as const, bg: "bg-yellow-50 dark:bg-yellow-900/20" },
  irrelevant: { label: "Irrelevant", color: "info" as const, bg: "bg-orange-50 dark:bg-orange-900/20" },
};

export function SearchTermsPanel() {
  const [days, setDays] = useState(7);
  const { data, isLoading } = useSearchTermsAnalysis(days);
  const { data: negativeData } = useNegativeKeywords();
  const saveNegative = useSaveNegativeKeyword();
  const [copiedEditor, setCopiedEditor] = useState(false);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v);

  const handleFlag = (term: SearchTermAnalysis) => {
    saveNegative.mutate({
      keyword: term.search_term,
      match_type: "exact",
      source: "search_terms",
      campaign_name: term.campaign,
      category: term.category || "manual",
      estimated_waste: term.cost,
    });
  };

  const handleCopyAll = () => {
    if (negativeData?.editor_format) {
      navigator.clipboard.writeText(negativeData.editor_format);
      setCopiedEditor(true);
      setTimeout(() => setCopiedEditor(false), 2000);
    }
  };

  const summary = data?.summary;
  const alreadyFlagged = new Set(negativeData?.keywords?.map((k) => k.keyword.toLowerCase()) || []);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && summary.total_waste > 0 && (
        <Card className="border-red-300 dark:border-red-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Estimated Monthly Waste</p>
                <p className="text-3xl font-bold text-red-600">
                  {formatCurrency(summary.total_waste_monthly)}/mo
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  {summary.flagged_count} of {summary.total_count} terms flagged
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-text-secondary">Competitor</p>
                  <p className="text-lg font-semibold text-red-600">{formatCurrency(summary.competitor_waste)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Out of Area</p>
                  <p className="text-lg font-semibold text-yellow-600">{formatCurrency(summary.out_of_area_waste)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Irrelevant</p>
                  <p className="text-lg font-semibold text-orange-600">{formatCurrency(summary.irrelevant_waste)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
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
          {negativeData && negativeData.total > 0 && (
            <Badge variant="info">{negativeData.total} in queue</Badge>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopyAll}
          disabled={!negativeData?.total}
        >
          {copiedEditor ? "Copied!" : "Copy All Negatives"}
        </Button>
      </div>

      {/* Search Terms Table */}
      <Card>
        <CardHeader>
          <CardTitle>Search Terms Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-surface-hover rounded" />
              ))}
            </div>
          ) : data?.terms?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 font-medium text-text-secondary">Search Term</th>
                    <th className="pb-2 font-medium text-text-secondary">Campaign</th>
                    <th className="pb-2 font-medium text-text-secondary text-right">Clicks</th>
                    <th className="pb-2 font-medium text-text-secondary text-right">Cost</th>
                    <th className="pb-2 font-medium text-text-secondary text-right">Conv.</th>
                    <th className="pb-2 font-medium text-text-secondary">Flag</th>
                    <th className="pb-2 font-medium text-text-secondary"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.terms.map((term, idx) => {
                    const flagCfg = term.flag ? FLAG_CONFIG[term.flag] : null;
                    const isQueued = alreadyFlagged.has(term.search_term.toLowerCase());
                    return (
                      <tr
                        key={idx}
                        className={`border-b border-border/50 ${flagCfg ? flagCfg.bg : ""}`}
                      >
                        <td className="py-2.5 font-medium text-text-primary max-w-[280px] truncate">
                          {term.search_term}
                        </td>
                        <td className="py-2.5 text-text-secondary text-xs max-w-[160px] truncate">
                          {term.campaign}
                        </td>
                        <td className="py-2.5 text-right">{term.clicks}</td>
                        <td className="py-2.5 text-right">{formatCurrency(term.cost)}</td>
                        <td className="py-2.5 text-right">{term.conversions}</td>
                        <td className="py-2.5">
                          {flagCfg && <Badge variant={flagCfg.color}>{flagCfg.label}</Badge>}
                        </td>
                        <td className="py-2.5 text-right">
                          {term.flag && !isQueued ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFlag(term)}
                              disabled={saveNegative.isPending}
                            >
                              Flag
                            </Button>
                          ) : isQueued ? (
                            <span className="text-xs text-text-secondary">Queued</span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-text-secondary">
              <p>No search term data available</p>
              <p className="text-sm mt-1">Search terms appear after your ads receive clicks</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
