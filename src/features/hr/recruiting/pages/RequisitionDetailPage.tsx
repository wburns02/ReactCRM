import { useState } from "react";
import { useParams } from "react-router-dom";

import { useRequisitionById } from "../api";
import {
  useApplicationStageCounts,
  useApplicationsForRequisition,
  type Stage,
} from "../api-applications";
import { ApplicationRow } from "../components/ApplicationRow";
import { PipelinePills } from "../components/PipelinePills";


export function RequisitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const req = useRequisitionById(id);
  const counts = useApplicationStageCounts(id);
  const [stage, setStage] = useState<Stage>("applied");
  const apps = useApplicationsForRequisition(id, stage);

  if (req.isLoading) return <div className="p-6">Loading requisition…</div>;
  if (req.error)
    return <div className="p-6 text-red-600">{req.error.message}</div>;
  if (!req.data) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold">{req.data.title}</h1>
      <div className="text-sm text-neutral-500 mt-1">
        {req.data.slug} · {req.data.status}
        {req.data.location_city
          ? ` · ${req.data.location_city}${req.data.location_state ? ", " + req.data.location_state : ""}`
          : ""}
      </div>

      <section className="mt-6">
        <PipelinePills
          counts={counts.data ?? {}}
          activeStage={stage}
          onChange={setStage}
        />
      </section>

      <section className="mt-6 border rounded-lg">
        {apps.isLoading && <div className="p-4 text-sm">Loading…</div>}
        {apps.error && (
          <div className="p-4 text-red-600 text-sm">{apps.error.message}</div>
        )}
        {apps.data && apps.data.length === 0 && (
          <div className="p-6 text-sm text-neutral-500">
            No applications in <b>{stage.replace("_", " ")}</b> yet.
          </div>
        )}
        {apps.data && apps.data.length > 0 && (
          <ul className="divide-y">
            {apps.data.map((a) => (
              <ApplicationRow key={a.id} app={a} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
