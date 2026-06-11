import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireServerSupabaseEnv } from "@/lib/env";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  const { supabaseUrl, supabaseSecretKey } = requireServerSupabaseEnv();
  adminClient = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return adminClient;
}
