import { Link } from "react-router-dom";
import {
  Users,
  Umbrella,
  DollarSign,
  Clock,
  FileCheck2,
  Heart,
  PiggyBank,
  FileSpreadsheet,
  HardHat,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";

import { useBenefitsOverview } from "../api";


const fmt = (v: number | string | null | undefined) => {
  const n = typeof v === "string" ? parseFloat(v) : (v ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n || 0);
};


export function BenefitsOverviewPage() {
  const q = useBenefitsOverview();
  const s = q.data;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 rounded-xl bg-gradient-to-r from-[#2a1230] via-[#3a1845] to-[#2a1230] p-6 text-white relative overflow-hidden">
        <div className="relative">
          <h1 className="text-2xl font-semibold">Benefits</h1>
          <p className="text-white/60 mt-1 text-sm">
            Health, voluntary, and leave plans for every employee.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-sm text-white/80">
              <Users className="w-3.5 h-3.5 text-[#c77dff]" />
              {s?.active_enrollments ?? "—"} active enrollments
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-sm text-white/80">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              {s?.pending_events ?? "—"} pending events
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-sm text-white/80">
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
              {s?.pending_eoi ?? "—"} pending EOI
            </span>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total enrollments"
          value={s?.total_enrollments}
          hint="Across all benefit types"
          icon={Users}
          accent="violet"
        />
        <StatCard
          label="Monthly employer cost"
          value={s ? fmt(s.total_monthly_cost) : undefined}
          hint="Company contribution"
          icon={DollarSign}
          accent="emerald"
        />
        <StatCard
          label="Monthly employee deductions"
          value={s ? fmt(s.total_monthly_deduction) : undefined}
          hint="Pre-tax pulled"
          icon={PiggyBank}
          accent="blue"
        />
        <StatCard
          label="Waived"
          value={s?.waived}
          hint="Declined coverage"
          icon={Umbrella}
          accent="rose"
        />
      </section>

      <section className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Shortcut to="/benefits/enrollments" icon={Users} title="Enrollments" hint="4 tabs: details / history / events / EOI" accent="violet" />
        <Shortcut to="/benefits/my" icon={Heart} title="My Benefits" hint="What I'm enrolled in" accent="rose" />
        <Shortcut to="/benefits/deductions" icon={PiggyBank} title="Deductions" hint="Pre-tax / post-tax" accent="blue" />
        <Shortcut to="/benefits/fsa" icon={FileSpreadsheet} title="FSA" hint="Flexible spending" accent="emerald" />
        <Shortcut to="/benefits/workers-comp" icon={HardHat} title="Workers' Comp" hint="Claims & coverage" accent="amber" />
        <Shortcut to="/benefits/aca" icon={FileCheck2} title="ACA" hint="1094/1095 filings" accent="indigo" />
      </section>

      {s && Object.keys(s.by_benefit_type).length > 0 && (
        <Card className="mt-6 p-0">
          <header className="px-5 py-3 border-b border-border">
            <div className="text-sm font-semibold text-text-primary">
              Enrollments by benefit type
            </div>
          </header>
          <ul className="divide-y divide-border">
            {Object.entries(s.by_benefit_type)
              .sort(([, a], [, b]) => b - a)
              .map(([type, n]) => (
                <li key={type}>
                  <Link
                    to={`/benefits/enrollments?benefit_type=${type}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-bg-muted transition"
                  >
                    <span className="capitalize text-text-primary">
                      {type.replace("_", " ")}
                    </span>
                    <span className="text-sm font-medium text-text-primary">
                      {n}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </Card>
      )}
    </div>
  );
}


const ACCENT: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-500" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-500" },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-500" },
  rose: { bg: "bg-rose-500/10", text: "text-rose-500" },
  indigo: { bg: "bg-indigo-500/10", text: "text-indigo-500" },
};


function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string | undefined;
  hint: string;
  icon: typeof Users;
  accent: keyof typeof ACCENT;
}) {
  const a = ACCENT[accent];
  return (
    <Card className="stat-card">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-text-secondary">{label}</p>
            <p className="text-3xl font-bold text-text-primary mt-1">
              {value ?? "—"}
            </p>
            <p className="text-xs text-text-muted mt-1">{hint}</p>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${a.bg}`}>
            <Icon className={`w-5 h-5 ${a.text}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


function Shortcut({
  to,
  icon: Icon,
  title,
  hint,
  accent,
}: {
  to: string;
  icon: typeof Users;
  title: string;
  hint: string;
  accent: keyof typeof ACCENT;
}) {
  const a = ACCENT[accent];
  return (
    <Link to={to} className="block">
      <Card className="stat-card cursor-pointer hover:border-[#c77dff] p-4">
        <div className="flex flex-col gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.bg}`}>
            <Icon className={`w-5 h-5 ${a.text}`} />
          </div>
          <div>
            <div className="text-sm font-semibold text-text-primary">{title}</div>
            <div className="text-xs text-text-muted mt-0.5">{hint}</div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
