/**
 * Shared utilities for the Communications module.
 * Used by SMS Inbox, Email Inbox, Unified Inbox, Conversations, Templates, etc.
 */

// ── Avatar Helpers ──────────────────────────────────────────────────────

export function getInitials(name: string): string {
  if (!name || name === "Unknown") return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name[0].toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-teal-500",
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Time Formatting ─────────────────────────────────────────────────────

export function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return dateStr;
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatMessageTime(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) return time;
  if (isYesterday) return `Yesterday ${time}`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ── Category Colors ─────────────────────────────────────────────────────

const CATEGORY_COLOR_MAP: Record<string, { bg: string; text: string }> = {
  "Appointment Reminder": {
    bg: "bg-blue-50 dark:bg-blue-500/10",
    text: "text-blue-600",
  },
  "Service Complete": {
    bg: "bg-green-50 dark:bg-green-500/10",
    text: "text-green-600",
  },
  "Follow-up": {
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-600",
  },
  Payment: {
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-600",
  },
  General: {
    bg: "bg-gray-50 dark:bg-gray-500/10",
    text: "text-gray-600",
  },
  Welcome: {
    bg: "bg-purple-50 dark:bg-purple-500/10",
    text: "text-purple-600",
  },
  Appointment: {
    bg: "bg-blue-50 dark:bg-blue-500/10",
    text: "text-blue-600",
  },
  Invoice: {
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-600",
  },
  "Service Report": {
    bg: "bg-cyan-50 dark:bg-cyan-500/10",
    text: "text-cyan-600",
  },
  Marketing: {
    bg: "bg-rose-50 dark:bg-rose-500/10",
    text: "text-rose-600",
  },
};

export function getCategoryColor(category: string): {
  bg: string;
  text: string;
} {
  return (
    CATEGORY_COLOR_MAP[category] || {
      bg: "bg-gray-50 dark:bg-gray-500/10",
      text: "text-gray-600",
    }
  );
}

// ── Status Helpers ──────────────────────────────────────────────────────

export function getStatusIcon(status: string): string | null {
  switch (status) {
    case "delivered":
      return "Delivered";
    case "sent":
      return "Sent";
    case "failed":
      return "Failed";
    case "pending":
    case "queued":
      return "Sending...";
    default:
      return null;
  }
}

export function getStatusBadge(
  status: string,
): {
  variant: "success" | "warning" | "danger" | "info" | "default";
  label: string;
} | null {
  switch (status) {
    case "delivered":
      return { variant: "success", label: "Delivered" };
    case "sent":
      return { variant: "info", label: "Sent" };
    case "failed":
      return { variant: "danger", label: "Failed" };
    case "pending":
    case "queued":
      return { variant: "warning", label: "Pending" };
    case "received":
      return { variant: "info", label: "New" };
    default:
      return null;
  }
}

// ── Channel Config ──────────────────────────────────────────────────────

export const CHANNEL_CONFIG: Record<
  string,
  { icon: string; label: string; color: string; bgColor: string }
> = {
  sms: {
    icon: "💬",
    label: "SMS",
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-500/10",
  },
  email: {
    icon: "📧",
    label: "Email",
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-500/10",
  },
  call: {
    icon: "📞",
    label: "Call",
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-500/10",
  },
  note: {
    icon: "📝",
    label: "Note",
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-500/10",
  },
};

// ── Template Variables ──────────────────────────────────────────────────

export const SMS_VARIABLES = [
  { name: "{{customer_name}}", desc: "Customer's full name" },
  { name: "{{date}}", desc: "Appointment date" },
  { name: "{{time}}", desc: "Appointment time" },
  { name: "{{address}}", desc: "Service address" },
];

export const EMAIL_VARIABLES = [
  { name: "{{customer_name}}", desc: "Customer's name" },
  { name: "{{company_name}}", desc: "Company name" },
  { name: "{{date}}", desc: "Date" },
  { name: "{{invoice_number}}", desc: "Invoice #" },
];

export const SMS_CATEGORIES = [
  "Appointment Reminder",
  "Service Complete",
  "Follow-up",
  "Payment",
  "General",
];

export const EMAIL_CATEGORIES = [
  "Welcome",
  "Appointment",
  "Invoice",
  "Follow-up",
  "Service Report",
  "Marketing",
];
