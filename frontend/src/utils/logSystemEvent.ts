import { supabaseAdmin } from '@/lib/supabase';

/**
 * Logs an admin action to the system_events table for the Security audit log.
 * Fire-and-forget — errors are silently swallowed so callers are never blocked.
 */
export async function logSystemEvent(
  eventType: string,
  source: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    await supabaseAdmin.from('system_events').insert({
      event_type: eventType,
      source,
      data: data ?? null,
    });
  } catch {
    // fire-and-forget: never block the caller
  }
}
