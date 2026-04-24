import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Pencil, Check, ChevronRight, ChevronDown, Plus } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { useBenefitsOverview } from "../api";
import {
  useBenefitCompanySettings,
  useBenefitSignatories,
  usePatchBenefitSignatory,
  usePatchCompanySettings,
  type BenefitSignatory,
  type CompanySettings,
} from "../acaApi";


type SectionKey =
  | "class_codes"
  | "signatory"
  | "coverage_managed"
  | "tax_disability"
  | "enroll_notifications"
  | "enroll_questions"
  | "enroll_window"
  | "enroll_preview"
  | "enroll_newly_eligible"
  | "enroll_part_time"
  | "cost_in_app"
  | "cost_hide"
  | "eoi_approval"
  | "qle_settings"
  | "integrations";


type SectionGroup = {
  label: string | null;
  items: { key: SectionKey; label: string; sub?: { key: SectionKey; label: string }[] }[];
};


const SECTIONS: SectionGroup[] = [
  {
    label: null,
    items: [
      { key: "class_codes", label: "Benefits class codes" },
      { key: "signatory", label: "Benefits signatory" },
      { key: "coverage_managed", label: "Coverage managed in Rippling" },
      { key: "tax_disability", label: "Tax treatment of disability contributions" },
    ],
  },
  {
    label: "Employee Benefits Experience",
    items: [
      {
        key: "enroll_notifications",
        label: "Employee Enrollment",
        sub: [
          { key: "enroll_notifications", label: "Enrollment notifications" },
          { key: "enroll_questions", label: "Enrollment questions" },
          { key: "enroll_window", label: "Enrollment window" },
          { key: "enroll_preview", label: "New hire benefits preview" },
          { key: "enroll_newly_eligible", label: "Newly-eligible employee enrollment window" },
          { key: "enroll_part_time", label: "Part-time employee eligibility" },
        ],
      },
      {
        key: "cost_in_app",
        label: "Cost display",
        sub: [
          { key: "cost_in_app", label: "Cost in My Benefits app" },
          { key: "cost_hide", label: "Hide company contribution" },
        ],
      },
      { key: "eoi_approval", label: "Evidence of Insurability approval" },
      { key: "qle_settings", label: "Qualifying life event settings" },
      { key: "integrations", label: "Integrations" },
    ],
  },
];


