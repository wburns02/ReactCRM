import clsx from "clsx";

type Stage = { id: string; label: string; count?: number };

export function StagePipeline({
  stages,
  activeStageId,
  onStageClick,
}: {
  stages: Stage[];
  activeStageId: string;
  onStageClick?: (id: string) => void;
}) {
  return (
    <nav className="flex gap-2 flex-wrap">
      {stages.map((s) => {
        const active = s.id === activeStageId;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onStageClick?.(s.id)}
            className={clsx(
              "px-3 py-1.5 rounded-full text-sm border transition",
              active
                ? "bg-neutral-900 text-white border-neutral-900"
                : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400",
            )}
          >
            <span>{s.label}</span>
            {typeof s.count === "number" && (
              <span
                className={clsx(
                  "ml-2 px-1.5 py-0.5 rounded-full text-xs",
                  active ? "bg-white/20" : "bg-neutral-100",
                )}
              >
                {s.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
