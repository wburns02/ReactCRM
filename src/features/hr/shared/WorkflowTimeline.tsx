import clsx from "clsx";

import {
  useAdvanceWorkflowTask,
  type WorkflowTask,
} from "../onboarding/api";


const STATUS_STYLES: Record<WorkflowTask["status"], string> = {
  blocked: "bg-neutral-100 text-neutral-500 border-neutral-200 opacity-60",
  ready: "bg-white border-neutral-200",
  in_progress: "bg-indigo-50 border-indigo-200",
  completed: "bg-green-50 border-green-200",
  skipped: "bg-neutral-50 border-neutral-200 line-through",
};


export function WorkflowTimeline({
  instanceId,
  tasks,
}: {
  instanceId: string;
  tasks: WorkflowTask[];
}) {
  const advance = useAdvanceWorkflowTask(instanceId);

  async function complete(taskId: string) {
    await advance.mutateAsync({ taskId, status: "completed" });
  }

  async function skip(taskId: string) {
    const reason = window.prompt("Why skip?");
    if (!reason) return;
    await advance.mutateAsync({ taskId, status: "skipped", reason });
  }

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-neutral-500">No tasks on this workflow.</p>
    );
  }

  // Group by stage (falls back to "—").
  const byStage = new Map<string, WorkflowTask[]>();
  for (const t of tasks) {
    const k = t.stage ?? "—";
    if (!byStage.has(k)) byStage.set(k, []);
    byStage.get(k)!.push(t);
  }

  return (
    <div className="space-y-6">
      {[...byStage.entries()].map(([stage, group]) => (
        <section key={stage}>
          {stage !== "—" && (
            <h3 className="text-xs uppercase tracking-wide text-neutral-500 mb-2">
              {stage.replace(/_/g, " ")}
            </h3>
          )}
          <ul className="space-y-2">
            {group
              .sort((a, b) => a.position - b.position)
              .map((t) => (
                <li
                  key={t.id}
                  className={clsx(
                    "p-3 rounded-lg border flex items-center justify-between gap-3",
                    STATUS_STYLES[t.status],
                  )}
                >
                  <div className="min-w-0">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {t.assignee_role.toUpperCase()} · {t.kind.replace(/_/g, " ")} ·{" "}
                      {t.status}
                      {t.due_at && (
                        <>
                          {" · due "}
                          {new Date(t.due_at).toLocaleDateString()}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(t.status === "ready" || t.status === "in_progress") && (
                      <>
                        <button
                          type="button"
                          disabled={advance.isPending}
                          onClick={() => complete(t.id)}
                          className="px-3 py-1.5 text-xs border rounded-lg hover:bg-neutral-50"
                        >
                          Complete
                        </button>
                        <button
                          type="button"
                          disabled={advance.isPending}
                          onClick={() => skip(t.id)}
                          className="px-3 py-1.5 text-xs border rounded-lg hover:bg-neutral-50"
                        >
                          Skip
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
