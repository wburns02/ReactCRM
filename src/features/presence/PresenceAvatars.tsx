import { cn } from "@/lib/utils.ts";
import { Tooltip } from "@/components/ui/Tooltip.tsx";
import { Badge } from "@/components/ui/Badge.tsx";
import { PresenceIndicator } from "./PresenceIndicator.tsx";
import type { PresenceUser } from "./usePresence.ts";

/**
 * Avatar size options
 */
type AvatarSize = "sm" | "md" | "lg";

/**
 * Props for single avatar
 */
interface PresenceAvatarProps {
  /** User data */
  user: PresenceUser;
  /** Avatar size */
  size?: AvatarSize;
  /** Show online indicator */
  showStatus?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Single presence avatar with initials
 */
export function PresenceAvatar({
  user,
  size = "md",
  showStatus = true,
  className,
}: PresenceAvatarProps) {
  const sizeClasses: Record<
    AvatarSize,
    { container: string; text: string; indicator: string }
  > = {
    sm: {
      container: "w-6 h-6",
      text: "text-[10px]",
      indicator: "w-1.5 h-1.5 -bottom-0.5 -right-0.5",
    },
    md: {
      container: "w-8 h-8",
      text: "text-xs",
      indicator: "w-2 h-2 -bottom-0.5 -right-0.5",
    },
    lg: {
      container: "w-10 h-10",
      text: "text-sm",
      indicator: "w-2.5 h-2.5 -bottom-1 -right-1",
    },
  };

  return (
    <Tooltip
      content={
        <div className="text-center">
          <div className="font-medium">{user.name}</div>
          <div className="text-xs opacity-80">{user.email}</div>
          {user.currentPage && (
            <div className="text-xs opacity-60 mt-1">
              Viewing: {user.currentPage}
            </div>
          )}
        </div>
      }
    >
      <div
        className={cn(
          "relative inline-flex items-center justify-center rounded-full font-semibold text-white cursor-default animate-in zoom-in-75 duration-300",
          sizeClasses[size].container,
          sizeClasses[size].text,
          className,
        )}
        style={{ backgroundColor: user.color }}
      >
        {user.initials}
        {showStatus && (
          <span
            className={cn(
              "absolute rounded-full border-2 border-bg-card",
              sizeClasses[size].indicator,
              user.isOnline ? "bg-success" : "bg-text-muted",
            )}
          />
        )}
      </div>
    </Tooltip>
  );
}

/**
 * Props for PresenceAvatars group
 */
interface PresenceAvatarsProps {
  /** Array of users to display */
  users: PresenceUser[];
  /** Maximum avatars to show before "+N" badge */
  maxVisible?: number;
  /** Avatar size */
  size?: AvatarSize;
  /** Overlap amount (negative margin) */
  overlap?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Show "others viewing" badge */
  showBadge?: boolean;
  /** Custom badge text */
  badgeText?: string;
}

/**
 * PresenceAvatars - Row of avatar circles for active users
 *
 * Shows user avatars with initials, overlapping style, and
 * a "+N others" indicator when there are too many to display.
 */
export function PresenceAvatars({
  users,
  maxVisible = 3,
  size = "md",
  overlap = true,
  className,
  showBadge = true,
  badgeText,
}: PresenceAvatarsProps) {
  if (users.length === 0) {
    return null;
  }

  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = users.length - maxVisible;

  const overlapMargin: Record<AvatarSize, string> = {
    sm: "-ml-1.5",
    md: "-ml-2",
    lg: "-ml-2.5",
  };

  const containerClasses: Record<AvatarSize, string> = {
    sm: "h-6",
    md: "h-8",
    lg: "h-10",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("flex items-center", containerClasses[size])}>
        {visibleUsers.map((user, index) => (
          <div
            key={user.id}
            className={cn(
              "relative",
              overlap && index > 0 && overlapMargin[size],
            )}
            style={{ zIndex: visibleUsers.length - index }}
          >
            <PresenceAvatar user={user} size={size} />
          </div>
        ))}

        {remainingCount > 0 && (
          <Tooltip
            content={
              <div>
                <div className="font-medium mb-1">
                  +{remainingCount} more viewing
                </div>
                <div className="text-xs opacity-80">
                  {users
                    .slice(maxVisible)
                    .map((u) => u.name)
                    .join(", ")}
                </div>
              </div>
            }
          >
            <div
              className={cn(
                "relative inline-flex items-center justify-center rounded-full bg-bg-muted text-text-secondary font-medium cursor-default border-2 border-bg-card",
                overlap && overlapMargin[size],
                size === "sm" && "w-6 h-6 text-[10px]",
                size === "md" && "w-8 h-8 text-xs",
                size === "lg" && "w-10 h-10 text-sm",
              )}
            >
              +{remainingCount}
            </div>
          </Tooltip>
        )}
      </div>

      {showBadge && users.length > 0 && (
        <Badge variant="info" className="text-xs whitespace-nowrap">
          {badgeText ||
            `${users.length} ${users.length === 1 ? "viewer" : "viewing"}`}
        </Badge>
      )}
    </div>
  );
}

