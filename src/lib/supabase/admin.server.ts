import { createClient } from "@supabase/supabase-js";

/** Server-only privileged client. Never import this module from browser-facing modules. */
export function getSupabaseAdminClient() {
  const url = process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Supabase server-only admin configuration is missing.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
