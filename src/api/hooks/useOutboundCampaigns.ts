import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import { validateResponse } from "../validateResponse.ts";
import {
  callbackSchema,
  callbacksResponseSchema,
  campaignSchema,
  campaignsResponseSchema,
  contactSchema,
  contactsResponseSchema,
  dispositionResponseSchema,
  type CallStatus,
  type Contact,
} from "../types/outboundCampaigns.ts";

const BASE = "/outbound-campaigns";

export const outboundKeys = {
  all: ["outbound"] as const,
  campaigns: () => [...outboundKeys.all, "campaigns"] as const,
  campaign: (id: string) => [...outboundKeys.campaigns(), id] as const,
  contacts: (campaignId: string) =>
    [...outboundKeys.campaign(campaignId), "contacts"] as const,
  contactsFiltered: (campaignId: string, status?: string) =>
    [...outboundKeys.contacts(campaignId), { status }] as const,
  callbacks: () => [...outboundKeys.all, "callbacks"] as const,
};

const QUERY_DEFAULTS = {
  staleTime: 30_000,
  refetchOnWindowFocus: true,
  refetchInterval: 30_000,
} as const;

// ---------- Campaigns ----------

export function useCampaigns() {
  return useQuery({
    queryKey: outboundKeys.campaigns(),
    queryFn: async () => {
      const r = await apiClient.get(`${BASE}/campaigns`);
      return validateResponse(campaignsResponseSchema, r.data).campaigns;
    },
    ...QUERY_DEFAULTS,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      name: string;
      description?: string | null;
      status?: string;
    }) => {
      const r = await apiClient.post(`${BASE}/campaigns`, input);
      return validateResponse(campaignSchema, r.data);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: outboundKeys.campaigns() }),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      description?: string | null;
      status?: string;
    }) => {
      const { id, ...body } = input;
      const r = await apiClient.patch(`${BASE}/campaigns/${id}`, body);
      return validateResponse(campaignSchema, r.data);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: outboundKeys.campaigns() }),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`${BASE}/campaigns/${id}`);
      return id;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: outboundKeys.campaigns() }),
  });
}

// ---------- Contacts ----------

export function useCampaignContacts(
  campaignId: string | null,
  status?: string,
) {
  return useQuery({
    queryKey: outboundKeys.contactsFiltered(campaignId ?? "", status),
    queryFn: async () => {
      const r = await apiClient.get(
        `${BASE}/campaigns/${campaignId}/contacts`,
        { params: status ? { status } : undefined },
      );
      return validateResponse(contactsResponseSchema, r.data).contacts;
    },
    enabled: !!campaignId,
    ...QUERY_DEFAULTS,
  });
}

export function useImportContacts(campaignId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      contacts: Array<Partial<Contact> & { account_name: string; phone: string }>,
    ) => {
      if (!campaignId) throw new Error("campaignId required for import");
      const r = await apiClient.post(
        `${BASE}/campaigns/${campaignId}/contacts`,
        { contacts },
      );
      return validateResponse(contactsResponseSchema, r.data).contacts;
    },
    onSuccess: () => {
      if (campaignId) {
        qc.invalidateQueries({ queryKey: outboundKeys.contacts(campaignId) });
      }
      qc.invalidateQueries({ queryKey: outboundKeys.campaigns() });
    },
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      contactId: string;
      [field: string]: unknown;
    }) => {
      const { contactId, ...body } = input;
      const r = await apiClient.patch(`${BASE}/contacts/${contactId}`, body);
      return validateResponse(contactSchema, r.data);
    },
    onSuccess: (contact) => {
      qc.invalidateQueries({
        queryKey: outboundKeys.contacts(contact.campaign_id),
      });
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { contactId: string; campaignId: string }) => {
      await apiClient.delete(`${BASE}/contacts/${input.contactId}`);
      return input;
    },
    onSuccess: ({ campaignId }) => {
      qc.invalidateQueries({ queryKey: outboundKeys.contacts(campaignId) });
      qc.invalidateQueries({ queryKey: outboundKeys.campaigns() });
    },
  });
}

// ---------- Disposition ----------

export function useSetContactDisposition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      contactId: string;
      campaignId: string;
      call_status: CallStatus;
      notes?: string | null;
      duration_sec?: number | null;
    }) => {
      const { contactId, campaignId: _cid, ...body } = input;
      const r = await apiClient.post(
        `${BASE}/contacts/${contactId}/dispositions`,
        body,
      );
      return validateResponse(dispositionResponseSchema, r.data);
    },
    onMutate: async ({ contactId, campaignId, call_status, notes }) => {
      const key = outboundKeys.contacts(campaignId);
      await qc.cancelQueries({ queryKey: key });
      const snapshots: Array<[readonly unknown[], Contact[] | undefined]> = [];
      qc.getQueriesData<Contact[]>({ queryKey: key }).forEach(([k, data]) => {
        snapshots.push([k, data]);
        if (!data) return;
        qc.setQueryData<Contact[]>(
          k,
          data.map((c) =>
            c.id === contactId
              ? {
                  ...c,
                  call_status,
                  call_attempts: c.call_attempts + 1,
                  last_call_date: new Date().toISOString(),
                  last_disposition: call_status,
                  notes: notes ?? c.notes,
                  updated_at: new Date().toISOString(),
                }
              : c,
          ),
        );
      });
      return { snapshots };
    },
    onError: (_err, _input, ctx) => {
      ctx?.snapshots.forEach(([k, data]) => qc.setQueryData(k, data));
    },
    onSettled: (data) => {
      if (data) {
        qc.invalidateQueries({
          queryKey: outboundKeys.contacts(data.contact.campaign_id),
        });
        qc.invalidateQueries({ queryKey: outboundKeys.campaigns() });
      }
    },
  });
}

// ---------- Callbacks ----------

export function useCallbacks(filters?: { rep?: "me"; status?: string }) {
  return useQuery({
    queryKey: [...outboundKeys.callbacks(), filters],
    queryFn: async () => {
      const r = await apiClient.get(`${BASE}/callbacks`, { params: filters });
      return validateResponse(callbacksResponseSchema, r.data).callbacks;
    },
    ...QUERY_DEFAULTS,
  });
}

export function useAddCallback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      contact_id: string;
      campaign_id: string;
      scheduled_for: string;
      notes?: string | null;
    }) => {
      const r = await apiClient.post(`${BASE}/callbacks`, input);
      return validateResponse(callbackSchema, r.data);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: outboundKeys.callbacks() }),
  });
}

export function useUpdateCallback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      scheduled_for?: string;
      notes?: string | null;
      status?: string;
      completed_at?: string;
    }) => {
      const { id, ...body } = input;
      const r = await apiClient.patch(`${BASE}/callbacks/${id}`, body);
      return validateResponse(callbackSchema, r.data);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: outboundKeys.callbacks() }),
  });
}

export function useDeleteCallback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`${BASE}/callbacks/${id}`);
      return id;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: outboundKeys.callbacks() }),
  });
}
