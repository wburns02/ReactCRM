import { useEffect, useState } from "react";

import {
  useMessageTemplates,
  useUpdateMessageTemplate,
  type MessageTemplate,
} from "../api-templates";


function TemplateEditor({ template }: { template: MessageTemplate }) {
  const [body, setBody] = useState(template.body);
  const [active, setActive] = useState(template.active);
  const [dirty, setDirty] = useState(false);
  const update = useUpdateMessageTemplate(template.stage);

  useEffect(() => {
    setBody(template.body);
    setActive(template.active);
    setDirty(false);
  }, [template.id, template.body, template.active]);

  async function save() {
    await update.mutateAsync({ body, active });
    setDirty(false);
  }

  return (
    <section className="rounded-xl border p-4 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold capitalize">
          {template.stage.replace("_", " ")} · {template.channel.toUpperCase()}
        </h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => {
              setActive(e.target.checked);
              setDirty(true);
            }}
          />
          <span>Active</span>
        </label>
      </div>

      <textarea
        rows={4}
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setDirty(true);
        }}
        className="mt-3 w-full border rounded-lg p-3 font-mono text-sm"
      />

      <p className="text-xs text-neutral-500 mt-2">
        Placeholders: <code>{"{first_name}"}</code>,{" "}
        <code>{"{requisition_title}"}</code>,{" "}
        <code>{"{company_name}"}</code>
      </p>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-neutral-500">
          Last updated:{" "}
          {template.updated_at
            ? new Date(template.updated_at).toLocaleString()
            : "—"}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || update.isPending}
          className="px-4 py-2 text-sm bg-neutral-900 text-white rounded-lg disabled:opacity-50"
        >
          {update.isPending ? "Saving…" : dirty ? "Save" : "Saved"}
        </button>
      </div>
    </section>
  );
}


export function MessageTemplatesAdminPage() {
  const q = useMessageTemplates();

  if (q.isLoading) return <div className="p-6">Loading…</div>;
  if (q.error)
    return <div className="p-6 text-red-600">{q.error.message}</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Recruiting message templates</h1>
      <p className="text-sm text-neutral-600">
        These messages go out via SMS automatically when an application enters
        the matching stage.  Candidates must have consented at apply time.
      </p>

      {(q.data ?? []).map((t) => (
        <TemplateEditor key={t.id} template={t} />
      ))}
    </div>
  );
}
