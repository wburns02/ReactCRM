import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plug, Info, Plus, Trash2, Search, Filter, Check } from "lucide-react";

import { Card } from "@/components/ui/Card";

import {
  useAccountStructures,
  useAddAccountStructure,
  useCarrierIntegrations,
  useDeleteAccountStructure,
  useToggleFormForwarding,
  type AccountStructure,
  type CarrierIntegration,
} from "../api";


type TopTab = "overview" | "structure";
type SubTab = "current" | "upcoming";


export function IntegrationsPage() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<TopTab>(
    (params.get("tab") as TopTab) || "overview",
  );

  const switchTab = (next: TopTab) => {
    setTab(next);
    const p = new URLSearchParams(params);
    p.set("tab", next);
    setParams(p, { replace: true });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold text-text-primary">Integrations</h1>

      <nav className="mt-6 border-b border-border flex flex-wrap gap-2">
        <TabBtn active={tab === "overview"} onClick={() => switchTab("overview")}>
          Overview
        </TabBtn>
        <TabBtn active={tab === "structure"} onClick={() => switchTab("structure")}>
          Account structure
        </TabBtn>
      </nav>

      <div className="mt-6">
        {tab === "overview" ? <OverviewTab /> : <AccountStructureTab />}
      </div>
    </div>
  );
}


function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-4 py-2 text-sm border-b-2 -mb-px transition",
        active
          ? "border-[#c77dff] text-[#7b2cbf] font-medium"
          : "border-transparent text-text-secondary hover:text-text-primary",
      ].join(" ")}
    >
      {children}
    </button>
  );
}


