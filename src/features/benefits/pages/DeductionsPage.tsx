import { useMemo, useState } from "react";
import { AlertTriangle, Info, Filter, Search, Check } from "lucide-react";

import { Card } from "@/components/ui/Card";

import {
  useAutoManageAll,
  usePatchScheduledDeduction,
  usePushDeductions,
  useScheduledDeductions,
  type ScheduledDeduction,
} from "../api";


const BENEFIT_TYPES = [
  { value: "medical", label: "Medical" },
  { value: "dental", label: "Dental" },
  { value: "vision", label: "Vision" },
  { value: "std", label: "Short Term Disability" },
  { value: "ltd", label: "Long Term Disability" },
  { value: "life", label: "Life" },
];


function toNum(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isNaN(n) ? 0 : n;
}


function fmtMoney(v: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(toNum(v));
}


function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}


function hasDiscrepancy(r: ScheduledDeduction): boolean {
  return (
    toNum(r.ee_rippling) !== toNum(r.ee_in_payroll) ||
    toNum(r.er_rippling) !== toNum(r.er_in_payroll) ||
    toNum(r.taxable_rippling) !== toNum(r.taxable_in_payroll)
  );
}


function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .filter((c) => c && /[A-Za-z]/.test(c))
    .slice(0, 2)
    .join("");
}


