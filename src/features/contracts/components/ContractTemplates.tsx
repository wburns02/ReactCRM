import { useState } from "react";
import {
  useContractTemplates,
  useSeedTemplates,
  type ContractTemplate,
} from "../api/contracts.ts";
import { ContractDocumentPreview } from "./ContractDocumentPreview.tsx";
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
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);

  const { data, isLoading, error } = useContractTemplates({
    contract_type: typeFilter || undefined,
    active_only: true,
  });
  const seedTemplates = useSeedTemplates();

  const templates = data?.items || [];

  // Show document preview if a template is selected for preview
  if (previewTemplateId) {
    return (
      <ContractDocumentPreview
        templateId={previewTemplateId}
        onClose={() => setPreviewTemplateId(null)}
      />
    );
  }

  if (error) {
    return (
      <div className="bg-bg-error/10 border border-border-error rounded-lg p-4 text-text-error">
        Error loading templates: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters & Actions */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
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
          <option value="commercial">Commercial</option>
        </select>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => seedTemplates.mutate(true)}
          disabled={seedTemplates.isPending}
        >
          {seedTemplates.isPending ? "Updating..." : "Update Templates"}
        </Button>
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
          <p className="text-text-muted mb-4">
            {typeFilter
              ? "Try adjusting your filters"
              : "Contract templates will appear here"}
          </p>
          {!typeFilter && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => seedTemplates.mutate(false)}
              disabled={seedTemplates.isPending}
            >
              {seedTemplates.isPending ? "Seeding..." : "Seed Default Templates"}
            </Button>
          )}
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
                  <div className="flex items-center gap-1.5">
                    {template.default_auto_renew && (
                      <Badge variant="success" className="text-xs">
                        Auto-Renew
                      </Badge>
                    )}
                    <Badge variant="info" className="capitalize">
                      {template.contract_type}
                    </Badge>
                  </div>
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

                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-text-muted">
                    {template.default_duration_months} months
                  </span>
                  {template.base_price && (
                    <span className="font-medium text-text-primary">
                      {formatCurrency(template.base_price)}
                    </span>
                  )}
                </div>

                {/* Services included */}
                {template.default_services && template.default_services.length > 0 && (
                  <div className="text-xs text-text-muted mb-3 space-y-0.5">
                    {template.default_services.slice(0, 3).map((svc, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span className="text-green-500">+</span>
                        <span>{svc.description}</span>
                        <span className="text-text-muted/60">({svc.frequency})</span>
                      </div>
                    ))}
                    {template.default_services.length > 3 && (
                      <div className="text-text-muted/60">
                        +{template.default_services.length - 3} more
                      </div>
                    )}
                  </div>
                )}

                {/* Terms summary */}
                {template.terms_and_conditions && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1 mb-3 line-clamp-2">
                    {template.terms_and_conditions}
                  </p>
                )}

                <div className="flex gap-2">
                  {template.has_content && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewTemplateId(template.id);
                      }}
                    >
                      Preview
                    </Button>
                  )}
                  {onSelectTemplate && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTemplate(template);
                      }}
                    >
                      Use Template
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