function OverviewTab() {
  const [sub, setSub] = useState<SubTab>("current");
  return (
    <div>
      <div className="inline-flex rounded-lg border border-border p-0.5 bg-bg-card mb-4">
        {(["current", "upcoming"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={[
              "px-3 py-1 text-sm rounded-md capitalize",
              sub === s
                ? "bg-bg-muted text-text-primary font-medium"
                : "text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            {s}
          </button>
        ))}
      </div>

      {sub === "current" ? <CurrentPlanYear /> : <UpcomingPlanYear />}
    </div>
  );
}


function CurrentPlanYear() {
  const q = useCarrierIntegrations(false);
  const rows = q.data ?? [];
  const [search, setSearch] = useState("");
  const filtered = rows.filter((r) =>
    !search ||
    r.carrier.toLowerCase().includes(search.trim().toLowerCase()) ||
    (r.enrollment_types ?? "").toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <FormForwardingBanner rows={rows} />

      <Card className="p-0">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="text-sm font-semibold text-text-primary">
            Current plan year integrations · {rows.length}
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg text-text-secondary hover:text-text-primary">
              <Filter className="w-3.5 h-3.5" />
              Filter
            </button>
          </div>
        </header>
        <div className="px-5 py-3 border-b border-border">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-bg-card text-text-primary"
            />
          </div>
        </div>
        {q.isLoading ? (
          <div className="p-10 text-center text-sm text-text-muted">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-text-muted">
            No carriers match that search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Carrier</th>
                  <th className="text-left font-medium px-5 py-3">Enrollment type</th>
                  <th className="text-left font-medium px-5 py-3">Active carrier integration</th>
                  <th className="text-right font-medium px-5 py-3 pr-6">Form forwarding</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <IntegrationRow key={r.id} row={r} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}


function FormForwardingBanner({ rows }: { rows: CarrierIntegration[] }) {
  const anyDisabled = rows.some((r) => !r.form_forwarding_enabled);
  if (!anyDisabled) return null;
  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 mt-0.5">
        <Info className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-text-primary">
          Enable Rippling to send enrollment forms to carriers
        </div>
        <p className="text-sm text-text-secondary mt-1">
          Turn on Form Forwarding per-carrier below so Rippling automatically
          forwards enrollment forms. Otherwise, download and send forms to
          carriers manually. Forms can be downloaded under Benefits ›
          Enrollments › Upcoming events.
        </p>
      </div>
      <button className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[#7b2cbf] text-white hover:bg-[#5a189a]">
        Manage integrations
      </button>
    </div>
  );
}


function IntegrationRow({ row }: { row: CarrierIntegration }) {
  const mut = useToggleFormForwarding();
  return (
    <tr className="border-b border-border/60 hover:bg-bg-muted transition">
      <td className="px-5 py-3">
        <div className="min-w-0">
          <div className="font-medium text-text-primary">{row.carrier}</div>
          {row.state && (
            <div className="text-xs text-text-muted">{row.state}</div>
          )}
        </div>
      </td>
      <td className="px-5 py-3 text-text-primary">
        {row.enrollment_types ?? "—"}
      </td>
      <td className="px-5 py-3">
        <span
          className={
            "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full " +
            (row.integration_status === "active"
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-neutral-500/10 text-text-muted")
          }
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {row.integration_status === "active" ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-5 py-3 text-right pr-6">
        <button
          type="button"
          onClick={() =>
            mut.mutate({ id: row.id, enabled: !row.form_forwarding_enabled })
          }
          disabled={mut.isPending}
          aria-pressed={row.form_forwarding_enabled}
          aria-label={`Toggle form forwarding for ${row.carrier}`}
          className={
            "relative inline-flex h-6 w-11 items-center rounded-full transition " +
            (row.form_forwarding_enabled ? "bg-[#7b2cbf]" : "bg-neutral-300") +
            (mut.isPending ? " opacity-50 cursor-not-allowed" : " cursor-pointer")
          }
        >
          <span
            className={
              "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition " +
              (row.form_forwarding_enabled ? "translate-x-5" : "translate-x-0.5")
            }
          />
        </button>
      </td>
    </tr>
  );
}


function UpcomingPlanYear() {
  const q = useCarrierIntegrations(true);
  const rows = q.data ?? [];
  return (
    <Card className="p-0">
      <header className="px-5 py-4 border-b border-border">
        <div className="text-sm font-semibold text-text-primary">
          Upcoming plan year integrations
        </div>
      </header>
      {q.isLoading ? (
        <div className="p-10 text-center text-sm text-text-muted">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="p-16 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-neutral-500/10 flex items-center justify-center">
            <Info className="w-5 h-5 text-text-muted" />
          </div>
          <div className="text-sm font-semibold text-text-primary">
            No current renewals
          </div>
          <div className="text-sm text-text-muted mt-1 max-w-sm mx-auto">
            New plan year integrations will be shown here once the renewal
            setup is complete.
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="text-left font-medium px-5 py-3">Carrier</th>
                <th className="text-left font-medium px-5 py-3">Enrollment type</th>
                <th className="text-left font-medium px-5 py-3">Plan year</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60">
                  <td className="px-5 py-3 font-medium text-text-primary">
                    {r.carrier}
                  </td>
                  <td className="px-5 py-3 text-text-primary">
                    {r.enrollment_types ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-text-secondary">
                    {r.plan_year ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}


function AccountStructureTab() {
  const q = useAccountStructures();
  const add = useAddAccountStructure();
  const del = useDeleteAccountStructure();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Partial<AccountStructure>>({
    carrier: "",
    class_type: "Employee class",
    employee_group: "",
    plan_name: "",
    enrollment_tier: "Employee only",
    class_value: "",
    count_of_employees: 0,
    group_rules: "",
  });
  const rows = q.data ?? [];

  const save = async () => {
    if (!draft.carrier) return;
    await add.mutateAsync({
      carrier: draft.carrier,
      class_type: draft.class_type ?? null,
      employee_group: draft.employee_group ?? null,
      plan_name: draft.plan_name ?? null,
      enrollment_tier: draft.enrollment_tier ?? null,
      class_value: draft.class_value ?? null,
      count_of_employees: draft.count_of_employees ?? 0,
      group_rules: draft.group_rules ?? null,
    });
    setAdding(false);
    setDraft({
      carrier: "",
      class_type: "Employee class",
      employee_group: "",
      plan_name: "",
      enrollment_tier: "Employee only",
      class_value: "",
      count_of_employees: 0,
      group_rules: "",
    });
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-text-primary">
          Carrier account structure details
        </h2>
        <p className="text-sm text-text-secondary mt-1 max-w-2xl">
          Your carrier account structure affects enrollment and invoicing. For
          all carriers, if applicable, provide class codes, billing groups, or
          subgroups for accurate member enrollment.
        </p>
      </div>

      <Card className="p-0">
        <header className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="text-sm font-semibold text-text-primary">
            Carrier account structures · {rows.length}
          </div>
          <button
            onClick={() => setAdding((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[#7b2cbf] text-white hover:bg-[#5a189a]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add classification
          </button>
        </header>

        {adding && (
          <div className="p-5 border-b border-border bg-violet-500/5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <LabeledInput
                label="Carrier"
                value={draft.carrier ?? ""}
                onChange={(v) => setDraft({ ...draft, carrier: v })}
                placeholder="Blue Shield"
              />
              <LabeledInput
                label="Class type"
                value={draft.class_type ?? ""}
                onChange={(v) => setDraft({ ...draft, class_type: v })}
              />
              <LabeledInput
                label="Employee group"
                value={draft.employee_group ?? ""}
                onChange={(v) => setDraft({ ...draft, employee_group: v })}
                placeholder="Full-time salaried"
              />
              <LabeledInput
                label="Plan"
                value={draft.plan_name ?? ""}
                onChange={(v) => setDraft({ ...draft, plan_name: v })}
              />
              <LabeledInput
                label="Enrollment tier"
                value={draft.enrollment_tier ?? ""}
                onChange={(v) => setDraft({ ...draft, enrollment_tier: v })}
                placeholder="Employee only"
              />
              <LabeledInput
                label="Class value"
                value={draft.class_value ?? ""}
                onChange={(v) => setDraft({ ...draft, class_value: v })}
                placeholder="Class 1"
              />
              <LabeledInput
                label="Employees"
                type="number"
                value={String(draft.count_of_employees ?? 0)}
                onChange={(v) =>
                  setDraft({ ...draft, count_of_employees: Number(v) || 0 })
                }
              />
              <LabeledInput
                label="Group rules"
                value={draft.group_rules ?? ""}
                onChange={(v) => setDraft({ ...draft, group_rules: v })}
                placeholder="hire_date < '2025-01-01'"
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={save}
                disabled={!draft.carrier || add.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[#7b2cbf] text-white hover:bg-[#5a189a] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-3.5 h-3.5" />
                Save classification
              </button>
              <button
                onClick={() => setAdding(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg text-text-secondary hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {q.isLoading ? (
          <div className="p-10 text-center text-sm text-text-muted">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-neutral-500/10 flex items-center justify-center">
              <Plug className="w-5 h-5 text-text-muted" />
            </div>
            <div className="text-sm text-text-muted">
              There is no data to show here currently.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Carrier</th>
                  <th className="text-left font-medium px-5 py-3">Class type</th>
                  <th className="text-left font-medium px-5 py-3">Employee group</th>
                  <th className="text-left font-medium px-5 py-3">Plan</th>
                  <th className="text-left font-medium px-5 py-3">Enrollment tier</th>
                  <th className="text-left font-medium px-5 py-3">Class value</th>
                  <th className="text-right font-medium px-5 py-3"># Employees</th>
                  <th className="text-left font-medium px-5 py-3">Group rules</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/60 hover:bg-bg-muted transition"
                  >
                    <td className="px-5 py-3 font-medium text-text-primary">
                      {r.carrier}
                    </td>
                    <td className="px-5 py-3 text-text-secondary">
                      {r.class_type ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-text-primary">
                      {r.employee_group ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-text-primary">
                      {r.plan_name ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-text-secondary">
                      {r.enrollment_tier ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-text-secondary">
                      {r.class_value ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-text-primary">
                      {r.count_of_employees}
                    </td>
                    <td className="px-5 py-3 text-xs text-text-muted font-mono truncate max-w-xs">
                      {r.group_rules ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => del.mutate(r.id)}
                        disabled={del.isPending}
                        className="p-1.5 rounded-md text-text-muted hover:text-rose-600 hover:bg-rose-500/10 disabled:opacity-50"
                        aria-label="Delete classification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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


function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-text-muted block mb-1">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg-card text-text-primary"
      />
    </label>
  );
}
