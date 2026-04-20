import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../client.ts";
import { toastError, toastSuccess } from "@/components/ui/Toast.tsx";

export interface ReferenceDoc {
  slug: string;
  title: string;
  category: string;
  description: string;
  file_type: "html" | "text";
}

export interface ReferenceDocSendRequest {
  to_email: string;
  subject?: string;
  message?: string;
}

export const referenceDocKeys = {
  all: ["reference-docs"] as const,
  list: () => [...referenceDocKeys.all, "list"] as const,
};

export function useReferenceDocs() {
  return useQuery({
    queryKey: referenceDocKeys.list(),
    queryFn: async (): Promise<ReferenceDoc[]> => {
      const { data } = await apiClient.get("/reference-docs/");
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function getReferenceDocPreviewUrl(slug: string): string {
  return `${apiClient.defaults.baseURL}/reference-docs/${slug}/html`;
}

export function getReferenceDocDownloadUrl(slug: string): string {
  return `${apiClient.defaults.baseURL}/reference-docs/${slug}/download`;
}

export function useSendReferenceDoc() {
  return useMutation({
    mutationFn: async ({ slug, request }: { slug: string; request: ReferenceDocSendRequest }) => {
      const { data } = await apiClient.post(`/reference-docs/${slug}/send`, request);
      return data;
    },
    onSuccess: (_, { request }) => {
      toastSuccess(`Document sent to ${request.to_email}!`);
    },
    onError: () => {
      toastError("Failed to send document. Please try again.");
    },
  });
}