export function DeductionsPage() {
  const [benefitType, setBenefitType] = useState("medical");
  const [onlyDiscrepancies, setOnlyDiscrepancies] = useState(false);
  const [search, setSearch] = useState("");

  const q = useScheduledDeductions({
    benefit_type: benefitType,
    only_discrepancies: onlyDiscrepancies,
    q: search.trim() || undefined,
  });
  const rows = q.data ?? [];

  const totalDiscrepancies = useMemo(
    () => rows.filter(hasDiscrepancy).length,
    [rows],
  );
  const needsAutoManage = useMemo(
    () => rows.filter((r) => !r.auto_manage).length,
    [rows],
  );

  const push = usePushDeductions();
  const autoManage = useAutoManageAll();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold text-text-primary">Deductions</h1>
      <nav className="mt-6 border-b border-border">
        <div className="inline-flex px-4 py-2 text-sm border-b-2 border-[#c77dff] text-[#7b2cbf] font-medium -mb-px">
          Deductions
        </div>
      </nav>

      <div className="mt-6 max-w-md">
        <select
          value={benefitType}
          onChange={(e) => setBenefitType(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-bg-card text-text-primary font-medium"
        >
          {BENEFIT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {totalDiscrepancies > 0 && (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-text-primary">
              Discrepancy detected
            </div>
            <p className="text-sm text-text-secondary mt-1">
              There are discrepancies for {totalDiscrepancies} of your
              employees between the deductions calculated by Rippling's
              insurance system and their respective values in payroll. Click{" "}
              <strong>Push deductions</strong> to ensure the most accurate and
              up-to-date values are being used in payroll calculations.
            </p>
            <button
              onClick={() => push.mutate(benefitType)}
              disabled={push.isPending}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {push.isPending ? "Pushing…" : "Push deductions"}
            </button>
          </div>
        </div>
      )}

      {needsAutoManage > 0 && (
        <div className="mt-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-text-primary">
              Automate insurance deduction management for all employees
            </div>
            <p className="text-sm text-text-secondary mt-1">
              {needsAutoManage} of your employees do not have their payroll
              deductions set to be automatically managed by Rippling's
              insurance product. This means errors to their payroll could be
              introduced if the systems fall out of sync. Click{" "}
              <strong>Auto-manage deductions</strong> to ensure that insurance
              deductions for all of your employees are automatically updated
              by Rippling.
            </p>
            <button
              onClick={() => autoManage.mutate(benefitType)}
              disabled={autoManage.isPending}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {autoManage.isPending ? "Updating…" : "Auto-manage deductions"}
            </button>
          </div>
        </div>
      )}

      <Card className="mt-6 p-0">
        <header className="px-5 py-4 border-b border-border">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-text-primary">
                Future scheduled deductions · {rows.length}
              </div>
              {totalDiscrepancies > 0 && (
                <div className="text-xs text-amber-600 mt-0.5">
                  {totalDiscrepancies} row{totalDiscrepancies === 1 ? "" : "s"} with discrepancies
                </div>
              )}
            </div>
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg text-text-secondary hover:text-text-primary">
              <Filter className="w-3.5 h-3.5" />
              Filter
            </button>
          </div>
        </header>

        <div className="px-5 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-bg-card text-text-primary"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-text-primary cursor-pointer">
            <button
              type="button"
              onClick={() => setOnlyDiscrepancies((v) => !v)}
              aria-pressed={onlyDiscrepancies}
              className={
                "relative inline-flex h-5 w-9 items-center rounded-full transition " +
                (onlyDiscrepancies ? "bg-[#7b2cbf]" : "bg-neutral-300")
              }
            >
              <span
                className={
                  "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition " +
                  (onlyDiscrepancies ? "translate-x-4" : "translate-x-0.5")
                }
              />
            </button>
            Only show discrepancies
          </label>
        </div>

        {q.isLoading ? (
          <div className="p-10 text-center text-sm text-text-muted">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-text-muted">
            No scheduled deductions for this benefit type.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-[10px] uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Employee</th>
                  <th className="text-left font-medium px-3 py-3">Auto-manage</th>
                  <th className="text-left font-medium px-3 py-3">Plan</th>
                  <th className="text-left font-medium px-3 py-3">Effective</th>
                  <th className="text-right font-medium px-3 py-3">
                    EE deduction<br/>
                    <span className="normal-case text-[9px] text-text-muted/70">Rippling calc</span>
                  </th>
                  <th className="text-right font-medium px-3 py-3">
                    <span className="normal-case text-[9px] text-text-muted/70">In payroll</span>
                  </th>
                  <th className="text-right font-medium px-3 py-3">
                    Company contrib<br/>
                    <span className="normal-case text-[9px] text-text-muted/70">Rippling calc</span>
                  </th>
                  <th className="text-right font-medium px-3 py-3">
                    <span className="normal-case text-[9px] text-text-muted/70">In payroll</span>
                  </th>
                  <th className="text-right font-medium px-3 py-3 pr-5">
                    Taxable cost<br/>
                    <span className="normal-case text-[9px] text-text-muted/70">In payroll</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <DeductionRow key={r.id} row={r} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}


function DeductionRow({ row }: { row: ScheduledDeduction }) {
  const patch = usePatchScheduledDeduction();
  const hasDisc = hasDiscrepancy(row);

  const diffCell = (a: number | string | null, b: number | string | null) =>
    toNum(a) !== toNum(b) ? "text-amber-600 font-medium" : "text-text-primary";

  return (
    <tr
      className={
        "border-b border-border/60 hover:bg-bg-muted transition " +
        (hasDisc ? "bg-amber-500/[0.03]" : "")
      }
    >
      <td className="px-5 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={
              "w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium shrink-0 " +
              (hasDisc
                ? "bg-amber-500/10 text-amber-600"
                : "bg-violet-500/10 text-violet-600")
            }
          >
            {initials(row.employee_name) || "?"}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-text-primary truncate">
              {row.employee_name}
            </div>
            {hasDisc && (
              <div className="text-[11px] text-amber-600">
                Discrepancy detected
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <button
          type="button"
          onClick={() =>
            patch.mutate({ id: row.id, auto_manage: !row.auto_manage })
          }
          disabled={patch.isPending}
          aria-pressed={row.auto_manage}
          aria-label={`Toggle auto-manage for ${row.employee_name}`}
          className={
            "relative inline-flex h-5 w-9 items-center rounded-full transition " +
            (row.auto_manage ? "bg-[#7b2cbf]" : "bg-neutral-300") +
            (patch.isPending ? " opacity-50 cursor-not-allowed" : " cursor-pointer")
          }
        >
          <span
            className={
              "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition " +
              (row.auto_manage ? "translate-x-4" : "translate-x-0.5")
            }
          />
        </button>
      </td>
      <td className="px-3 py-3 text-text-primary">
        {row.plan_name ?? "—"}
      </td>
      <td className="px-3 py-3 text-text-secondary">
        {fmtDate(row.effective_date)}
      </td>
      <td className="px-3 py-3 text-right text-text-primary">
        {fmtMoney(row.ee_rippling)}
      </td>
      <td className={"px-3 py-3 text-right " + diffCell(row.ee_rippling, row.ee_in_payroll)}>
        {fmtMoney(row.ee_in_payroll)}
      </td>
      <td className="px-3 py-3 text-right text-text-primary">
        {fmtMoney(row.er_rippling)}
      </td>
      <td className={"px-3 py-3 text-right " + diffCell(row.er_rippling, row.er_in_payroll)}>
        {fmtMoney(row.er_in_payroll)}
      </td>
      <td
        className={
          "px-3 py-3 text-right pr-5 " +
          diffCell(row.taxable_rippling, row.taxable_in_payroll)
        }
      >
        {fmtMoney(row.taxable_in_payroll)}
      </td>
    </tr>
  );
}


// Unused but keeps tree shaking happy with the Check icon (used in Integrations)
export const _unused_check = Check;
