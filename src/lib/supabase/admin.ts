import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let adminClient: SupabaseClient | null = null;

/**
 * Returns a Supabase client using the service role key.
 * Bypasses RLS — use only in server-side bot/webhook code, never in browser.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (!adminClient) {
    if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }
    adminClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}
