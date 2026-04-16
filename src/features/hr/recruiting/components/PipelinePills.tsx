import { StagePipeline } from "@/features/hr/shared/StagePipeline";

import { STAGES, type Stage } from "../api-applications";


const LABEL: Record<Stage, string> = {
  applied: "Applied",
  screen: "Screen",
  ride_along: "Ride-Along",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};


export function PipelinePills({
  counts,
  activeStage,
  onChange,
}: {
  counts: Record<string, number>;
  activeStage: Stage;
  onChange: (s: Stage) => void;
}) {
  const stages = STAGES.map((id) => ({
    id,
    label: LABEL[id],
    count: counts[id] ?? 0,
  }));
  return (
    <StagePipeline
      stages={stages}
      activeStageId={activeStage}
      onStageClick={(id) => onChange(id as Stage)}
    />
  );
}
