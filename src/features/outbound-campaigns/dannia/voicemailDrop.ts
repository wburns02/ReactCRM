import type { VoicemailDropConfig } from "./gamification";

/**
 * Execute a voicemail drop via RingCentral blind transfer to IVR extension.
 *
 * Requires:
 * - An active RingCentral call session
 * - A configured IVR extension that plays the pre-recorded voicemail
 *
 * The transfer() function should be the RingCentral WebPhone SDK blind transfer.
 */
export async function executeVoicemailDrop(
  config: VoicemailDropConfig,
  transferFn: (extension: string) => Promise<void>,
): Promise<{ success: boolean; error?: string }> {
  if (!config.enabled) {
    return { success: false, error: "Voicemail drop is not enabled" };
  }

  if (!config.vmExtension || config.vmExtension.trim() === "") {
    return { success: false, error: "No voicemail extension configured" };
  }

  try {
    await transferFn(config.vmExtension.trim());
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transfer failed";
    return { success: false, error: message };
  }
}

/**
 * Check if voicemail drop is properly configured
 */
export function isVoicemailDropReady(config: VoicemailDropConfig): boolean {
  return config.enabled && config.vmExtension.trim().length > 0;
}
