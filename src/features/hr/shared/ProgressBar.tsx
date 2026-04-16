export function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="w-full bg-neutral-100 rounded-full h-2">
      <div
        className="bg-indigo-600 h-2 rounded-full transition-[width]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
