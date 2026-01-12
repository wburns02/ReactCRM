/**
 * FieldPicker Component
 *
 * Categorized field selector for segment rule builder.
 * Groups fields by category (Basic Info, Financial, Service, Engagement, Health, Dates).
 */

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils.ts";

export interface FieldDefinition {
  id: string;
  label: string;
  category: FieldCategory;
  type: "string" | "number" | "boolean" | "date" | "select";
  options?: { value: string; label: string }[];
  description?: string;
}

export type FieldCategory =
  | "basic"
  | "financial"
  | "service"
  | "engagement"
  | "health"
  | "dates";

const CATEGORY_CONFIG: Record<
  FieldCategory,
  { label: string; icon: React.ReactNode; color: string }
> = {
  basic: {
    label: "Basic Info",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
    color: "text-blue-500 bg-blue-500/10",
  },
  financial: {
    label: "Financial",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    color: "text-green-500 bg-green-500/10",
  },
  service: {
    label: "Service",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
    color: "text-purple-500 bg-purple-500/10",
  },
  engagement: {
    label: "Engagement",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
    color: "text-amber-500 bg-amber-500/10",
  },
  health: {
    label: "Health",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    ),
    color: "text-red-500 bg-red-500/10",
  },
  dates: {
    label: "Dates",
    icon: (
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    color: "text-cyan-500 bg-cyan-500/10",
  },
};

