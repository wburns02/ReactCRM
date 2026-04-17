import { useParams } from "react-router-dom";

import { WorkflowTimeline } from "@/features/hr/shared/WorkflowTimeline";

import { useInstanceDetail } from "../api";


export function OnboardingDetailPage() {
  const { instanceId } = useParams<{ instanceId: string }>();
  const q = useInstanceDetail(instanceId);

  if (q.isLoading) return <div className="p-6">Loading…</div>;
  if (q.error)
    return <div className="p-6 text-red-600">{q.error.message}</div>;
  if (!q.data) return null;

  const { instance, tasks, onboarding_token } = q.data;
  const done = tasks.filter((t) => t.status === "completed" || t.status === "skipped")
    .length;
  const pct = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);
  const api = import.meta.env.VITE_API_URL?.replace(/\/api\/v2$/, "") ?? "";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold">Onboarding</h1>
      <div className="text-sm text-neutral-500 mt-1">
        Instance {instance.id.slice(0, 8)}… · Started{" "}
        {new Date(instance.started_at).toLocaleDateString()} · {instance.status}
      </div>

      <section className="mt-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span>Progress</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full bg-neutral-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>

      {onboarding_token && (
        <section className="mt-4 p-4 rounded-lg border border-indigo-200 bg-indigo-50">
          <div className="text-sm font-medium">MyOnboarding link for the hire</div>
          <a
            className="text-xs font-mono underline break-all"
            href={`${api}/onboarding/${onboarding_token}`}
            target="_blank"
            rel="noreferrer"
          >
            {api}/onboarding/{onboarding_token}
          </a>
        </section>
      )}

      <section className="mt-6">
        <WorkflowTimeline instanceId={instance.id} tasks={tasks} />
      </section>
    </div>
  );
}