/**
 * Props for RecordPresenceBanner
 */
interface RecordPresenceBannerProps {
  /** Users viewing this record */
  users: PresenceUser[];
  /** Record type label (e.g., "customer", "work order") */
  recordType?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * RecordPresenceBanner - Banner showing who else is viewing a record
 *
 * Designed to be placed at the top of detail pages to show
 * real-time collaborative awareness.
 */
export function RecordPresenceBanner({
  users,
  recordType = "record",
  className,
}: RecordPresenceBannerProps) {
  if (users.length === 0) {
    return null;
  }

  const userNames = users.map((u) => u.name);
  const displayNames =
    userNames.length <= 2
      ? userNames.join(" and ")
      : `${userNames.slice(0, -1).join(", ")}, and ${userNames[userNames.length - 1]}`;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2 bg-info-light rounded-lg border border-info/20",
        className,
      )}
    >
      <PresenceAvatars
        users={users}
        maxVisible={4}
        size="sm"
        showBadge={false}
      />
      <span className="text-sm text-info">
        {users.length === 1 ? (
          <>
            <span className="font-medium">{userNames[0]}</span> is also viewing
            this {recordType}
          </>
        ) : (
          <>
            <span className="font-medium">{displayNames}</span> are also viewing
            this {recordType}
          </>
        )}
      </span>
      <PresenceIndicator isOnline={true} size="sm" showPulse={true} />
    </div>
  );
}

/**
 * Compact presence indicator for headers/toolbars
 */
interface CompactPresenceProps {
  /** Users to display */
  users: PresenceUser[];
  /** Label text */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * CompactPresence - Minimal presence indicator for tight spaces
 */
export function CompactPresence({
  users,
  label,
  className,
}: CompactPresenceProps) {
  if (users.length === 0) {
    return null;
  }

  return (
    <Tooltip
      content={
        <div>
          <div className="font-medium mb-1">
            {label ||
              `${users.length} ${users.length === 1 ? "person" : "people"} viewing`}
          </div>
          <div className="space-y-1">
            {users.map((user) => (
              <div key={user.id} className="flex items-center gap-2 text-xs">
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-semibold"
                  style={{ backgroundColor: user.color }}
                >
                  {user.initials}
                </span>
                <span>{user.name}</span>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <div className={cn("flex items-center gap-1 cursor-default", className)}>
        <div className="flex -space-x-1">
          {users.slice(0, 3).map((user) => (
            <span
              key={user.id}
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] text-white font-semibold border border-bg-card"
              style={{ backgroundColor: user.color }}
            >
              {user.initials}
            </span>
          ))}
        </div>
        {users.length > 3 && (
          <span className="text-xs text-text-muted">+{users.length - 3}</span>
        )}
      </div>
    </Tooltip>
  );
}
