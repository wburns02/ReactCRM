import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Copy,
  ExternalLink,
  Check,
  Rss,
  Webhook,
  Briefcase,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import { apiClient } from "@/api/client";
import { useRequisitions, useUpdateRequisition } from "../api";
import type { Requisition } from "../api";


// API base URL includes /api/v2; strip it to get the service root for
// public URLs like /careers/* and /hr/indeed-apply.
function getApiRoot(): string {
  // apiClient.defaults.baseURL is like "https://.../api/v2"
  const base = (apiClient.defaults.baseURL ?? "").replace(/\/api\/v2\/?$/, "");
  return base || "https://react-crm-api-production.up.railway.app";
}


export function IndeedSettingsPage() {
  const root = getApiRoot();
  const feedUrl = `${root}/careers/indeed-feed.xml`;
  const webhookUrl = `${root}/hr/indeed-apply`;
  const reqs = useRequisitions();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">
            Indeed integration
          </h1>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl">
            Publish open roles to Indeed via an XML feed, and receive
            applicants automatically when candidates click "Apply with
            Indeed".
          </p>
        </div>
        <Link
          to="/hr"
          className="text-sm text-text-secondary hover:text-text-primary"
        >
          ← Back to HR
        </Link>
      </div>

      <section className="grid md:grid-cols-2 gap-4 mt-6">
        <UrlCard
          icon={Rss}
          accent="blue"
          label="Indeed XML feed"
          url={feedUrl}
          hint="Paste this URL into Indeed's XML feed setup so they can crawl open requisitions."
        />
        <UrlCard
          icon={Webhook}
          accent="violet"
          label="Indeed Apply webhook"
          url={webhookUrl}
          hint="Indeed POSTs applicant JSON here when a candidate uses Apply with Indeed."
        />
      </section>

      <Card className="mt-6 bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-950/20 dark:to-transparent">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <ExternalLink className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-text-primary">
              Promote a role on Indeed
            </div>
            <p className="text-sm text-text-secondary mt-1">
              Free listings are pulled from the feed above.  Paid
              "Sponsored" promotion is managed from the Indeed Employer
              dashboard.
            </p>
            <a
              href="https://employers.indeed.com/home"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-sm hover:bg-neutral-800"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Indeed Employer dashboard
            </a>
          </div>
        </div>
      </Card>

      <Card className="mt-6 p-0">
        <header className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-text-primary">
              Requisitions
            </div>
            <div className="text-xs text-text-muted">
              Toggle which open roles appear in the Indeed feed.
            </div>
          </div>
          <div className="text-xs text-text-muted">
            {(reqs.data ?? []).filter(
              (r) => r.status === "open" && r.publish_to_indeed,
            ).length}{" "}
            publishing
          </div>
        </header>
        {reqs.isLoading ? (
          <div className="p-6 text-sm text-text-muted">Loading…</div>
        ) : reqs.error ? (
          <div className="p-6 text-sm text-rose-600">{reqs.error.message}</div>
        ) : (reqs.data ?? []).length === 0 ? (
          <div className="p-10 text-center text-sm text-text-muted">
            No requisitions yet.{" "}
            <Link
              to="/hr/requisitions/new"
              className="text-indigo-600 hover:underline"
            >
              Create one
            </Link>
            .
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {(reqs.data ?? []).map((r) => (
              <RequisitionRow key={r.id} req={r} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}


function UrlCard({
  icon: Icon,
  accent,
  label,
  url,
  hint,
}: {
  icon: typeof Rss;
  accent: "blue" | "violet";
  label: string;
  url: string;
  hint: string;
}) {
  const [copied, setCopied] = useState(false);
  const bg = accent === "blue" ? "bg-blue-500/10" : "bg-violet-500/10";
  const text = accent === "blue" ? "text-blue-500" : "text-violet-500";

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fall back silently
    }
  };

  return (
    <Card>
      <CardContent>
        <div className="flex items-start gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center ${bg}`}
          >
            <Icon className={`w-5 h-5 ${text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-text-primary">
              {label}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 min-w-0 truncate text-xs bg-bg-muted text-text-primary px-2 py-1.5 rounded-lg border border-border">
                {url}
              </code>
              <button
                type="button"
                onClick={onCopy}
                className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 text-xs border border-border rounded-lg hover:border-indigo-400 text-text-secondary hover:text-text-primary"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-text-muted mt-2">{hint}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


function RequisitionRow({ req }: { req: Requisition }) {
  const update = useUpdateRequisition(req.id);
  const enabled = useMemo(
    () => req.publish_to_indeed && req.status === "open",
    [req.publish_to_indeed, req.status],
  );
  const canToggle = req.status === "open";

  const onToggle = () => {
    if (!canToggle) return;
    update.mutate({ publish_to_indeed: !req.publish_to_indeed });
  };

  return (
    <li className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-bg-muted transition">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
          <Briefcase className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <Link
            to={`/hr/requisitions/${req.id}`}
            className="font-medium text-text-primary hover:underline truncate block"
          >
            {req.title}
          </Link>
          <div className="text-xs text-text-muted truncate">
            {req.slug} · {req.status}
            {req.location_city && ` · ${req.location_city}`}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            enabled
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-neutral-500/10 text-text-muted"
          }`}
        >
          {req.status !== "open"
            ? "Not open"
            : req.publish_to_indeed
              ? "Publishing"
              : "Paused"}
        </span>
        <button
          type="button"
          onClick={onToggle}
          disabled={!canToggle || update.isPending}
          aria-pressed={req.publish_to_indeed}
          aria-label={`Toggle publish to Indeed for ${req.title}`}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
            req.publish_to_indeed ? "bg-indigo-600" : "bg-neutral-300"
          } ${!canToggle || update.isPending ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${
              req.publish_to_indeed ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </li>
  );
}
