import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names with Tailwind CSS conflict resolution
 * Uses clsx for conditional classes and tailwind-merge to resolve conflicts
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency (USD)
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Format a date string for display
 * Handles date-only strings (YYYY-MM-DD) without timezone shift
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  let d: Date;
  if (typeof date === "string") {
    // For date-only strings (YYYY-MM-DD), parse as UTC to avoid timezone shift
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split("-").map(Number);
      d = new Date(Date.UTC(year, month - 1, day));
    } else {
      d = new Date(date);
    }
  } else {
    d = date;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/**
 * Format a phone number for display
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "-";
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "");
  // Format as (XXX) XXX-XXXX
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  // Return original if not 10 digits
  return phone;
}

/**
 * Check if a value is a valid entity ID (non-null, non-undefined, not "null"/"undefined" strings)
 * Returns true if the ID can be safely used in API calls and URLs
 */
export function isValidId(
  id: string | number | null | undefined,
): id is string | number {
  if (id === null || id === undefined) return false;
  if (typeof id === "string") {
    const normalized = id.trim().toLowerCase();
    return (
      normalized !== "" && normalized !== "null" && normalized !== "undefined"
    );
  }
  return typeof id === "number" && !isNaN(id) && isFinite(id);
}
