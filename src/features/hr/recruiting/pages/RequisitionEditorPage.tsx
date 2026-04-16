import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useCreateRequisition, type RequisitionInput } from "../api";


export function RequisitionEditorPage() {
  const nav = useNavigate();
  const create = useCreateRequisition();
  const [form, setForm] = useState<RequisitionInput>({
    slug: "",
    title: "",
    employment_type: "full_time",
    status: "draft",
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    try {
      await create.mutateAsync(form);
      nav("/hr/requisitions");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">New requisition</h1>

      <label className="block">
        <span className="text-sm">Slug</span>
        <input
          className="w-full border rounded px-3 py-2"
          required
          pattern="^[a-z0-9][a-z0-9-]*$"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          aria-label="Slug"
        />
      </label>

      <label className="block">
        <span className="text-sm">Title</span>
        <input
          className="w-full border rounded px-3 py-2"
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          aria-label="Title"
        />
      </label>

      <label className="block">
        <span className="text-sm">Employment type</span>
        <select
          className="w-full border rounded px-3 py-2"
          value={form.employment_type}
          onChange={(e) =>
            setForm({
              ...form,
              employment_type: e.target
                .value as RequisitionInput["employment_type"],
            })
          }
        >
          <option value="full_time">Full time</option>
          <option value="part_time">Part time</option>
          <option value="contract">Contract</option>
        </select>
      </label>

      <label className="block">
        <span className="text-sm">Status</span>
        <select
          className="w-full border rounded px-3 py-2"
          value={form.status}
          onChange={(e) =>
            setForm({
              ...form,
              status: e.target.value as RequisitionInput["status"],
            })
          }
        >
          <option value="draft">Draft</option>
          <option value="open">Open</option>
          <option value="paused">Paused</option>
          <option value="closed">Closed</option>
        </select>
      </label>

      {submitError && (
        <p className="text-red-600 text-sm" role="alert">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={create.isPending}
        className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50"
      >
        {create.isPending ? "Saving…" : "Create"}
      </button>
    </form>
  );
}
