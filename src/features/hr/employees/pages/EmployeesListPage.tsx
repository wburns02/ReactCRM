import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Mail, Phone, MapPin, UserPlus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import { useTechnicians } from "@/api/hooks/useTechnicians";
import {
  flattenNodes,
  type OrgNode,
} from "@/features/hr/dashboard/orgChartData";
import type { Technician } from "@/api/types/technician";


interface EmployeeRow {
  id: string;
  name: string;
  title: string;
  department: string;
  location?: string;
  email?: string;
  phone?: string;
  status: "active" | "vacant";
  source: "database" | "org-chart";
  detailHref?: string;
}


function orgNodeToRow(node: OrgNode): EmployeeRow {
  return {
    id: `org:${node.id}`,
    name: node.name,
    title: node.title,
    department: deriveDepartment(node),
    location: node.location,
    email: node.email,
    phone: node.phone,
    status: node.vacancy ? "vacant" : "active",
    source: "org-chart",
  };
}


function deriveDepartment(node: OrgNode): string {
  if (node.kind === "executive") return "Executive";
  if (node.kind.startsWith("office_") || node.kind.startsWith("vto_")) {
    const loc = node.kind.split("_").slice(1).join("_");
    return (
      {
        nashville: "Nashville",
        sc_midlands: "SC Midlands",
        rock_hill: "Rock Hill",
        san_marcos: "San Marcos",
      } as Record<string, string>
    )[loc] ?? "Field";
  }
  return "Other";
}


function techToRow(t: Technician): EmployeeRow {
  return {
    id: `tech:${t.id}`,
    name:
      t.full_name ||
      `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim() ||
      "Unnamed",
    title: "Field Technician",
    department:
      t.department ??
      (t.home_state ? `Field (${t.home_state})` : "Field"),
    location:
      [t.home_city, t.home_state].filter(Boolean).join(", ") || undefined,
    email: t.email ?? undefined,
    phone: t.phone ?? undefined,
    status: t.is_active ? "active" : "vacant",
    source: "database",
    detailHref: `/technicians/${t.id}`,
  };
}


function mergeRoster(
  orgRows: EmployeeRow[],
  techRows: EmployeeRow[],
): EmployeeRow[] {
  // If a tech's name matches an org-chart row, prefer the DB entry (it has
  // contact info + a detail link). Otherwise show both. Match is case-
  // insensitive on trimmed full name.
  const byName = new Map(
    orgRows.map((r) => [r.name.trim().toLowerCase(), r]),
  );
  const merged: EmployeeRow[] = [];
  const consumedOrgKeys = new Set<string>();
  for (const t of techRows) {
    const key = t.name.trim().toLowerCase();
    if (byName.has(key)) {
      const org = byName.get(key)!;
      merged.push({
        ...org,
        email: t.email ?? org.email,
        phone: t.phone ?? org.phone,
        location: t.location ?? org.location,
        status: t.status,
        source: "database",
        detailHref: t.detailHref,
      });
      consumedOrgKeys.add(key);
    } else {
      merged.push(t);
    }
  }
  for (const r of orgRows) {
    if (!consumedOrgKeys.has(r.name.trim().toLowerCase())) merged.push(r);
  }
  return merged;
}


export function EmployeesListPage() {
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "vacant">(
    "all",
  );

  const techs = useTechnicians({ page: 1, page_size: 200, active_only: false });

  const rows = useMemo(() => {
    const orgRows = flattenNodes().map(orgNodeToRow);
    const techRows = (techs.data?.items ?? []).map(techToRow);
    return mergeRoster(orgRows, techRows);
  }, [techs.data]);

  const departments = useMemo(
    () => Array.from(new Set(rows.map((r) => r.department))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (departmentFilter && r.department !== departmentFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (
        q &&
        !(
          r.name.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q)
        )
      )
        return false;
      return true;
    });
  }, [rows, search, departmentFilter, statusFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, EmployeeRow[]>();
    for (const r of filtered) {
      if (!map.has(r.department)) map.set(r.department, []);
      map.get(r.department)!.push(r);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const totalActive = rows.filter((r) => r.status === "active").length;
  const totalVacant = rows.filter((r) => r.status === "vacant").length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Employees</h1>
          <p className="text-sm text-text-secondary mt-1">
            All Mac Septic employees across offices, executives, and field
            teams.
          </p>
        </div>
        <Link
          to="/hr"
          className="text-sm text-text-secondary hover:text-text-primary"
        >
          ← Back to HR
        </Link>
      </div>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <Card className="stat-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-secondary">Total employees</p>
                <p className="text-3xl font-bold text-text-primary mt-1">
                  {rows.length}
                </p>
                <p className="text-xs text-text-muted mt-1">Across all roles</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-indigo-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-secondary">Active</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">
                  {totalActive}
                </p>
                <p className="text-xs text-text-muted mt-1">Currently staffed</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-secondary">Open positions</p>
                <p className="text-3xl font-bold text-rose-600 mt-1">
                  {totalVacant}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Recruiting in progress
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-rose-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-text-secondary">Departments</p>
                <p className="text-3xl font-bold text-text-primary mt-1">
                  {departments.length}
                </p>
                <p className="text-xs text-text-muted mt-1">Organizational</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="mt-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_160px] gap-3">
          <input
            type="search"
            placeholder="Search by name, title, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-bg-card text-text-primary"
          />
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-bg-card text-text-primary"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "active" | "vacant")
            }
            className="border border-border rounded-lg px-3 py-2 text-sm bg-bg-card text-text-primary"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="vacant">Vacant</option>
          </select>
        </div>
      </Card>

      {grouped.length === 0 ? (
        <Card className="mt-6">
          <div className="text-sm text-text-muted text-center py-6">
            No employees match these filters.
          </div>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {grouped.map(([dept, rs]) => (
            <Card key={dept} className="p-0">
              <header className="px-5 py-3 border-b border-border flex items-center justify-between">
                <div className="text-sm font-semibold text-text-primary">
                  {dept}
                </div>
                <div className="text-xs text-text-muted">
                  {rs.length} {rs.length === 1 ? "person" : "people"}
                </div>
              </header>
              <ul className="divide-y divide-border">
                {rs.map((r) => (
                  <EmployeeRowItem key={r.id} row={r} />
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


function EmployeeRowItem({ row }: { row: EmployeeRow }) {
  const body = (
    <div className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-bg-muted transition">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={
            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium " +
            (row.status === "vacant"
              ? "bg-rose-500/10 text-rose-600"
              : "bg-indigo-500/10 text-indigo-600")
          }
        >
          {row.name
            .split(/\s+/)
            .map((n) => n[0])
            .filter((c) => c && /[A-Za-z]/.test(c))
            .slice(0, 2)
            .join("") || "?"}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-text-primary truncate">
              {row.name}
            </span>
            {row.status === "vacant" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600">
                OPEN
              </span>
            )}
            {row.source === "database" && row.status === "active" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                On payroll
              </span>
            )}
          </div>
          <div className="text-xs text-text-muted truncate">
            {row.title}
            {row.location && ` · ${row.location}`}
          </div>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-4 shrink-0 text-xs text-text-muted">
        {row.email && (
          <span className="inline-flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {row.email}
          </span>
        )}
        {row.phone && (
          <span className="inline-flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {row.phone}
          </span>
        )}
      </div>
    </div>
  );

  if (row.detailHref) {
    return (
      <li>
        <Link to={row.detailHref} className="block">
          {body}
        </Link>
      </li>
    );
  }
  return <li>{body}</li>;
}
