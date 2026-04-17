import { Link } from "react-router-dom";
import { UserPlus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";

import { useAllInstances } from "../api";


export function OnboardingListPage() {
  return <LifecycleListPage category="onboarding" />;
}


export function OffboardingListPage() {
  return <LifecycleListPage category="offboarding" />;
}


function LifecycleListPage({
  category,
}: {
  category: "onboarding" | "offboarding";
}) {
  const q = useAllInstances(category);

  const title = category === "onboarding" ? "Onboarding" : "Offboarding";
  const description =
    category === "onboarding"
      ? "Active onboarding workflows for new hires."
      : "Active offboarding workflows for departing employees.";

  if (q.isLoading)
    return (
      <div className="p-6 max-w-7xl mx-auto text-sm text-text-muted">
        Loading…
      </div>
    );
  if (q.error)
    return (
      <div className="p-6 max-w-7xl mx-auto text-sm text-rose-600">
        {q.error.message}
      </div>
    );

  const active = (q.data ?? []).filter((i) => i.status === "active");
  const completed = (q.data ?? []).filter((i) => i.status === "completed");

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
          <p className="text-sm text-text-secondary mt-1">{description}</p>
        </div>
        <Link
          to="/hr"
          className="text-sm text-text-secondary hover:text-text-primary"
        >
          ← Back to HR
        </Link>
      </div>

      <Card className="mt-6">
        <CardContent className="p-0">
          <header className="px-5 py-3 border-b border-border">
            <div className="text-sm font-semibold text-text-primary">
              Active ({active.length})
            </div>
          </header>
          {active.length === 0 ? (
            <EmptyState category={category} />
          ) : (
            <ul className="divide-y divide-border">
              {active.map((inst) => (
                <InstanceRow key={inst.id} instance={inst} category={category} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {completed.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-0">
            <header className="px-5 py-3 border-b border-border">
              <div className="text-sm font-semibold text-text-primary">
                Completed ({completed.length})
              </div>
            </header>
            <ul className="divide-y divide-border">
              {completed.map((inst) => (
                <InstanceRow
                  key={inst.id}
                  instance={inst}
                  category={category}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


function InstanceRow({
  instance,
  category,
}: {
  instance: {
    id: string;
    subject_id: string;
    subject_type: string;
    status: string;
    started_at: string;
    completed_at: string | null;
  };
  category: "onboarding" | "offboarding";
}) {
  return (
    <li>
      <Link
        to={`/hr/${category}/${instance.id}`}
        className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-bg-muted transition"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <UserPlus className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-text-primary truncate">
              {instance.subject_type === "applicant"
                ? "Applicant"
                : "Employee"}{" "}
              · {instance.subject_id.slice(0, 8)}…
            </div>
            <div className="text-xs text-text-muted">
              Started {new Date(instance.started_at).toLocaleDateString()}
              {instance.completed_at &&
                ` · Completed ${new Date(
                  instance.completed_at,
                ).toLocaleDateString()}`}
            </div>
          </div>
        </div>
        <span
          className={
            "text-xs px-2 py-0.5 rounded-full " +
            (instance.status === "active"
              ? "bg-emerald-500/10 text-emerald-600"
              : instance.status === "completed"
                ? "bg-blue-500/10 text-blue-600"
                : "bg-neutral-500/10 text-neutral-600")
          }
        >
          {instance.status}
        </span>
      </Link>
    </li>
  );
}


function EmptyState({ category }: { category: "onboarding" | "offboarding" }) {
  return (
    <div className="p-10 text-center text-sm text-text-muted">
      No active {category} workflows.
      {category === "onboarding" && (
        <>
          {" "}
          Move an applicant to Hired to start one from{" "}
          <Link to="/hr/recruiting" className="text-indigo-600 hover:underline">
            Recruiting
          </Link>
          .
        </>
      )}
    </div>
  );
}
