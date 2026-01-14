import { useState } from "react";
import { Link } from "react-router-dom";
import { useRevenueByLocation, type RevenueByLocationItem } from "../api.ts";
import { DateRangePicker } from "../components/DateRangePicker.tsx";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card.tsx";
import type { DateRange } from "../types.ts";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function LocationReportPage() {
  const getDefaultDateRange = (): DateRange => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
      start_date: start.toISOString().split("T")[0],
      end_date: end.toISOString().split("T")[0],
    };
  };

  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const [groupBy, setGroupBy] = useState<"city" | "state" | "zip">("city");
  const { data, isLoading, error } = useRevenueByLocation(dateRange, groupBy);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
          <Link to="/reports" className="hover:text-primary">
            Reports
          </Link>
          <span>/</span>
          <span>Revenue by Location</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              Revenue by Location
            </h1>
            <p className="text-text-secondary mt-1">
              Geographic breakdown of revenue
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-text-muted">Group by:</label>
            <select
              value={groupBy}
              onChange={(e) =>
                setGroupBy(e.target.value as "city" | "state" | "zip")
              }
              className="px-3 py-2 border border-border rounded-md bg-bg-body text-text-primary"
            >
              <option value="city">City</option>
              <option value="state">State</option>
              <option value="zip">ZIP Code</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-text-secondary">
            Loading location revenue data...
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg">
          <p className="text-danger">
            Failed to load location data. Please try again.
          </p>
        </div>
      )}

      {/* Report content */}
      {!isLoading && !error && data && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                📍 Revenue by{" "}
                {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
              </CardTitle>
              <span className="text-lg font-semibold text-success">
                Total: {formatCurrency(data.total_revenue)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {data.locations.length > 0 ? (
              <>
                {/* Bar visualization */}
                <div className="space-y-3 mb-6">
                  {data.locations.map(
                    (loc: RevenueByLocationItem, index: number) => {
                      const percentage =
                        data.total_revenue > 0
                          ? (loc.revenue / data.total_revenue) * 100
                          : 0;
                      return (
                        <div key={loc.location}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-medium text-text-primary">
                              {index + 1}. {loc.location}
                            </span>
                            <span className="text-text-muted">
                              {loc.job_count} jobs •{" "}
                              {formatCurrency(loc.revenue)}
                            </span>
                          </div>
                          <div className="h-4 bg-bg-body rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${Math.max(percentage, 2)}%` }}
                            />
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>

                {/* Summary table */}
                <div className="border-t border-border pt-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 text-text-muted font-medium">
                          Location
                        </th>
                        <th className="text-right p-2 text-text-muted font-medium">
                          Jobs
                        </th>
                        <th className="text-right p-2 text-text-muted font-medium">
                          Revenue
                        </th>
                        <th className="text-right p-2 text-text-muted font-medium">
                          % of Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.locations.map((loc: RevenueByLocationItem) => (
                        <tr
                          key={loc.location}
                          className="border-b border-border/50"
                        >
                          <td className="p-2 font-medium text-text-primary">
                            {loc.location}
                          </td>
                          <td className="p-2 text-right text-text-secondary">
                            {loc.job_count}
                          </td>
                          <td className="p-2 text-right text-success font-medium">
                            {formatCurrency(loc.revenue)}
                          </td>
                          <td className="p-2 text-right text-text-muted">
                            {data.total_revenue > 0
                              ? (
                                  (loc.revenue / data.total_revenue) *
                                  100
                                ).toFixed(1)
                              : 0}
                            %
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="py-8 text-center">
                <p className="text-text-muted">No location data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default LocationReportPage;
