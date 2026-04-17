import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiClient } from "@/api/client";
import { validateResponse } from "@/api/validateResponse";


export const messageTemplateSchema = z.object({
  id: z.string(),
  stage: z.string(),
  channel: z.enum(["sms", "email"]),
  body: z.string(),
  active: z.boolean(),
  updated_at: z.string().nullable(),
  created_at: z.string(),
});
export type MessageTemplate = z.infer<typeof messageTemplateSchema>;


export const templateKeys = {
  all: ["hr", "message-templates"] as const,
};


export function useMessageTemplates() {
  return useQuery({
    queryKey: templateKeys.all,
    queryFn: async () => {
      const { data } = await apiClient.get(
        "/hr/recruiting/message-templates",
      );
      return validateResponse(
        z.array(messageTemplateSchema),
        data,
        "/hr/recruiting/message-templates",
      );
    },
  });
}


export function useUpdateMessageTemplate(stage: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { body?: string; active?: boolean }) => {
      const { data } = await apiClient.patch(
        `/hr/recruiting/message-templates/${stage}`,
        input,
      );
      return messageTemplateSchema.parse(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.all }),
  });
}
