import type { LocationSource as LocationSourceType } from "../types";

const SOURCE_LABELS: Record<LocationSourceType, string> = {
  customer_record: "Customer record",
  transcript: "Live transcript",
  area_code: "Area code",
};

interface LocationSourceProps {
  source: LocationSourceType;
  excerpt?: string;
}

export function LocationSource({ source, excerpt }: LocationSourceProps) {
  return (
    <div className="text-xs text-muted-foreground">
      <span>Source: {SOURCE_LABELS[source]}</span>
      {excerpt && (
        <span className="italic"> — &ldquo;{excerpt}&rdquo;</span>
      )}
    </div>
  );
}
