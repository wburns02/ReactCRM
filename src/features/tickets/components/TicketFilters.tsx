import { Select } from "@/components/ui/Select.tsx";
import { Input } from "@/components/ui/Input.tsx";
import {
  TICKET_TYPE_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
  type TicketType,
  type TicketStatus,
  type TicketPriority,
} from "@/api/types/ticket.ts";

interface TicketFiltersProps {
  search: string;
  type?: TicketType;
  status?: TicketStatus;
  priority?: TicketPriority;
  onSearchChange: (value: string) => void;
  onTypeChange: (value: TicketType | undefined) => void;
  onStatusChange: (value: TicketStatus | undefined) => void;
  onPriorityChange: (value: TicketPriority | undefined) => void;
}

/**
 * Ticket filters component
 */
export function TicketFilters({
  search,
  type,
  status,
  priority,
  onSearchChange,
  onTypeChange,
  onStatusChange,
  onPriorityChange,
}: TicketFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex-1 min-w-[200px]">
        <Input
          type="search"
          placeholder="Search tickets by title or description..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="w-40">
        <Select
          value={type || ""}
          onChange={(e) =>
            onTypeChange((e.target.value as TicketType) || undefined)
          }
        >
          <option value="">All Types</option>
          {Object.entries(TICKET_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-40">
        <Select
          value={status || ""}
          onChange={(e) =>
            onStatusChange((e.target.value as TicketStatus) || undefined)
          }
        >
          <option value="">All Statuses</option>
          {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-40">
        <Select
          value={priority || ""}
          onChange={(e) =>
            onPriorityChange((e.target.value as TicketPriority) || undefined)
          }
        >
          <option value="">All Priorities</option>
          {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
