export function ZoneLegend() {
  return (
    <div className="rounded-lg bg-white/90 p-2 text-xs shadow-sm backdrop-blur">
      <div className="mb-1 flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-full border-2 border-red-500 bg-red-500/10" />
        <span className="text-foreground">Core Service Area</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-full border-2 border-dashed border-amber-500 bg-amber-500/10" />
        <span className="text-foreground">Extended Service Area</span>
      </div>
    </div>
  );
}
