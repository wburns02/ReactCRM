import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, Info, Calendar, CheckCircle2, AlertCircle, FileText } from "lucide-react";

import { Card } from "@/components/ui/Card";

import {
  useAcaFilings,
  useEmployeeHours,
  useLookbackPolicy,
  usePatchLookback,
  type AcaFiling,
  type EmployeeHours,
} from "../acaApi";


type TabKey = "reporting" | "eligibility";


function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", {
    year: "numeric", month: "2-digit", day: "2-digit",
  });
}


function toNum(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isNaN(n) ? 0 : n;
}


function downloadCsv(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => {
      const v = r[h]; const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}


function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    filed: "bg-emerald-500/10 text-emerald-600",
    in_progress: "bg-amber-500/10 text-amber-600",
    not_started: "bg-neutral-500/10 text-neutral-600",
  };
  const label = s.replace(/_/g, " ");
  return (
    <span className={"inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full capitalize " + (map[s] ?? "bg-neutral-500/10 text-neutral-600")}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}


export function AcaPage() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<TabKey>((params.get("tab") as TabKey) || "reporting");
  const switchTab = (next: TabKey) => {
    setTab(next);
    const p = new URLSearchParams(params);
    p.set("tab", next);
    setParams(p, { replace: true });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold text-text-primary">ACA</h1>
      <p className="text-sm text-text-secondary mt-1">
        Affordable Care Act compliance, reporting, and eligibility tracking.
      </p>

      <nav className="mt-6 border-b border-border flex flex-wrap gap-2">
        {[
          { key: "reporting" as TabKey, label: "Reporting" },
          { key: "eligibility" as TabKey, label: "Eligibility Tracking" },
        ].map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className={[
                "px-4 py-2 text-sm border-b-2 -mb-px transition",
                active
                  ? "border-[#c77dff] text-[#7b2cbf] font-medium"
                  : "border-transparent text-text-secondary hover:text-text-primary",
              ].join(" ")}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-6">
        {tab === "reporting" ? <ReportingTab /> : <EligibilityTab />}
      </div>
    </div>
  );
}


