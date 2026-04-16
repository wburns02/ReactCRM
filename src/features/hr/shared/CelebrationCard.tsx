export function CelebrationCard({
  title,
  message,
  ctaLabel,
  onCta,
}: {
  title: string;
  message: string;
  ctaLabel: string;
  onCta: () => void;
}) {
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-6 flex items-center justify-between gap-6">
      <div className="min-w-0">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-neutral-700 mt-1">{message}</p>
      </div>
      <button
        type="button"
        onClick={onCta}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shrink-0"
      >
        {ctaLabel}
      </button>
    </div>
  );
}
