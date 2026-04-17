import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";


type Accent = "blue" | "violet" | "emerald" | "amber" | "rose" | "indigo";


const ACCENTS: Record<Accent, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-500" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-500" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-500" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-500" },
  indigo: { bg: "bg-indigo-500/10", text: "text-indigo-500" },
};


export function KpiCard({
  label,
  value,
  hint,
  to,
  icon: Icon,
  accent = "indigo",
}: {
  label: string;
  value: number | string;
  hint?: string;
  to?: string;
  icon?: LucideIcon;
  accent?: Accent;
}) {
  const a = ACCENTS[accent];
  const body = (
    <CardContent className="pt-5 pb-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-secondary">{label}</p>
          <p className="text-3xl font-bold text-text-primary mt-1">{value}</p>
          {hint && <p className="text-xs text-text-muted mt-1">{hint}</p>}
        </div>
        {Icon && (
          <div
            className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center",
              a.bg,
            )}
          >
            <Icon className={cn("w-5 h-5", a.text)} />
          </div>
        )}
      </div>
    </CardContent>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        <Card className="stat-card cursor-pointer hover:border-indigo-400">
          {body}
        </Card>
      </Link>
    );
  }

  return <Card className="stat-card">{body}</Card>;
}