// Available fields for segment rules
export const SEGMENT_FIELDS: FieldDefinition[] = [
  // Basic Info
  {
    id: "company_name",
    label: "Company Name",
    category: "basic",
    type: "string",
  },
  {
    id: "industry",
    label: "Industry",
    category: "basic",
    type: "select",
    options: [
      { value: "technology", label: "Technology" },
      { value: "healthcare", label: "Healthcare" },
      { value: "finance", label: "Finance" },
      { value: "retail", label: "Retail" },
      { value: "manufacturing", label: "Manufacturing" },
      { value: "education", label: "Education" },
      { value: "government", label: "Government" },
      { value: "other", label: "Other" },
    ],
  },
  {
    id: "company_size",
    label: "Company Size",
    category: "basic",
    type: "select",
    options: [
      { value: "startup", label: "Startup (1-10)" },
      { value: "small", label: "Small (11-50)" },
      { value: "medium", label: "Medium (51-200)" },
      { value: "large", label: "Large (201-1000)" },
      { value: "enterprise", label: "Enterprise (1000+)" },
    ],
  },
  { id: "country", label: "Country", category: "basic", type: "string" },
  { id: "region", label: "Region", category: "basic", type: "string" },
  {
    id: "account_owner",
    label: "Account Owner",
    category: "basic",
    type: "string",
  },
  {
    id: "tier",
    label: "Customer Tier",
    category: "basic",
    type: "select",
    options: [
      { value: "free", label: "Free" },
      { value: "starter", label: "Starter" },
      { value: "professional", label: "Professional" },
      { value: "enterprise", label: "Enterprise" },
    ],
  },
  {
    id: "tags",
    label: "Tags",
    category: "basic",
    type: "string",
    description: "Customer tags (comma-separated)",
  },

  // Financial
  {
    id: "arr",
    label: "ARR",
    category: "financial",
    type: "number",
    description: "Annual Recurring Revenue",
  },
  {
    id: "mrr",
    label: "MRR",
    category: "financial",
    type: "number",
    description: "Monthly Recurring Revenue",
  },
  {
    id: "total_revenue",
    label: "Total Revenue",
    category: "financial",
    type: "number",
  },
  {
    id: "lifetime_value",
    label: "Lifetime Value",
    category: "financial",
    type: "number",
  },
  {
    id: "expansion_revenue",
    label: "Expansion Revenue",
    category: "financial",
    type: "number",
  },
  {
    id: "payment_status",
    label: "Payment Status",
    category: "financial",
    type: "select",
    options: [
      { value: "current", label: "Current" },
      { value: "overdue", label: "Overdue" },
      { value: "delinquent", label: "Delinquent" },
    ],
  },
  {
    id: "contract_value",
    label: "Contract Value",
    category: "financial",
    type: "number",
  },

  // Service
  { id: "plan_name", label: "Plan Name", category: "service", type: "string" },
  {
    id: "product_line",
    label: "Product Line",
    category: "service",
    type: "string",
  },
  {
    id: "licenses",
    label: "Number of Licenses",
    category: "service",
    type: "number",
  },
  {
    id: "active_users",
    label: "Active Users",
    category: "service",
    type: "number",
  },
  {
    id: "seats_used_percent",
    label: "Seats Used %",
    category: "service",
    type: "number",
  },
  {
    id: "has_integration",
    label: "Has Integration",
    category: "service",
    type: "boolean",
  },
  {
    id: "support_tier",
    label: "Support Tier",
    category: "service",
    type: "select",
    options: [
      { value: "basic", label: "Basic" },
      { value: "standard", label: "Standard" },
      { value: "premium", label: "Premium" },
      { value: "enterprise", label: "Enterprise" },
    ],
  },

  // Engagement
  {
    id: "engagement_score",
    label: "Engagement Score",
    category: "engagement",
    type: "number",
  },
  {
    id: "product_adoption_score",
    label: "Product Adoption Score",
    category: "engagement",
    type: "number",
  },
  {
    id: "last_login_days",
    label: "Days Since Last Login",
    category: "engagement",
    type: "number",
  },
  {
    id: "login_frequency",
    label: "Login Frequency (per week)",
    category: "engagement",
    type: "number",
  },
  {
    id: "feature_usage_count",
    label: "Features Used",
    category: "engagement",
    type: "number",
  },
  {
    id: "nps_score",
    label: "NPS Score",
    category: "engagement",
    type: "number",
  },
  {
    id: "csat_score",
    label: "CSAT Score",
    category: "engagement",
    type: "number",
  },
  {
    id: "support_tickets_open",
    label: "Open Support Tickets",
    category: "engagement",
    type: "number",
  },
  {
    id: "has_champion",
    label: "Has Champion",
    category: "engagement",
    type: "boolean",
  },
  {
    id: "has_executive_sponsor",
    label: "Has Executive Sponsor",
    category: "engagement",
    type: "boolean",
  },

  // Health
  {
    id: "health_score",
    label: "Health Score",
    category: "health",
    type: "number",
  },
  {
    id: "health_status",
    label: "Health Status",
    category: "health",
    type: "select",
    options: [
      { value: "healthy", label: "Healthy" },
      { value: "at_risk", label: "At Risk" },
      { value: "critical", label: "Critical" },
      { value: "churned", label: "Churned" },
    ],
  },
  {
    id: "score_trend",
    label: "Score Trend",
    category: "health",
    type: "select",
    options: [
      { value: "improving", label: "Improving" },
      { value: "stable", label: "Stable" },
      { value: "declining", label: "Declining" },
    ],
  },
  {
    id: "churn_probability",
    label: "Churn Probability",
    category: "health",
    type: "number",
    description: "0-100%",
  },
  {
    id: "relationship_score",
    label: "Relationship Score",
    category: "health",
    type: "number",
  },
  {
    id: "financial_score",
    label: "Financial Health Score",
    category: "health",
    type: "number",
  },

  // Dates
  {
    id: "created_at",
    label: "Customer Since",
    category: "dates",
    type: "date",
  },
  {
    id: "renewal_date",
    label: "Renewal Date",
    category: "dates",
    type: "date",
  },
  {
    id: "contract_start_date",
    label: "Contract Start",
    category: "dates",
    type: "date",
  },
  {
    id: "contract_end_date",
    label: "Contract End",
    category: "dates",
    type: "date",
  },
  {
    id: "last_touchpoint_date",
    label: "Last Touchpoint",
    category: "dates",
    type: "date",
  },
  {
    id: "last_qbr_date",
    label: "Last QBR Date",
    category: "dates",
    type: "date",
  },
  {
    id: "onboarding_complete_date",
    label: "Onboarding Complete",
    category: "dates",
    type: "date",
  },
];

