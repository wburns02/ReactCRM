import clsx from "clsx";

import {
  NODE_STYLES,
  type OrgNode,
} from "../orgChartData";


function Card({
  node,
  onClick,
  active,
}: {
  node: OrgNode;
  onClick: (n: OrgNode) => void;
  active: boolean;
}) {
  const style = NODE_STYLES[node.kind];
  return (
    <button
      type="button"
      onClick={() => onClick(node)}
      className={clsx(
        "block text-center px-4 py-2.5 rounded-lg border-2 min-w-[160px] transition",
        style.bg,
        style.border,
        style.text,
        node.vacancy && "border-dashed",
        active && "ring-2 ring-offset-2 ring-indigo-600",
        "hover:-translate-y-0.5 hover:shadow-md",
      )}
      aria-pressed={active}
    >
      <div className="text-sm font-semibold">{node.title}</div>
      <div className="text-xs mt-0.5 opacity-80">{node.name}</div>
    </button>
  );
}


function Branch({
  node,
  onClick,
  activeId,
}: {
  node: OrgNode;
  onClick: (n: OrgNode) => void;
  activeId: string | null;
}) {
  const kids = node.children ?? [];
  return (
    <div className="flex flex-col items-center">
      <Card node={node} onClick={onClick} active={node.id === activeId} />
      {kids.length > 0 && (
        <>
          <div className="w-0.5 h-6 bg-neutral-300" aria-hidden="true" />
          <div className="flex justify-center gap-6 border-t-2 border-neutral-300 pt-6 px-2">
            {kids.map((c) => (
              <Branch
                key={c.id}
                node={c}
                onClick={onClick}
                activeId={activeId}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}


export function OrgChart({
  root,
  onNodeClick,
  activeId,
}: {
  root: OrgNode;
  onNodeClick: (n: OrgNode) => void;
  activeId: string | null;
}) {
  return (
    <div className="overflow-x-auto pb-6">
      <div className="inline-block min-w-full">
        <Branch node={root} onClick={onNodeClick} activeId={activeId} />
      </div>
    </div>
  );
}