export function BenefitsSettingsPage() {
  const [params, setParams] = useSearchParams();
  const initialSection = (params.get("section") as SectionKey) || "class_codes";
  const [section, setSection] = useState<SectionKey>(initialSection);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["enroll_notifications", "cost_in_app"]));
  const [topTab, setTopTab] = useState<"settings" | "company">(
    (params.get("tab") as "settings" | "company") || "settings",
  );

  const pickSection = (k: SectionKey) => {
    setSection(k);
    const p = new URLSearchParams(params);
    p.set("section", k);
    setParams(p, { replace: true });
  };

  const toggle = (k: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k); else n.add(k);
      return n;
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold text-text-primary">Benefits Settings</h1>

      <nav className="mt-6 border-b border-border flex flex-wrap gap-2">
        {(["settings", "company"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTopTab(t);
              const p = new URLSearchParams(params);
              p.set("tab", t);
              setParams(p, { replace: true });
            }}
            className={[
              "px-4 py-2 text-sm border-b-2 -mb-px transition",
              topTab === t
                ? "border-[#c77dff] text-[#7b2cbf] font-medium"
                : "border-transparent text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            {t === "settings" ? "Settings" : "Company details"}
          </button>
        ))}
      </nav>

      {topTab === "settings" ? (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
          <aside className="space-y-4">
            {SECTIONS.map((group, gi) => (
              <div key={gi}>
                {group.label && (
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-text-muted px-3 mb-1">
                    {group.label}
                  </div>
                )}
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    if (item.sub) {
                      const isOpen = expanded.has(item.key);
                      const anyActive = item.sub.some((s) => s.key === section);
                      return (
                        <li key={item.key}>
                          <button
                            onClick={() => toggle(item.key)}
                            className={[
                              "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition",
                              anyActive
                                ? "text-text-primary font-medium"
                                : "text-text-secondary hover:text-text-primary hover:bg-bg-muted",
                            ].join(" ")}
                          >
                            <span>{item.label}</span>
                            {isOpen ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                          {isOpen && (
                            <ul className="ml-3 mt-0.5 border-l border-border pl-2 space-y-0.5">
                              {item.sub.map((s) => {
                                const active = s.key === section;
                                return (
                                  <li key={s.key}>
                                    <button
                                      onClick={() => pickSection(s.key)}
                                      className={[
                                        "w-full text-left px-3 py-1.5 rounded-md text-sm transition",
                                        active
                                          ? "bg-[#7b2cbf]/10 text-[#7b2cbf] font-medium"
                                          : "text-text-secondary hover:text-text-primary hover:bg-bg-muted",
                                      ].join(" ")}
                                    >
                                      {s.label}
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </li>
                      );
                    }
                    const active = item.key === section;
                    return (
                      <li key={item.key}>
                        <button
                          onClick={() => pickSection(item.key)}
                          className={[
                            "w-full text-left px-3 py-2 rounded-lg text-sm transition",
                            active
                              ? "bg-[#7b2cbf]/10 text-[#7b2cbf] font-medium"
                              : "text-text-secondary hover:text-text-primary hover:bg-bg-muted",
                          ].join(" ")}
                        >
                          {item.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </aside>

          <div>
            <SectionPanel section={section} />
          </div>
        </div>
      ) : (
        <CompanyDetailsTab />
      )}
    </div>
  );
}


function SectionPanel({ section }: { section: SectionKey }) {
  if (section === "class_codes") return <ClassCodesSection />;
  if (section === "signatory") return <SignatorySection />;
  if (section === "coverage_managed") return <CoverageManagedSection />;
  if (section === "tax_disability") return <TaxDisabilitySection />;
  if (section === "enroll_notifications") return <EnrollmentNotificationsSection />;
  if (section === "enroll_questions") return <EnrollmentQuestionsSection />;
  if (section === "enroll_window") return <EnrollmentWindowSection />;
  if (section === "enroll_preview") return <NewHirePreviewSection />;
  if (section === "enroll_newly_eligible") return <NewlyEligibleSection />;
  if (section === "enroll_part_time") return <PartTimeSection />;
  if (section === "cost_in_app") return <CostInAppSection />;
  if (section === "cost_hide") return <CostHideSection />;
  if (section === "eoi_approval") return <EoiApprovalSection />;
  if (section === "qle_settings") return <QleSettingsSection />;
  if (section === "integrations") return <IntegrationsSection />;
  return null;
}


function SimpleCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="mb-4">
        <div className="text-base font-semibold text-text-primary">{title}</div>
        {description && <div className="text-sm text-text-muted mt-0.5">{description}</div>}
      </div>
      {children}
    </Card>
  );
}


function SettingRow({ label, helper, value, editor }: {
  label: string;
  helper?: string;
  value: React.ReactNode;
  editor: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="border-b border-border last:border-b-0 py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="text-sm font-medium text-text-primary">{label}</div>
          {helper && <div className="text-xs text-text-muted mt-0.5 max-w-2xl">{helper}</div>}
          {!editing && <div className="text-sm text-text-primary mt-2">{value}</div>}
          {editing && <div className="mt-3">{editor}</div>}
        </div>
        <button
          onClick={() => setEditing((v) => !v)}
          className="shrink-0 px-2 py-1 text-xs border border-border rounded-md text-text-secondary hover:text-text-primary hover:border-[#c77dff]"
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>
    </div>
  );
}


function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={
        "relative inline-flex h-6 w-11 items-center rounded-full transition cursor-pointer " +
        (checked ? "bg-[#7b2cbf]" : "bg-neutral-300")
      }
    >
      <span
        className={
          "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition " +
          (checked ? "translate-x-5" : "translate-x-0.5")
        }
      />
    </button>
  );
}


// ─── individual sections ────────────────────────────────────

function ClassCodesSection() {
  const q = useBenefitCompanySettings();
  const patch = usePatchCompanySettings();
  const s = q.data;
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  if (!s) return <div className="text-sm text-text-muted">Loading…</div>;

  const save = async () => {
    await patch.mutateAsync({ class_codes: draft });
    setEditing(false);
    setDraft("");
  };

  return (
    <SimpleCard title="Benefits class codes"
      description="Class codes segment employees for benefit eligibility + invoicing. Separate codes with '·' or newlines.">
      {editing ? (
        <div className="space-y-3">
          <textarea
            rows={5}
            value={draft || s.class_codes || ""}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg-card text-text-primary font-mono"
          />
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={patch.isPending}
              className="px-3 py-1.5 text-sm rounded-lg bg-[#7b2cbf] text-white hover:bg-[#5a189a] disabled:opacity-50">
              {patch.isPending ? "Saving…" : "Save"}
            </button>
            <button onClick={() => { setEditing(false); setDraft(""); }}
              className="px-3 py-1.5 text-sm border border-border rounded-lg text-text-secondary">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-text-primary font-mono bg-bg-muted rounded-md p-3">
            {s.class_codes || "No class codes configured."}
          </div>
          <button onClick={() => setEditing(true)}
            className="px-3 py-1.5 text-sm border border-border rounded-lg text-text-secondary hover:text-text-primary">
            <Pencil className="w-3.5 h-3.5 inline mr-1.5" />
            Edit class codes
          </button>
        </div>
      )}
    </SimpleCard>
  );
}


function SignatorySection() {
  const q = useBenefitSignatories();
  const patch = usePatchBenefitSignatory();
  const rows = q.data ?? [];

  return (
    <Card className="p-0">
      <header className="px-5 py-4 border-b border-border">
        <div className="text-base font-semibold text-text-primary">
          Benefits signatories · {rows.length}
        </div>
        <div className="text-sm text-text-muted mt-0.5">
          Assign signatories to the benefits-related documents that require signature.
        </div>
      </header>
      {q.isLoading ? (
        <div className="p-6 text-sm text-text-muted">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center text-sm text-text-muted">No signatories configured.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="text-left font-medium px-5 py-3">Document type</th>
                <th className="text-left font-medium px-5 py-3">Signatory</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: BenefitSignatory) => (
                <SignatoryRow key={r.id} row={r} onPatch={patch.mutate} pending={patch.isPending} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}


function SignatoryRow({ row, onPatch, pending }: {
  row: BenefitSignatory;
  onPatch: (args: { id: string; signatory_name?: string; status?: string }) => void;
  pending: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row.signatory_name ?? "");
  return (
    <tr className="border-b border-border/60 hover:bg-bg-muted transition">
      <td className="px-5 py-3 text-text-primary">{row.document_type}</td>
      <td className="px-5 py-3">
        {editing ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-border rounded-md px-2 py-1 text-sm bg-bg-card text-text-primary"
            placeholder="Select signatory"
          />
        ) : row.signatory_name ? (
          <div>
            <div className="text-text-primary">{row.signatory_name}</div>
            {row.signatory_department && (
              <div className="text-xs text-text-muted">{row.signatory_department}</div>
            )}
          </div>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </td>
      <td className="px-5 py-3">
        <span className={
          "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full capitalize " +
          (row.status === "configured" ? "bg-emerald-500/10 text-emerald-600"
            : row.status === "signature_pending" ? "bg-amber-500/10 text-amber-600"
            : "bg-rose-500/10 text-rose-600")
        }>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {row.status.replace(/_/g, " ")}
        </span>
      </td>
      <td className="px-5 py-3 text-right">
        {editing ? (
          <div className="inline-flex gap-1">
            <button
              onClick={async () => {
                await onPatch({ id: row.id, signatory_name: name, status: name ? "signature_pending" : "signature_missing" });
                setEditing(false);
              }}
              disabled={pending}
              className="px-2 py-1 text-xs rounded-md bg-[#7b2cbf] text-white hover:bg-[#5a189a] disabled:opacity-50"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={() => { setEditing(false); setName(row.signatory_name ?? ""); }}
              className="px-2 py-1 text-xs border border-border rounded-md text-text-secondary"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-border rounded-md text-text-secondary hover:text-text-primary hover:border-[#c77dff]"
          >
            <Pencil className="w-3 h-3" />
            {row.status === "signature_missing" ? "Add signatory" : "Edit"}
          </button>
        )}
      </td>
    </tr>
  );
}


function CoverageManagedSection() {
  const ov = useBenefitsOverview();
  const lines = ov.data
    ? Object.entries(ov.data.by_benefit_type).sort(([, a], [, b]) => b - a)
    : [];
  const LABEL: Record<string, string> = {
    medical: "Medical", dental: "Dental", vision: "Vision", life: "Life",
    ad_d: "Accidental Death & Dismemberment", voluntary_life: "Voluntary Life",
    voluntary_ad_d: "Voluntary Accidental Death & Dismemberment",
    std: "Short Term Disability", ltd: "Long Term Disability",
    hospital: "Hospital", critical_illness: "Critical Illness",
    accident: "Accident", cancer: "Cancer",
    hsa: "HSA", fsa: "FSA",
  };
  return (
    <Card className="p-0">
      <header className="px-5 py-4 border-b border-border">
        <div className="text-base font-semibold text-text-primary">Coverage managed in Rippling</div>
        <div className="text-sm text-text-muted mt-0.5">
          Benefit lines Rippling actively manages for your company.
        </div>
      </header>
      <ul className="divide-y divide-border">
        {lines.length === 0 ? (
          <li className="p-6 text-sm text-text-muted">No coverage configured.</li>
        ) : (
          lines.map(([k, n]) => (
            <li key={k} className="flex items-center justify-between px-5 py-3">
              <div className="text-sm text-text-primary">{LABEL[k] ?? k}</div>
              <div className="text-sm text-text-muted">
                {n} enrolled · Expires on Dec 31st
              </div>
            </li>
          ))
        )}
      </ul>
    </Card>
  );
}


function TaxDisabilitySection() {
  const q = useBenefitCompanySettings();
  const patch = usePatchCompanySettings();
  const s = q.data;
  if (!s) return <div className="text-sm text-text-muted">Loading…</div>;
  return (
    <SimpleCard title="Tax treatment of disability contributions"
      description="Should the company's contribution for these plans be considered part of the employee's salary (imputed income) for tax purposes?">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-text-primary">Short Term Disability</div>
            <div className="text-xs text-text-muted">Employer contribution taxed as imputed income</div>
          </div>
          <div className="flex items-center gap-3">
            <Toggle checked={!s.tax_std_not_taxed} onChange={(v) => patch.mutate({ tax_std_not_taxed: !v })} />
            <span className="text-sm text-text-primary">{s.tax_std_not_taxed ? "Not taxed" : "Taxed"}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-text-primary">Long Term Disability</div>
            <div className="text-xs text-text-muted">Employer contribution taxed as imputed income</div>
          </div>
          <div className="flex items-center gap-3">
            <Toggle checked={!s.tax_ltd_not_taxed} onChange={(v) => patch.mutate({ tax_ltd_not_taxed: !v })} />
            <span className="text-sm text-text-primary">{s.tax_ltd_not_taxed ? "Not taxed" : "Taxed"}</span>
          </div>
        </div>
      </div>
    </SimpleCard>
  );
}


function EnrollmentNotificationsSection() {
  const q = useBenefitCompanySettings();
  const patch = usePatchCompanySettings();
  const s = q.data;
  if (!s) return <div className="text-sm text-text-muted">Loading…</div>;
  return (
    <SimpleCard title="Employee enrollment notifications"
      description="Benefits administrator who receives email alerts for employee enrollment updates.">
      <div className="space-y-3">
        <div className="text-xs uppercase tracking-wide text-text-muted">Admin</div>
        <input
          defaultValue={s.benefit_admin_notification_user ?? ""}
          onBlur={(e) => {
            if (e.target.value !== (s.benefit_admin_notification_user ?? "")) {
              patch.mutate({ benefit_admin_notification_user: e.target.value });
            }
          }}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg-card text-text-primary"
          placeholder="e.g. Emily Burgess"
        />
      </div>
    </SimpleCard>
  );
}


function EnrollmentQuestionsSection() {
  const q = useBenefitCompanySettings();
  const patch = usePatchCompanySettings();
  const s = q.data;
  if (!s) return <div className="text-sm text-text-muted">Loading…</div>;
  return (
    <SimpleCard title="Enrollment benefit enrollment questions"
      description="Customize your employee enrollment experience. Questions can apply surcharges, customize contributions, or manage eligibility.">
      <div className="flex items-start justify-between">
        <div className="max-w-2xl">
          <div className="text-sm font-medium text-text-primary">Employee tobacco usage</div>
          <div className="text-xs text-text-muted mt-1">
            Should employees be asked whether or not they smoke tobacco in the benefits enrollment flow? (If off and a carrier uses this input for pricing, we'll assume the employee is a non-smoker.)
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Toggle checked={s.ask_tobacco_question}
            onChange={(v) => patch.mutate({ ask_tobacco_question: v })} />
          <span className="text-sm text-text-primary">{s.ask_tobacco_question ? "Yes" : "No"}</span>
        </div>
      </div>
    </SimpleCard>
  );
}


function EnrollmentWindowSection() {
  const q = useBenefitCompanySettings();
  const patch = usePatchCompanySettings();
  const s = q.data;
  if (!s) return <div className="text-sm text-text-muted">Loading…</div>;
  return (
    <SimpleCard title="Enrollment before start date"
      description="Should hide enrollment events until new hire's start date?">
      <div className="flex items-center gap-3">
        <Toggle checked={s.enrollment_hide_until_start}
          onChange={(v) => patch.mutate({ enrollment_hide_until_start: v })} />
        <span className="text-sm text-text-primary">{s.enrollment_hide_until_start ? "Yes" : "No"}</span>
      </div>
    </SimpleCard>
  );
}


function NewHirePreviewSection() {
  const q = useBenefitCompanySettings();
  const patch = usePatchCompanySettings();
  const s = q.data;
  if (!s) return <div className="text-sm text-text-muted">Loading…</div>;
  return (
    <SimpleCard title="New hire benefits preview"
      description="Let candidates preview their benefits before their start date.">
      <div className="flex items-center gap-3">
        <Toggle checked={s.new_hire_preview_enabled}
          onChange={(v) => patch.mutate({ new_hire_preview_enabled: v })} />
        <span className="text-sm text-text-primary">{s.new_hire_preview_enabled ? "Enabled" : "Disabled"}</span>
      </div>
    </SimpleCard>
  );
}


function NewlyEligibleSection() {
  const q = useBenefitCompanySettings();
  const patch = usePatchCompanySettings();
  const s = q.data;
  if (!s) return <div className="text-sm text-text-muted">Loading…</div>;
  return (
    <SimpleCard title="Newly-eligible employee enrollment window"
      description="How long does a newly-eligible employee have to enroll in coverage?">
      <div className="flex items-center gap-3">
        <input
          type="number"
          defaultValue={s.newly_eligible_window_days}
          onBlur={(e) => {
            const v = Number(e.target.value);
            if (v && v !== s.newly_eligible_window_days) {
              patch.mutate({ newly_eligible_window_days: v });
            }
          }}
          className="w-24 border border-border rounded-lg px-3 py-2 text-sm bg-bg-card text-text-primary"
        />
        <span className="text-sm text-text-primary">days after the employee's effective date</span>
      </div>
    </SimpleCard>
  );
}


function PartTimeSection() {
  const q = useBenefitCompanySettings();
  const patch = usePatchCompanySettings();
  const s = q.data;
  if (!s) return <div className="text-sm text-text-muted">Loading…</div>;
  return (
    <SimpleCard title="Part-time employee eligibility"
      description="Offer health insurance to part-time employees working between 20-30 hours.">
      <div className="flex items-center gap-3">
        <Toggle checked={s.part_time_offer_health}
          onChange={(v) => patch.mutate({ part_time_offer_health: v })} />
        <span className="text-sm text-text-primary">{s.part_time_offer_health ? "Yes" : "No"}</span>
      </div>
    </SimpleCard>
  );
}


function CostInAppSection() {
  const q = useBenefitCompanySettings();
  const patch = usePatchCompanySettings();
  const s = q.data;
  if (!s) return <div className="text-sm text-text-muted">Loading…</div>;
  return (
    <SimpleCard title="Cost in My Benefits app"
      description="Show employees the monthly cost of their elected coverage in the My Benefits app.">
      <div className="flex items-center gap-3">
        <Toggle checked={s.cost_show_monthly_in_app}
          onChange={(v) => patch.mutate({ cost_show_monthly_in_app: v })} />
        <span className="text-sm text-text-primary">{s.cost_show_monthly_in_app ? "Yes" : "No"}</span>
      </div>
    </SimpleCard>
  );
}


function CostHideSection() {
  const q = useBenefitCompanySettings();
  const patch = usePatchCompanySettings();
  const s = q.data;
  if (!s) return <div className="text-sm text-text-muted">Loading…</div>;
  return (
    <SimpleCard title="Hide company contribution"
      description={`Hide the company's contribution for benefits coverage in the employee enrollment flow. ("Yes" means employees will only see their monthly deduction.)`}>
      <div className="flex items-center gap-3">
        <Toggle checked={s.cost_hide_company_contribution}
          onChange={(v) => patch.mutate({ cost_hide_company_contribution: v })} />
        <span className="text-sm text-text-primary">{s.cost_hide_company_contribution ? "Yes" : "No"}</span>
      </div>
    </SimpleCard>
  );
}


function EoiApprovalSection() {
  return (
    <SimpleCard title="Evidence of Insurability approval"
      description="By default, all insurance admins can approve EOI requests. Narrow this list to control who gets email alerts + access to the EOI dashboard in the Life/Voluntary Life apps.">
      <div className="text-sm text-text-muted">
        EOI requests live under <span className="text-text-primary font-medium">Enrollments › EOI</span>.
      </div>
    </SimpleCard>
  );
}


function QleSettingsSection() {
  const q = useBenefitCompanySettings();
  const patch = usePatchCompanySettings();
  const s = q.data;
  if (!s) return <div className="text-sm text-text-muted">Loading…</div>;
  return (
    <SimpleCard title="Qualifying life event approval"
      description="Require an administrator to approve qualifying life events before submitting to the carrier.">
      <div className="flex items-center gap-3">
        <Toggle checked={s.qle_require_admin_approval}
          onChange={(v) => patch.mutate({ qle_require_admin_approval: v })} />
        <span className="text-sm text-text-primary">{s.qle_require_admin_approval ? "Yes" : "No"}</span>
      </div>
    </SimpleCard>
  );
}


function IntegrationsSection() {
  const q = useBenefitCompanySettings();
  const patch = usePatchCompanySettings();
  const s = q.data;
  if (!s) return <div className="text-sm text-text-muted">Loading…</div>;
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-[#7b2cbf]/10 text-[#7b2cbf] flex items-center justify-center shrink-0">
            <Plus className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-text-primary">Form Forwarding</div>
                <div className="text-sm text-text-muted mt-1 max-w-xl">
                  Rippling can forward enrollment changes to your carrier on your behalf at no extra cost. Automate your process with form forwarding.
                </div>
              </div>
              <button
                onClick={() => patch.mutate({ form_forwarding_enabled: !s.form_forwarding_enabled })}
                className={
                  "px-3 py-1.5 text-sm rounded-lg font-medium " +
                  (s.form_forwarding_enabled
                    ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                    : "bg-[#7b2cbf] text-white hover:bg-[#5a189a]")
                }
              >
                {s.form_forwarding_enabled ? "✓ Enabled" : "Enable"}
              </button>
            </div>
            <p className="text-xs text-text-muted mt-2">
              You are responsible for ensuring carrier contact info is correct. Rippling does not confirm enrollments with carriers.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Plus className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-text-primary">Carrier Connect</div>
                <div className="text-sm text-text-muted mt-1 max-w-xl">
                  Set up a direct API or EDI integration with your carriers to streamline processing of routine member changes (new-hire enrollments, qualifying life events, demographic changes, terminations).
                </div>
              </div>
              <select
                value={s.carrier_connect_tier}
                onChange={(e) => patch.mutate({ carrier_connect_tier: e.target.value })}
                className="px-3 py-1.5 text-sm border border-border rounded-lg bg-bg-card text-text-primary"
              >
                <option value="standard">Standard</option>
                <option value="premium">Premium (upgrade)</option>
              </select>
            </div>
            <p className="text-xs text-text-muted mt-2">
              Direct integrations require eligible employee minimums and additional costs apply.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}


function CompanyDetailsTab() {
  return (
    <Card className="mt-6">
      <div className="text-base font-semibold text-text-primary">Company details</div>
      <p className="text-sm text-text-muted mt-1">
        Company information used by carriers and filings lives in your main
        Admin → Settings area. Jump there from the sidebar.
      </p>
    </Card>
  );
}
