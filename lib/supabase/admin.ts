import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireServerSupabaseEnv } from "@/lib/env";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  const { supabaseUrl, supabaseServiceRoleKey } = requireServerSupabaseEnv();
  adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return adminClient;
}

