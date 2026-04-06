interface DriveTimeChipProps {
  minutes: number;
}

export function DriveTimeChip({ minutes }: DriveTimeChipProps) {
  const display =
    minutes < 60
      ? `~${minutes} min`
      : `~${Math.round((minutes / 60) * 10) / 10} hr`;

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <span>🚗</span>
      <span>{display} from base</span>
    </span>
  );
}
