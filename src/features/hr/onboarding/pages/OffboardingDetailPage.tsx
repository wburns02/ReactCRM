import { useParams } from "react-router-dom";

import { WorkflowTimeline } from "@/features/hr/shared/WorkflowTimeline";

import { useInstanceDetail } from "../api";


export function OffboardingDetailPage() {
  const { instanceId } = useParams<{ instanceId: string }>();
  const q = useInstanceDetail(instanceId);

  if (q.isLoading) return <div className="p-6">Loading…</div>;
  if (q.error)
    return <div className="p-6 text-red-600">{q.error.message}</div>;
  if (!q.data) return null;

  const { instance, tasks } = q.data;
  const done = tasks.filter((t) => t.status === "completed" || t.status === "skipped")
    .length;
  const pct = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold">Offboarding</h1>
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
            className="bg-amber-500 h-2 rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>

      <section className="mt-6">
        <WorkflowTimeline instanceId={instance.id} tasks={tasks} />
      </section>
    </div>
  );
}
