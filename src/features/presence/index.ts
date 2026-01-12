/**
 * Presence feature module
 *
 * Real-time presence tracking for collaborative awareness.
 * Shows who else is viewing the same records/pages.
 *
 * Components:
 * - PresenceIndicator: Simple online/offline dot
 * - PresenceAvatar: Single user avatar with initials
 * - PresenceAvatars: Row of avatars for multiple users
 * - RecordPresenceBanner: Banner showing viewers on detail pages
 * - CompactPresence: Minimal presence for tight spaces
 *
 * Hooks:
 * - usePresence: Main hook for presence state and WebSocket
 * - useRecordPresence: Get viewers of a specific record
 */

export {
  usePresence,
  useRecordPresence,
  type PresenceUser,
} from "./usePresence.ts";
export { PresenceIndicator, UserStatusBadge } from "./PresenceIndicator.tsx";
export {
  PresenceAvatar,
  PresenceAvatars,
  RecordPresenceBanner,
  CompactPresence,
} from "./PresenceAvatars.tsx";