function ReportingTab() {
  const q = useAcaFilings();
  const filings = q.data ?? [];
  const current = filings.find((f) => f.is_current);
  const historical = filings.filter((f) => !f.is_current);

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-indigo-500/10 to-transparent border-indigo-500/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-base font-semibold text-text-primary">
              How does ACA filing work?
            </div>
            <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
              Companies that are considered "large" employers under the Affordable Care Act need to make annual filings to the IRS and their employees about company-sponsored medical insurance plans and enrollment. The Rippling ACA app completely automates the filing process — confirming employer info, generating 1094-C + 1095-C forms for eligible employees, and submitting to the IRS + relevant state agencies.
            </p>
          </div>
        </div>
      </Card>

      {current && <CurrentFilingCard filing={current} />}

      <Card className="p-0">
        <header className="px-5 py-4 border-b border-border">
          <div className="text-sm font-semibold text-text-primary">
            Filing history
          </div>
          <div className="text-xs text-text-muted">
            Historical ACA filings
          </div>
        </header>
        {q.isLoading ? (
          <div className="p-6 text-sm text-text-muted">Loading…</div>
        ) : filings.length === 0 ? (
          <div className="p-10 text-center text-sm text-text-muted">
            No filings on record yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Plan year</th>
                  <th className="text-left font-medium px-5 py-3">Form 1094-C</th>
                  <th className="text-right font-medium px-5 py-3">Form 1095-C count</th>
                  <th className="text-left font-medium px-5 py-3">IRS deadline</th>
                  <th className="text-left font-medium px-5 py-3">Employee deadline</th>
                </tr>
              </thead>
              <tbody>
                {[current, ...historical].filter(Boolean).map((f) => (
                  <tr key={(f as AcaFiling).id} className="border-b border-border/60 hover:bg-bg-muted transition">
                    <td className="px-5 py-3 font-medium text-text-primary">
                      {(f as AcaFiling).plan_year}
                      {(f as AcaFiling).is_current && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#c77dff]/20 text-[#7b2cbf] font-semibold">
                          CURRENT
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3"><StatusPill s={(f as AcaFiling).form_1094c_status} /></td>
                    <td className="px-5 py-3 text-right text-text-primary">{(f as AcaFiling).form_1095c_count}</td>
                    <td className="px-5 py-3 text-text-secondary">{fmtDate((f as AcaFiling).irs_deadline)}</td>
                    <td className="px-5 py-3 text-text-secondary">{fmtDate((f as AcaFiling).employee_deadline)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}


function CurrentFilingCard({ filing }: { filing: AcaFiling }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-text-muted">
            Current filing
          </div>
          <h2 className="text-xl font-semibold text-text-primary mt-1">
            ACA Reporting {filing.plan_year}
          </h2>
        </div>
        <StatusPill s={filing.form_1094c_status} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        <InfoTile icon={FileText} label="1094-C" value={filing.form_1094c_status === "filed" ? "Filed" : filing.form_1094c_status === "not_started" ? "Not started" : "In progress"} />
        <InfoTile icon={CheckCircle2} label="1095-C forms" value={String(filing.form_1095c_count)} />
        <InfoTile icon={Calendar} label="IRS deadline" value={fmtDate(filing.irs_deadline)} />
        <InfoTile icon={AlertCircle} label="Employee deadline" value={fmtDate(filing.employee_deadline)} />
      </div>

      {filing.notes && (
        <div className="mt-4 p-3 rounded-lg bg-bg-muted text-sm text-text-primary">
          {filing.notes}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[#7b2cbf] text-white hover:bg-[#5a189a]">
          <Download className="w-3.5 h-3.5" />
          Download 1094-C + 1095-Cs
        </button>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg text-text-secondary hover:text-text-primary">
          View filing details
        </button>
      </div>
    </Card>
  );
}


function InfoTile({ icon: Icon, label, value }: { icon: typeof Info; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3 bg-bg-card">
      <div className="flex items-center gap-2 text-xs text-text-muted uppercase tracking-wide">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="text-sm font-semibold text-text-primary mt-1">{value}</div>
    </div>
  );
}


function EligibilityTab() {
  const policyQ = useLookbackPolicy();
  const patch = usePatchLookback();
  const hoursQ = useEmployeeHours();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const policy = policyQ.data;
  const current = policy ? { ...policy, ...draft } : null;

  const save = async () => {
    if (!draft) return;
    await patch.mutateAsync({ ...draft, is_active: true });
    setDraft({});
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-base font-semibold text-text-primary">
              ACA eligibility tracking
            </div>
            <p className="text-sm text-text-secondary mt-1.5 leading-relaxed max-w-3xl">
              Applicable Large Employers (ALEs) under the Affordable Care Act must offer health coverage to people who average 30 or more hours of service per week. Use the IRS-approved look-back measurement method to determine when hourly workers become eligible for health insurance benefits.
            </p>
            {policy && !policy.is_active && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[#7b2cbf] text-white hover:bg-[#5a189a]"
              >
                Define lookback policy
              </button>
            )}
          </div>
        </div>
      </Card>

      {(editing || (policy && policy.is_active)) && current && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-base font-semibold text-text-primary">
                Look-back measurement policy
              </div>
              <div className="text-sm text-text-muted mt-0.5">
                {policy?.is_active ? "Active policy" : "Define your measurement/stability/administrative periods"}
              </div>
            </div>
            {policy?.is_active && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 text-sm border border-border rounded-lg text-text-secondary hover:text-text-primary"
              >
                Edit
              </button>
            )}
          </div>
          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LabeledInput label="Standard measurement (months)" value={String(current.standard_measurement_months)}
                onChange={(v) => setDraft({ ...draft, standard_measurement_months: Number(v) || 12 })} />
              <LabeledInput label="Stability period (months)" value={String(current.stability_months)}
                onChange={(v) => setDraft({ ...draft, stability_months: Number(v) || 12 })} />
              <LabeledInput label="Administrative period (days)" value={String(current.administrative_days)}
                onChange={(v) => setDraft({ ...draft, administrative_days: Number(v) || 90 })} />
              <LabeledInput label="Initial measurement (months)" value={String(current.initial_measurement_months)}
                onChange={(v) => setDraft({ ...draft, initial_measurement_months: Number(v) || 12 })} />
              <LabeledInput label="Hours threshold (monthly)" value={String(current.hours_threshold)}
                onChange={(v) => setDraft({ ...draft, hours_threshold: Number(v) || 130 })} />
              <div className="flex items-end gap-2">
                <button
                  onClick={save}
                  disabled={patch.isPending}
                  className="px-3 py-2 text-sm rounded-lg bg-[#7b2cbf] text-white hover:bg-[#5a189a] disabled:opacity-50"
                >
                  {patch.isPending ? "Saving…" : "Activate policy"}
                </button>
                <button
                  onClick={() => { setEditing(false); setDraft({}); }}
                  className="px-3 py-2 text-sm border border-border rounded-lg text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <InfoTile icon={Calendar} label="Standard measurement" value={`${current.standard_measurement_months} months`} />
              <InfoTile icon={Calendar} label="Stability period" value={`${current.stability_months} months`} />
              <InfoTile icon={Calendar} label="Administrative period" value={`${current.administrative_days} days`} />
              <InfoTile icon={Calendar} label="Initial measurement" value={`${current.initial_measurement_months} months`} />
              <InfoTile icon={AlertCircle} label="Hours threshold" value={`${current.hours_threshold}/mo`} />
            </dl>
          )}
        </Card>
      )}

      <Card className="p-0">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-text-primary">
              Hourly employees — measurement period hours
            </div>
            <div className="text-xs text-text-muted">
              Averaged weekly hours during the current standard measurement period
            </div>
          </div>
          <button
            onClick={() => downloadCsv(
              (hoursQ.data ?? []).map((r) => ({
                employee: r.employee_name,
                measurement_period: r.measurement_period,
                total_hours: toNum(r.total_hours).toFixed(2),
                avg_hours_per_week: toNum(r.average_hours_per_week).toFixed(2),
                full_time_eligible: r.is_full_time_eligible ? "Yes" : "No",
              })),
              `aca-employee-hours-${Date.now()}.csv`,
            )}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:border-[#c77dff] text-text-primary bg-bg-card"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </header>
        {hoursQ.isLoading ? (
          <div className="p-10 text-center text-sm text-text-muted">Loading…</div>
        ) : (hoursQ.data ?? []).length === 0 ? (
          <div className="p-10 text-center text-sm text-text-muted">
            No measurement data available yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Employee</th>
                  <th className="text-left font-medium px-5 py-3">Measurement period</th>
                  <th className="text-right font-medium px-5 py-3">Total hours</th>
                  <th className="text-right font-medium px-5 py-3">Avg hrs / week</th>
                  <th className="text-left font-medium px-5 py-3">Full-time eligible</th>
                </tr>
              </thead>
              <tbody>
                {(hoursQ.data ?? []).map((r: EmployeeHours) => (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-bg-muted transition">
                    <td className="px-5 py-3 font-medium text-text-primary">{r.employee_name}</td>
                    <td className="px-5 py-3 text-text-secondary">{r.measurement_period}</td>
                    <td className="px-5 py-3 text-right text-text-primary">{toNum(r.total_hours).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-text-primary font-medium">
                      {toNum(r.average_hours_per_week).toFixed(1)}
                    </td>
                    <td className="px-5 py-3">
                      {r.is_full_time_eligible ? (
                        <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                          <CheckCircle2 className="w-3 h-3" />
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-neutral-500/10 text-neutral-600">
                          Not yet
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}


function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-text-muted block mb-1">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg-card text-text-primary"
      />
    </label>
  );
}
