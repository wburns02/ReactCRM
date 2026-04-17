/**
 * Mac Septic org chart data.
 *
 * Starts as a hard-coded tree reflecting the 2026-04-17 hierarchy; future
 * iterations can hydrate from /hr/employees or a dedicated `hr_org_chart`
 * table.  Colors map to branch (office) — keep consistent with Will's
 * physical org-chart artifact so new hires recognise the layout.
 */

export type NodeKind =
  | "executive"
  | "office_nashville"
  | "office_sc_midlands"
  | "office_rock_hill"
  | "office_san_marcos"
  | "vto_nashville"
  | "vto_sc_midlands"
  | "vto_rock_hill"
  | "vto_san_marcos";


export interface OrgNode {
  id: string;
  title: string;
  name: string;
  kind: NodeKind;
  vacancy?: boolean;
  location?: string;
  email?: string;
  phone?: string;
  department?: string;
  reports_to?: string;
  children?: OrgNode[];
}


export const ORG_ROOT: OrgNode = {
  id: "president",
  title: "President",
  name: "Matt Carter",
  kind: "executive",
  location: "Executive",
  children: [
    {
      id: "chief-of-staff",
      title: "Chief of Staff",
      name: "Natalie Hustek",
      kind: "executive",
      reports_to: "Matt Carter",
    },
    {
      id: "evp",
      title: "EVP",
      name: "Doug Carter",
      kind: "executive",
      reports_to: "Matt Carter",
      children: [
        {
          id: "office-nashville",
          title: "Nashville Office",
          name: "Doug Carter",
          kind: "office_nashville",
          reports_to: "Doug Carter",
          children: [
            {
              id: "vto-nashville",
              title: "Nashville VTO",
              name: "John Harvey",
              kind: "vto_nashville",
              reports_to: "Doug Carter",
            },
          ],
        },
        {
          id: "office-sc-midlands",
          title: "SC Midlands Office",
          name: "Marvin Carter",
          kind: "office_sc_midlands",
          reports_to: "Doug Carter",
          children: [
            {
              id: "vto-columbia",
              title: "Columbia VTO",
              name: "Chandler Turney",
              kind: "vto_sc_midlands",
              reports_to: "Marvin Carter",
            },
            {
              id: "electrical-tech",
              title: "Electrical Service Tech",
              name: "Wade DeLoach",
              kind: "vto_sc_midlands",
              reports_to: "Marvin Carter",
            },
          ],
        },
        {
          id: "office-rock-hill",
          title: "Rock Hill Office",
          name: "Marvin Carter",
          kind: "office_rock_hill",
          reports_to: "Doug Carter",
          children: [
            {
              id: "tech-ref",
              title: "Technical Reference / SME",
              name: "Danny Smith",
              kind: "vto_rock_hill",
              reports_to: "Marvin Carter",
            },
            {
              id: "vto-rock-hill",
              title: "Rock Hill VTO",
              name: "[Recruiting in Progress]",
              kind: "vto_rock_hill",
              vacancy: true,
              reports_to: "Marvin Carter",
            },
          ],
        },
        {
          id: "office-san-marcos",
          title: "San Marcos Office",
          name: "Will Burns",
          kind: "office_san_marcos",
          reports_to: "Doug Carter",
          children: [
            {
              id: "vto-san-marcos",
              title: "San Marcos VTO",
              name: "Ronnie Ransom",
              kind: "vto_san_marcos",
              reports_to: "Will Burns",
            },
            {
              id: "ops-admin",
              title: "Ops / Invoicing / Admin",
              name: "[Will Referral]",
              kind: "vto_san_marcos",
              vacancy: true,
              reports_to: "Will Burns",
            },
          ],
        },
      ],
    },
    {
      id: "founder",
      title: "Founder / SME",
      name: "Marvin Carter",
      kind: "executive",
      reports_to: "Matt Carter",
    },
    {
      id: "org-sme",
      title: "Organizational SME",
      name: "Kent Nygren",
      kind: "executive",
      reports_to: "Matt Carter",
    },
  ],
};


export function findNode(id: string, node: OrgNode = ORG_ROOT): OrgNode | null {
  if (node.id === id) return node;
  for (const c of node.children ?? []) {
    const hit = findNode(id, c);
    if (hit) return hit;
  }
  return null;
}


export function flattenNodes(node: OrgNode = ORG_ROOT): OrgNode[] {
  const out: OrgNode[] = [node];
  for (const c of node.children ?? []) out.push(...flattenNodes(c));
  return out;
}


/** Tailwind classes per node kind — matches Will's physical chart colors. */
export const NODE_STYLES: Record<NodeKind, { bg: string; border: string; text: string }> = {
  executive: {
    bg: "bg-emerald-100",
    border: "border-emerald-400",
    text: "text-emerald-900",
  },
  office_nashville: {
    bg: "bg-amber-100",
    border: "border-amber-400",
    text: "text-amber-900",
  },
  office_sc_midlands: {
    bg: "bg-orange-100",
    border: "border-orange-400",
    text: "text-orange-900",
  },
  office_rock_hill: {
    bg: "bg-sky-100",
    border: "border-sky-400",
    text: "text-sky-900",
  },
  office_san_marcos: {
    bg: "bg-indigo-100",
    border: "border-indigo-400",
    text: "text-indigo-900",
  },
  vto_nashville: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-900",
  },
  vto_sc_midlands: {
    bg: "bg-orange-50",
    border: "border-orange-300",
    text: "text-orange-900",
  },
  vto_rock_hill: {
    bg: "bg-sky-50",
    border: "border-sky-300",
    text: "text-sky-900",
  },
  vto_san_marcos: {
    bg: "bg-indigo-50",
    border: "border-indigo-300",
    text: "text-indigo-900",
  },
};
