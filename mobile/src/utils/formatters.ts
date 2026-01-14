/**
 * Formatting utilities for CRM Mobile
 */
import { WorkOrder } from '../api/types';

/**
 * Format a date string to a readable format
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

/**
 * Format a date to show relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: number | Date): string {
  const now = Date.now();
  const time = typeof timestamp === 'number' ? timestamp : timestamp.getTime();
  const seconds = Math.floor((now - time) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Format time window for work orders
 */
export function formatTime(
  start: string | null | undefined,
  end?: string | null
): string {
  if (!start) return '';

  // Parse time string (HH:MM:SS or HH:MM)
  const formatTimeString = (time: string): string => {
    const parts = time.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1] || '00';
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const startFormatted = formatTimeString(start);

  if (end) {
    const endFormatted = formatTimeString(end);
    return `${startFormatted} - ${endFormatted}`;
  }

  return startFormatted;
}

/**
 * Format address from work order
 */
export function formatAddress(workOrder: WorkOrder): string {
  const parts: string[] = [];

  if (workOrder.service_address_line1) {
    parts.push(workOrder.service_address_line1);
  }
  if (workOrder.service_address_line2) {
    parts.push(workOrder.service_address_line2);
  }

  const cityStateZip: string[] = [];
  if (workOrder.service_city) cityStateZip.push(workOrder.service_city);
  if (workOrder.service_state) {
    cityStateZip.push(cityStateZip.length > 0 ? `, ${workOrder.service_state}` : workOrder.service_state);
  }
  if (workOrder.service_postal_code) {
    cityStateZip.push(` ${workOrder.service_postal_code}`);
  }

  if (cityStateZip.length > 0) {
    parts.push(cityStateZip.join(''));
  }

  return parts.join('\n');
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '$0.00';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format phone number
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-';

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // Format as (XXX) XXX-XXXX if 10 digits
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return phone;
}

/**
 * Format duration in hours
 */
export function formatDuration(hours: number | null | undefined): string {
  if (!hours) return '-';

  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} min`;
  }

  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  if (m === 0) {
    return `${h} hr${h !== 1 ? 's' : ''}`;
  }

  return `${h}h ${m}m`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}
