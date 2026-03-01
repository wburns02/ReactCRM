import type { ContactCallStatus } from "../types";

/**
 * A pre-written note template that can be tapped to insert
 */
export interface NoteTemplate {
  id: string;
  text: string;
  category: "voicemail" | "interested" | "not_interested" | "callback" | "info" | "general";
}

/**
 * All available note templates
 */
const ALL_TEMPLATES: NoteTemplate[] = [
  // Voicemail templates
  { id: "vm-1", text: "Left VM - will call back", category: "voicemail" },
  { id: "vm-2", text: "Left VM with intro & callback number", category: "voicemail" },
  { id: "vm-3", text: "VM box full - could not leave message", category: "voicemail" },

  // Interested templates
  { id: "int-1", text: "Wants annual contract info emailed", category: "interested" },
  { id: "int-2", text: "Interested in new service - schedule inspection", category: "interested" },
  { id: "int-3", text: "Wants to compare pricing with current provider", category: "interested" },
  { id: "int-4", text: "Ready to sign - send contract", category: "interested" },

  // Not interested templates
  { id: "ni-1", text: "Has another provider - happy with service", category: "not_interested" },
  { id: "ni-2", text: "Just renewed with competitor", category: "not_interested" },
  { id: "ni-3", text: "Not the decision maker - try different contact", category: "not_interested" },
  { id: "ni-4", text: "Property sold / no longer at address", category: "not_interested" },

  // Callback templates
  { id: "cb-1", text: "Call back after 5pm - at work now", category: "callback" },
  { id: "cb-2", text: "Callback requested - needs to check with spouse", category: "callback" },
  { id: "cb-3", text: "Call back next week - out of town", category: "callback" },

  // Info templates
  { id: "info-1", text: "Has aerobic system - needs quarterly service", category: "info" },
  { id: "info-2", text: "Septic issue reported - may need pump-out", category: "info" },
  { id: "info-3", text: "Multiple properties - potential bulk deal", category: "info" },

  // General
  { id: "gen-1", text: "Friendly conversation - good rapport", category: "general" },
  { id: "gen-2", text: "Asked about Mac Septic background", category: "general" },
];

/**
 * Disposition → template category mapping
 */
const DISPOSITION_CATEGORY_MAP: Record<string, NoteTemplate["category"][]> = {
  voicemail: ["voicemail", "general"],
  no_answer: ["voicemail", "general"],
  busy: ["callback", "general"],
  interested: ["interested", "info", "general"],
  not_interested: ["not_interested", "info", "general"],
  callback_scheduled: ["callback", "interested", "general"],
  completed: ["interested", "info", "general"],
  wrong_number: ["general"],
  do_not_call: ["general"],
  connected: ["interested", "callback", "general"],
};

/**
 * Get note templates relevant to a specific disposition.
 * Returns templates ordered by relevance.
 */
export function getTemplatesForDisposition(
  status: ContactCallStatus | null,
): NoteTemplate[] {
  if (!status) return ALL_TEMPLATES;

  const categories = DISPOSITION_CATEGORY_MAP[status] ?? ["general"];
  return ALL_TEMPLATES.filter((t) => categories.includes(t.category));
}

/**
 * Get all templates
 */
export function getAllTemplates(): NoteTemplate[] {
  return ALL_TEMPLATES;
}
