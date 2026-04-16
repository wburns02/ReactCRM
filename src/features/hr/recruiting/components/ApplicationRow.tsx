import { Link } from "react-router-dom";

import {
  useTransitionStage,
  type ApplicationWithApplicant,
  type Stage,
} from "../api-applications";


const NEXT_STAGES: Record<Stage, Stage[]> = {
  applied: ["screen", "rejected", "withdrawn"],
  screen: ["ride_along", "rejected", "withdrawn"],
  ride_along: ["offer", "rejected", "withdrawn"],
  offer: ["hired", "rejected", "withdrawn"],
  hired: [],
  rejected: [],
  withdrawn: [],
};


export function ApplicationRow({ app }: { app: ApplicationWithApplicant }) {
  const transition = useTransitionStage(app.id);

  async function move(next: Stage) {
    let reason: string | undefined;
    if (next === "rejected") {
      reason = window.prompt("Rejection reason?") ?? undefined;
      if (!reason) return;
    }
    try {
      await transition.mutateAsync({ stage: next, rejection_reason: reason });
    } catch (err) {
      window.alert(
        `Could not transition: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return (
    <li className="p-4 flex items-center justify-between gap-4 border-b last:border-b-0">
      <div className="min-w-0">
        <Link
          to={`/hr/applicants/${app.applicant.id}`}
          className="font-medium hover:underline"
        >
          {app.applicant.first_name} {app.applicant.last_name}
        </Link>
        <div className="text-sm text-neutral-500">
          {app.applicant.email}
          {app.applicant.phone && (
            <>
              {" · "}
              {app.applicant.phone}
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {NEXT_STAGES[app.stage].map((next) => (
          <button
            key={next}
            type="button"
            disabled={transition.isPending}
            onClick={() => move(next)}
            className="px-3 py-1.5 text-sm border rounded-lg hover:bg-neutral-50 disabled:opacity-50"
            aria-label={`Move to ${next}`}
          >
            → {next.replace("_", " ")}
          </button>
        ))}
      </div>
    </li>
  );
}
