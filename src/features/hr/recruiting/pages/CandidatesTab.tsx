import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/api/client";
import { validateResponse } from "@/api/validateResponse";
import { applicantSchema, type Applicant } from "../api-applicants";
import { STAGES, type Stage } from "../api-applications";
import { useRequisitions } from "../api";


const SOURCES = [
  "careers_page",
  "indeed",
  "ziprecruiter",
  "facebook",
  "referral",
  "manual",
  "email",
] as const;


function useCandidates(params: {
  q?: string;
  requisition_id?: string;
  stage?: Stage;
  source?: string;
  since_days?: number;
}) {
  return useQuery({
    queryKey: ["hr", "candidates", params],
    queryFn: async () => {
      const clean = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
      );
      const { data } = await apiClient.get("/hr/applicants", { params: clean });
      return validateResponse(z.array(applicantSchema), data, "/hr/applicants");
    },
  });
}


export function CandidatesTab() {
  const [params, setParams] = useSearchParams();
  const initialStage = (params.get("stage") as Stage | null) ?? "";
  const initialReq = params.get("requisition_id") ?? "";
  const initialQ = params.get("q") ?? "";

  const [q, setQ] = useState(initialQ);
  const [reqId, setReqId] = useState(initialReq);
  const [stage, setStage] = useState<Stage | "">(
    (STAGES as readonly string[]).includes(initialStage)
      ? (initialStage as Stage)
      : "",
  );
  const [source, setSource] = useState("");
  const [since, setSince] = useState<number | "">("");

  useEffect(() => {
    const next = new URLSearchParams(params);
    if (stage) next.set("stage", stage);
    else next.delete("stage");
    if (reqId) next.set("requisition_id", reqId);
    else next.delete("requisition_id");
    if (q) next.set("q", q);
    else next.delete("q");
    if (next.toString() !== params.toString()) {
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, reqId, q]);

  const reqs = useRequisitions();
  const cands = useCandidates({
    q: q.trim() || undefined,
    requisition_id: reqId || undefined,
    stage: (stage as Stage) || undefined,
    source: source || undefined,
    since_days: typeof since === "number" ? since : undefined,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
      <aside className="rounded-xl border bg-white p-4 space-y-4 h-fit sticky top-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-neutral-500 block mb-1">
            Search
          </label>
          <input
            type="search"
            placeholder="Name, email, phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-neutral-500 block mb-1">
            Requisition
          </label>
          <select
            value={reqId}
            onChange={(e) => setReqId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {reqs.data?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-neutral-500 block mb-1">
            Stage
          </label>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as Stage | "")}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-neutral-500 block mb-1">
            Source
          </label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-neutral-500 block mb-1">
            Applied within
          </label>
          <select
            value={since}
            onChange={(e) =>
              setSince(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Any time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
        <button
          type="button"
          className="w-full text-xs text-neutral-500 hover:text-neutral-900"
          onClick={() => {
            setQ("");
            setReqId("");
            setStage("");
            setSource("");
            setSince("");
          }}
        >
          Clear all filters
        </button>
      </aside>

      <section className="rounded-xl border bg-white">
        <header className="px-5 py-3 border-b flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Candidates</div>
            <div className="text-xs text-neutral-500">
              {cands.data?.length ?? 0} result
              {(cands.data?.length ?? 0) === 1 ? "" : "s"}
            </div>
          </div>
        </header>
        {cands.isLoading ? (
          <div className="p-6 text-sm text-neutral-500">Loading…</div>
        ) : cands.error ? (
          <div className="p-6 text-sm text-red-600">{cands.error.message}</div>
        ) : (cands.data?.length ?? 0) === 0 ? (
          <div className="p-10 text-center text-sm text-neutral-500">
            No candidates match these filters.
          </div>
        ) : (
          <ul className="divide-y">
            {(cands.data ?? []).map((a: Applicant) => (
              <li
                key={a.id}
                className="px-5 py-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <Link
                    to={`/hr/applicants/${a.id}`}
                    className="font-medium hover:underline"
                  >
                    {a.first_name} {a.last_name}
                  </Link>
                  <div className="text-xs text-neutral-500 truncate">
                    {a.email}
                    {a.phone && " · " + a.phone}
                  </div>
                </div>
                <div className="text-xs text-neutral-500 shrink-0">
                  {a.source.replace("_", " ")} ·{" "}
                  {new Date(a.created_at).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
