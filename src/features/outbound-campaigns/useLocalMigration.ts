import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/api/client.ts";
import { outboundKeys } from "@/api/hooks/useOutboundCampaigns.ts";
import { readLegacyZustandBlob } from "./utils/readLegacyIndexedDB.ts";

const MIGRATED_FLAG = "outbound-v1-migrated";
const OUTBOUND_STORE_KEY = "outbound-campaigns-storage";
const DANNIA_STORE_KEY = "dannia-store";
const NON_DIRTY_STATUSES = new Set(["pending", "queued"]);

interface LegacyContact {
  id: string;
  campaign_id: string;
  account_name: string;
  phone: string;
  call_status: string;
  call_attempts: number;
  [k: string]: unknown;
}

interface LegacyCallback {
  id?: string;
  contact_id: string;
  campaign_id?: string;
  scheduled_for: string;
  notes?: string | null;
  status?: string;
}

interface LegacyBlob {
  state?: {
    campaigns?: unknown[];
    contacts?: LegacyContact[];
    callbacks?: LegacyCallback[];
  };
}

function isDirty(c: LegacyContact): boolean {
  return (c.call_attempts ?? 0) > 0 || !NON_DIRTY_STATUSES.has(c.call_status);
}

/**
 * One-shot client migration from the legacy Zustand-persisted IndexedDB
 * state to the new backend. Runs on the first load after deploy; safe to
 * re-run on failure (server endpoint is idempotent).
 */
export function useLocalMigration() {
  const qc = useQueryClient();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      if (localStorage.getItem(MIGRATED_FLAG) === "true") return;

      try {
        const ob = (await readLegacyZustandBlob(
          OUTBOUND_STORE_KEY,
        )) as LegacyBlob | null;
        const dannia = (await readLegacyZustandBlob(
          DANNIA_STORE_KEY,
        )) as LegacyBlob | null;

        const campaigns = ob?.state?.campaigns ?? [];
        const allContacts = ob?.state?.contacts ?? [];
        const dirtyContacts = allContacts.filter(isDirty);
        const callbacks = (dannia?.state?.callbacks ?? []).map((cb) => ({
          contact_id: cb.contact_id,
          campaign_id: cb.campaign_id,
          scheduled_for: cb.scheduled_for,
          notes: cb.notes ?? null,
          status: cb.status ?? "scheduled",
        }));

        if (
          campaigns.length === 0 &&
          dirtyContacts.length === 0 &&
          callbacks.length === 0
        ) {
          localStorage.setItem(MIGRATED_FLAG, "true");
          return;
        }

        const result = await apiClient.post(
          "/outbound-campaigns/migrate-local",
          {
            campaigns,
            contacts: dirtyContacts,
            callbacks,
          },
        );

        localStorage.setItem(MIGRATED_FLAG, "true");
        qc.invalidateQueries({ queryKey: outboundKeys.all });

        console.info("[outbound] local migration complete", {
          campaigns: campaigns.length,
          contacts: dirtyContacts.length,
          callbacks: callbacks.length,
          imported: result.data?.imported,
        });
      } catch (err) {
        // Do NOT set the flag — retry on next load.
        console.error("[outbound] local migration failed", err);
      }
    })();
  }, [qc]);
}
