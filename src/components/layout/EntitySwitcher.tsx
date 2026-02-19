/**
 * Entity Switcher
 *
 * Dropdown in the sidebar header that lets users switch between
 * company entities (LLCs). Only shows when >1 entity exists.
 */

import { useState, useRef, useEffect } from "react";
import { Building2, ChevronDown, Check } from "lucide-react";
import { useEntity } from "@/providers/EntityProvider";

export function EntitySwitcher() {
  const { entity, entities, setEntity, hasMultipleEntities } = useEntity();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!hasMultipleEntities || !entity) return null;

  return (
    <div ref={ref} className="relative px-3 mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] transition-colors text-left"
      >
        <Building2 className="w-4 h-4 text-[#2aabe1] shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-white text-xs font-medium truncate">
            {entity.short_code || entity.name}
          </div>
          <div className="text-white/40 text-[10px] truncate">{entity.name}</div>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-lg bg-[#162a42] border border-white/10 shadow-xl shadow-black/40 py-1">
          {entities.map((e) => (
            <button
              key={e.id}
              onClick={() => {
                setEntity(e);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                e.id === entity.id
                  ? "bg-white/[0.08] text-white"
                  : "text-white/60 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{e.short_code || e.name}</div>
                {e.state && (
                  <div className="text-[10px] text-white/40">{e.state}</div>
                )}
              </div>
              {e.id === entity.id && (
                <Check className="w-3.5 h-3.5 text-[#2aabe1] shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
