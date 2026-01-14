import { useCallDispositions } from "../api/calls.ts";

interface DispositionBadgeProps {
  disposition: string;
  className?: string;
}

export function DispositionBadge({
  disposition,
  className = "",
}: DispositionBadgeProps) {
  const { data: dispositions } = useCallDispositions();

  const dispInfo = dispositions?.find((d) => d.name === disposition);
  const color = dispInfo?.color || "#6B7280";

  // Determine text color based on background brightness
  const getBrightness = (hex: string): number => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    return (r * 299 + g * 587 + b * 114) / 1000;
  };

  const textColor = getBrightness(color) > 128 ? "#000000" : "#FFFFFF";

  // Format disposition name for display
  const formatName = (name: string): string => {
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${className}
      `}
      style={{
        backgroundColor: color,
        color: textColor,
      }}
    >
      {formatName(disposition)}
    </span>
  );
}
