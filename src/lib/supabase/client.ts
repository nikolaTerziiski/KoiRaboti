import { createBrowserClient } from "@supabase/ssr";
import { env, hasSupabaseCredentials } from "@/lib/env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!hasSupabaseCredentials()) {
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
  }

  return browserClient;
}
