import { useState } from "react";
import {
  useContractTemplates,
  type ContractTemplate,
} from "../api/contracts.ts";
import { Card, CardContent } from "@/components/ui/Card.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { Button } from "@/components/ui/Button.tsx";
import { formatCurrency } from "@/lib/utils.ts";

interface ContractTemplatesProps {
  onSelectTemplate?: (template: ContractTemplate) => void;
}

export function ContractTemplates({
  onSelectTemplate,
}: ContractTemplatesProps) {
  const [typeFilter, setTypeFilter] = useState<string>("");

  const { data, isLoading, error } = useContractTemplates({
    contract_type: typeFilter || undefined,
    active_only: true,
  });

  const templates = data?.items || [];

  if (error) {
    return (
      <div className="bg-bg-error/10 border border-border-error rounded-lg p-4 text-text-error">
        Error loading templates: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary"
          aria-label="Filter by type"
        >
          <option value="">All Types</option>
          <option value="maintenance">Maintenance</option>
          <option value="service">Service</option>
          <option value="annual">Annual</option>
          <option value="multi-year">Multi-Year</option>
        </select>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 bg-bg-muted rounded-lg animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && templates.length === 0 && (
        <div className="text-center py-12 border border-border rounded-lg">
          <span className="text-4xl mb-4 block">📋</span>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            No templates found
          </h3>
          <p className="text-text-muted">
            {typeFilter
              ? "Try adjusting your filters"
              : "Contract templates will appear here"}
          </p>
        </div>
      )}

      {/* Template grid */}
      {!isLoading && templates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className={`transition-all ${onSelectTemplate ? "cursor-pointer hover:border-primary" : ""}`}
              onClick={() => onSelectTemplate?.(template)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-full bg-purple-100 text-lg">
                    📋
                  </div>
                  <Badge variant="info" className="capitalize">
                    {template.contract_type}
                  </Badge>
                </div>

                <h3 className="font-semibold text-text-primary mb-1">
                  {template.name}
                </h3>
                <p className="text-sm text-text-muted mb-3">{template.code}</p>

                {template.description && (
                  <p className="text-sm text-text-muted mb-3 line-clamp-2">
                    {template.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">
                    {template.default_duration_months} months
                  </span>
                  {template.base_price && (
                    <span className="font-medium text-text-primary">
                      {formatCurrency(template.base_price)}
                    </span>
                  )}
                </div>

                {onSelectTemplate && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full mt-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTemplate(template);
                    }}
                  >
                    Use Template
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