interface FieldPickerProps {
  value: string;
  onChange: (field: FieldDefinition) => void;
  className?: string;
}

export function FieldPicker({ value, onChange, className }: FieldPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<FieldCategory | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedField = SEGMENT_FIELDS.find((f) => f.id === value);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Group fields by category
  const fieldsByCategory = SEGMENT_FIELDS.reduce(
    (acc, field) => {
      if (!acc[field.category]) {
        acc[field.category] = [];
      }
      acc[field.category].push(field);
      return acc;
    },
    {} as Record<FieldCategory, FieldDefinition[]>,
  );

  // Filter fields based on search
  const filteredFields = search
    ? SEGMENT_FIELDS.filter(
        (f) =>
          f.label.toLowerCase().includes(search.toLowerCase()) ||
          f.id.toLowerCase().includes(search.toLowerCase()),
      )
    : activeCategory
      ? fieldsByCategory[activeCategory]
      : [];

  const handleSelect = (field: FieldDefinition) => {
    onChange(field);
    setIsOpen(false);
    setSearch("");
    setActiveCategory(null);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-3 py-2 text-left text-sm rounded-lg border transition-colors",
          "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600",
          "hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
          isOpen && "ring-2 ring-primary/20 border-primary",
        )}
      >
        {selectedField ? (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "p-1 rounded",
                CATEGORY_CONFIG[selectedField.category].color,
              )}
            >
              {CATEGORY_CONFIG[selectedField.category].icon}
            </span>
            <span className="text-gray-900 dark:text-white">
              {selectedField.label}
            </span>
          </div>
        ) : (
          <span className="text-gray-400">Select field...</span>
        )}
        <svg
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform",
            isOpen && "rotate-180",
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-80 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (e.target.value) setActiveCategory(null);
              }}
              placeholder="Search fields..."
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-white"
              autoFocus
            />
          </div>

          <div className="flex max-h-80">
            {/* Category Sidebar */}
            {!search && (
              <div className="w-32 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                {(Object.keys(CATEGORY_CONFIG) as FieldCategory[]).map(
                  (category) => (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={cn(
                        "w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 transition-colors",
                        activeCategory === category
                          ? "bg-primary/10 text-primary border-r-2 border-primary"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800",
                      )}
                    >
                      <span
                        className={cn(
                          "p-1 rounded",
                          CATEGORY_CONFIG[category].color,
                        )}
                      >
                        {CATEGORY_CONFIG[category].icon}
                      </span>
                      <span className="truncate">
                        {CATEGORY_CONFIG[category].label}
                      </span>
                    </button>
                  ),
                )}
              </div>
            )}

            {/* Field List */}
            <div className="flex-1 overflow-y-auto">
              {search || activeCategory ? (
                filteredFields.length > 0 ? (
                  <div className="p-1">
                    {filteredFields.map((field) => (
                      <button
                        key={field.id}
                        onClick={() => handleSelect(field)}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm rounded-lg transition-colors",
                          "hover:bg-gray-100 dark:hover:bg-gray-700",
                          value === field.id && "bg-primary/10 text-primary",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "p-1 rounded",
                              CATEGORY_CONFIG[field.category].color,
                            )}
                          >
                            {CATEGORY_CONFIG[field.category].icon}
                          </span>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {field.label}
                            </div>
                            {field.description && (
                              <div className="text-xs text-gray-500">
                                {field.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No fields found
                  </div>
                )
              ) : (
                <div className="p-4 text-center text-sm text-gray-500">
                  Select a category
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function getFieldById(id: string): FieldDefinition | undefined {
  return SEGMENT_FIELDS.find((f) => f.id === id);
}
