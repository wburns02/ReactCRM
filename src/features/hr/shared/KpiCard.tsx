import { Link } from "react-router-dom";


export function KpiCard({
  label,
  value,
  hint,
  to,
}: {
  label: string;
  value: number | string;
  hint?: string;
  to?: string;
}) {
  const body = (
    <>
      <div className="text-xs uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-xs text-neutral-500 mt-1">{hint}</div>}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="rounded-xl border p-4 bg-white hover:border-indigo-400 hover:-translate-y-0.5 transition block"
      >
        {body}
      </Link>
    );
  }

  return <div className="rounded-xl border p-4 bg-white">{body}</div>;
}
