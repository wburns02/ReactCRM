interface StreakCounterProps {
  currentStreak: number;
  bestStreak: number;
}

export function StreakCounter({ currentStreak, bestStreak }: StreakCounterProps) {
  const isHot = currentStreak >= 3;
  const isOnFire = currentStreak >= 5;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
          isOnFire
            ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30"
            : isHot
              ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/20"
              : currentStreak > 0
                ? "bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400"
                : "bg-bg-hover text-text-tertiary"
        }`}
      >
        <span className={isHot ? "animate-pulse" : ""}>
          {isOnFire ? "\u{1F525}" : isHot ? "\u{1F329}\uFE0F" : "\u26A1"}
        </span>
        <span className="tabular-nums">{currentStreak}</span>
        <span className="text-[10px] font-normal opacity-80">streak</span>
      </div>
      {bestStreak > 0 && (
        <div className="text-[10px] text-text-tertiary">
          Best: {bestStreak}
        </div>
      )}
    </div>
  );
}
