import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/api/client";
import { validateResponse } from "@/api/validateResponse";
import { applicantSchema, type Applicant } from "../api-applicants";
import { useRequisitions } from "../api";
import { STAGES, type Stage } from "../api-applications";


function useApplicantsSearch(params: {
  q?: string;
  requisition_id?: string;
  stage?: Stage;
  source?: string;
  since_days?: number;
}) {
  return useQuery({
    queryKey: ["hr", "applicants", "search", params],
    queryFn: async () => {
      const clean = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
      );
      const { data } = await apiClient.get("/hr/applicants", { params: clean });
      return validateResponse(
        z.array(applicantSchema),
        data,
        "/hr/applicants search",
      );
    },
  });
}


export function ApplicantInboxPage() {
  const [q, setQ] = useState("");
  const [reqId, setReqId] = useState<string>("");
  const [stage, setStage] = useState<Stage | "">("");
  const [source, setSource] = useState<string>("");

  const reqs = useRequisitions();
  const applicants = useApplicantsSearch({
    q: q.trim() || undefined,
    requisition_id: reqId || undefined,
    stage: (stage as Stage) || undefined,
    source: source || undefined,
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold">Applicant inbox</h1>

      <section className="mt-4 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search name, email, phone…"
          className="flex-1 min-w-[200px] border rounded-lg px-3 py-2 text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          value={reqId}
          onChange={(e) => setReqId(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All requisitions</option>
          {reqs.data?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value as Stage | "")}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All sources</option>
          <option value="careers_page">careers page</option>
          <option value="indeed">indeed</option>
          <option value="ziprecruiter">ziprecruiter</option>
          <option value="facebook">facebook</option>
          <option value="referral">referral</option>
          <option value="manual">manual</option>
          <option value="email">email</option>
        </select>
      </section>

      <section className="mt-6 border rounded-xl">
        {applicants.isLoading && <div className="p-4 text-sm">Loading…</div>}
        {applicants.error && (
          <div className="p-4 text-red-600 text-sm">
            {applicants.error.message}
          </div>
        )}
        {applicants.data && applicants.data.length === 0 && (
          <div className="p-6 text-sm text-neutral-500">
            No applicants match these filters.
          </div>
        )}
        {applicants.data && applicants.data.length > 0 && (
          <ul className="divide-y">
            {applicants.data.map((a: Applicant) => (
              <li
                key={a.id}
                className="p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <Link
                    to={`/hr/applicants/${a.id}`}
                    className="font-medium hover:underline"
                  >
                    {a.first_name} {a.last_name}
                  </Link>
                  <div className="text-sm text-neutral-500">
                    {a.email}
                    {a.phone && " · " + a.phone}
                  </div>
                </div>
                <div className="text-xs text-neutral-500">
                  {a.source} ·{" "}
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
