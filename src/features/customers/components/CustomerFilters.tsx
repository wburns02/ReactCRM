import { Input } from '@/components/ui/Input.tsx';
import { Select } from '@/components/ui/Select.tsx';
import { PROSPECT_STAGE_LABELS } from '@/api/types/common.ts';
import type { CustomerFilters as CustomerFiltersType } from '@/api/types/customer.ts';

interface CustomerFiltersProps {
  filters: CustomerFiltersType;
  onFilterChange: (filters: Partial<CustomerFiltersType>) => void;
}

/**
 * Filter bar for customers list
 */
export function CustomerFilters({ filters, onFilterChange }: CustomerFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 p-4">
      {/* Search */}
      <div className="flex-1 min-w-[200px]">
        <Input
          type="search"
          placeholder="Search customers..."
          value={filters.search || ''}
          onChange={(e) => onFilterChange({ search: e.target.value })}
          aria-label="Search customers"
        />
      </div>

      {/* Stage filter */}
      <div className="w-48">
        <Select
          value={filters.prospect_stage || ''}
          onChange={(e) => onFilterChange({ prospect_stage: e.target.value || undefined })}
          aria-label="Filter by stage"
        >
          <option value="">All Stages</option>
          {Object.entries(PROSPECT_STAGE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
