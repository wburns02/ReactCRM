export type ActivityItem = {
  id: string;
  kind: string;
  actor: string | null;
  when: string;
  body: string;
};

export function ActivityPanel({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-neutral-500">No activity yet.</p>;
  }
  return (
    <ul className="space-y-4">
      {items.map((i) => (
        <li key={i.id} className="text-sm">
          <div className="flex justify-between gap-4">
            <span className="font-medium">{i.actor ?? "System"}</span>
            <span className="text-neutral-500">{i.when}</span>
          </div>
          <p className="text-neutral-700 mt-1">{i.body}</p>
        </li>
      ))}
    </ul>
  );
}
