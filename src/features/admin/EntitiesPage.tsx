/**
 * Entity Management Page
 *
 * Admin page for managing company entities (LLCs).
 * Allows creating, editing, and viewing entities.
 */

import { useState } from "react";
import { Building2, Plus, Pencil, Check } from "lucide-react";
import { useEntities, useCreateEntity, useUpdateEntity } from "@/api/hooks/useEntities";
import type { CompanyEntity, CompanyEntityCreate } from "@/api/types/entity";

function EntityForm({
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  initial?: CompanyEntity;
  onSave: (data: CompanyEntityCreate) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<CompanyEntityCreate>({
    name: initial?.name ?? "",
    short_code: initial?.short_code ?? "",
    tax_id: initial?.tax_id ?? "",
    address_line1: initial?.address_line1 ?? "",
    address_line2: initial?.address_line2 ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    postal_code: initial?.postal_code ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    invoice_prefix: initial?.invoice_prefix ?? "",
    is_default: initial?.is_default ?? false,
  });

  const field = (label: string, key: keyof CompanyEntityCreate, opts?: { type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={opts?.type ?? "text"}
        value={String(form[key] ?? "")}
        placeholder={opts?.placeholder}
        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">{initial ? "Edit Entity" : "New Entity"}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {field("Company Name *", "name", { placeholder: "Mac Septic Texas" })}
        {field("Short Code", "short_code", { placeholder: "MACTX" })}
        {field("Tax ID (EIN)", "tax_id", { placeholder: "XX-XXXXXXX" })}
        {field("Invoice Prefix", "invoice_prefix", { placeholder: "MACTX" })}
        {field("Address Line 1", "address_line1")}
        {field("Address Line 2", "address_line2")}
        {field("City", "city")}
        {field("State", "state")}
        {field("Postal Code", "postal_code")}
        {field("Phone", "phone")}
        {field("Email", "email", { type: "email" })}
      </div>
      <div className="flex items-center gap-2 mt-4">
        <input
          type="checkbox"
          id="is_default"
          checked={!!form.is_default}
          onChange={(e) => setForm((p) => ({ ...p, is_default: e.target.checked }))}
          className="rounded"
        />
        <label htmlFor="is_default" className="text-sm text-gray-700">Default entity</label>
      </div>
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => onSave(form)}
          disabled={isPending || !form.name}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function EntitiesPage() {
  const { data: entities = [], isLoading } = useEntities();
  const createMutation = useCreateEntity();
  const updateMutation = useUpdateEntity();
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingEntity, setEditingEntity] = useState<CompanyEntity | null>(null);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <EntityForm
          onSave={(data) => {
            createMutation.mutate(data, {
              onSuccess: () => setMode("list"),
            });
          }}
          onCancel={() => setMode("list")}
          isPending={createMutation.isPending}
        />
      </div>
    );
  }

  if (mode === "edit" && editingEntity) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <EntityForm
          initial={editingEntity}
          onSave={(data) => {
            updateMutation.mutate(
              { id: editingEntity.id, ...data },
              { onSuccess: () => setMode("list") },
            );
          }}
          onCancel={() => {
            setMode("list");
            setEditingEntity(null);
          }}
          isPending={updateMutation.isPending}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Entities</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your LLCs and company entities
          </p>
        </div>
        <button
          onClick={() => setMode("create")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Entity
        </button>
      </div>

      <div className="space-y-4">
        {entities.map((entity) => (
          <div
            key={entity.id}
            className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-gray-900">{entity.name}</h3>
                {entity.is_default && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-[11px] font-medium rounded-full">
                    <Check className="w-3 h-3" /> Default
                  </span>
                )}
                {entity.short_code && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] font-mono rounded">
                    {entity.short_code}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {[entity.city, entity.state].filter(Boolean).join(", ") || "No address set"}
                {entity.invoice_prefix && (
                  <span className="ml-3 text-gray-400">
                    Invoice prefix: {entity.invoice_prefix}
                  </span>
                )}
              </div>
              {entity.phone && (
                <div className="text-sm text-gray-400 mt-0.5">{entity.phone}</div>
              )}
            </div>
            <button
              onClick={() => {
                setEditingEntity(entity);
                setMode("edit");
              }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        ))}

        {entities.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">No entities yet</p>
            <p className="text-sm mt-1">Create your first company entity to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
