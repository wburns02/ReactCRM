import { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Button } from "@/components/ui/Button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog.tsx";
import {
  useSegments,
  useSegmentCustomers,
} from "@/api/hooks/useEmailMarketing.ts";
import type { SubscriptionTier, Segment } from "@/api/types/emailMarketing.ts";
import { formatDate, formatPhone } from "@/lib/utils.ts";

interface SegmentsTabProps {
  tier: SubscriptionTier;
}

// Segment icons and colors
const SEGMENT_CONFIG: Record<
  string,
  { icon: string; color: string; description: string }
> = {
  all: {
    icon: "👥",
    color: "bg-blue-100 text-blue-800",
    description: "All customers in your database",
  },
  active: {
    icon: "✅",
    color: "bg-green-100 text-green-800",
    description: "Serviced within the last 12 months",
  },
  at_risk: {
    icon: "⚠️",
    color: "bg-yellow-100 text-yellow-800",
    description: "Serviced 12-24 months ago",
  },
  dormant: {
    icon: "💤",
    color: "bg-red-100 text-red-800",
    description: "No service in 24+ months",
  },
  vip: {
    icon: "⭐",
    color: "bg-purple-100 text-purple-800",
    description: "High-value customers",
  },
  new: {
    icon: "🆕",
    color: "bg-teal-100 text-teal-800",
    description: "Added in the last 6 months",
  },
  service_due: {
    icon: "📅",
    color: "bg-orange-100 text-orange-800",
    description: "Pumping due this month",
  },
  birthday: {
    icon: "🎂",
    color: "bg-pink-100 text-pink-800",
    description: "Birthday this month",
  },
};

export function SegmentsTab({ tier }: SegmentsTabProps) {
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [isViewingCustomers, setIsViewingCustomers] = useState(false);

  const { data: segments = [], isLoading } = useSegments();
  const { data: segmentData, isLoading: customersLoading } =
    useSegmentCustomers(selectedSegment?.id || "", 50);

  const customers = segmentData?.customers || [];
  const canViewDetails = tier !== "none";

  const handleViewCustomers = (segment: Segment) => {
    if (!canViewDetails) return;
    setSelectedSegment(segment);
    setIsViewingCustomers(true);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (segments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-4xl mb-4">👥</div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            No segments available
          </h3>
          <p className="text-text-secondary">
            Customer segments will appear here once you have customers in your
            database.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-text-secondary">
          Customer segments help you target the right audience for your
          campaigns.
        </p>
      </div>

      {/* Segments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {segments.map((segment) => {
          const config = SEGMENT_CONFIG[segment.id] || {
            icon: "📋",
            color: "bg-gray-100 text-gray-800",
            description: segment.description || "Custom segment",
          };

          return (
            <Card
              key={segment.id}
              className={`hover:shadow-md transition-shadow ${canViewDetails ? "cursor-pointer" : ""}`}
              onClick={() => handleViewCustomers(segment)}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${config.color}`}
                    >
                      <span className="text-lg">{config.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-primary capitalize">
                        {segment.name.replace(/_/g, " ")}
                      </h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-text-primary">
                      {segment.count}
                    </p>
                    <p className="text-xs text-text-muted">customers</p>
                  </div>
                </div>
                <p className="text-sm text-text-secondary">
                  {config.description}
                </p>
                {canViewDetails && (
                  <Button size="sm" variant="secondary" className="mt-3 w-full">
                    View Customers
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* View Customers Modal */}
      <Dialog
        open={isViewingCustomers}
        onClose={() => setIsViewingCustomers(false)}
      >
        <DialogContent size="lg">
          <DialogHeader onClose={() => setIsViewingCustomers(false)}>
            {selectedSegment && (
              <span className="capitalize">
                {selectedSegment.name.replace(/_/g, " ")} (
                {selectedSegment.count} customers)
              </span>
            )}
          </DialogHeader>
          <DialogBody>
            {customersLoading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-bg-muted rounded" />
                ))}
              </div>
            ) : customers.length === 0 ? (
              <p className="text-center text-text-muted py-8">
                No customers in this segment.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {customers.map((customer: Record<string, unknown>) => (
                  <div
                    key={String(customer.id)}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-bg-hover"
                  >
                    <div>
                      <p className="font-medium text-text-primary">
                        {String(customer.first_name || "")}{" "}
                        {String(customer.last_name || "")}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {String(customer.email || "")}
                        {customer.phone
                          ? ` • ${formatPhone(String(customer.phone))}`
                          : null}
                      </p>
                      {customer.city ? (
                        <p className="text-xs text-text-muted">
                          {String(customer.city)},{" "}
                          {String(customer.state || "")}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      {customer.last_service_date ? (
                        <p className="text-sm text-text-secondary">
                          Last service:{" "}
                          {formatDate(String(customer.last_service_date))}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
                {customers.length >= 50 && (
                  <p className="text-center text-text-muted text-sm py-2">
                    Showing first 50 customers
                  </p>
                )}
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsViewingCustomers(false)}
            >
              Close
            </Button>
            {selectedSegment && canViewDetails && (
              <Button>Create Campaign for Segment</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
