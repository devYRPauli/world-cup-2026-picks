import { cache } from "react";
import { redirect } from "next/navigation";
import { getAdminEmails, hasServerSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ProfileRow } from "@/lib/types";

// Deduped per request: if the profile is loaded more than once while rendering a
// single request, the auth.getUser() round-trip and profile read only run once.
export const getCurrentProfile = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  if (!hasServerSupabaseEnv()) {
    return { user, profile: null };
  }

  const admin = getSupabaseAdminClient();
  const { data: existing, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw new Error(error.message);
  }

  const displayName =
    typeof user.user_metadata.display_name === "string" && user.user_metadata.display_name
      ? user.user_metadata.display_name
      : user.email?.split("@")[0] ?? "Member";

  let profile = existing;

  if (!profile) {
    const { data, error: insertError } = await admin
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email,
        display_name: displayName,
        avatar_color: colorFromString(user.email ?? user.id)
      })
      .select("*")
      .single<ProfileRow>();

    if (insertError) {
      throw new Error(insertError.message);
    }

    profile = data;
  }

  const shouldBeAdmin = isAdminEmail(user.email);
  if (shouldBeAdmin && profile.role !== "admin") {
    const { data, error: updateError } = await admin
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", user.id)
      .select("*")
      .single<ProfileRow>();

    if (updateError) {
      throw new Error(updateError.message);
    }

    profile = data;
  }

  return { user, profile };
});

export async function requireCurrentProfile() {
  const session = await getCurrentProfile();

  if (!session) {
    redirect("/auth");
  }

  return session;
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return getAdminEmails().includes(email.toLowerCase());
}

function colorFromString(value: string) {
  const palette = ["#16a34a", "#2563eb", "#dc2626", "#ca8a04", "#7c3aed", "#0891b2"];
  let hash = 0;

  for (const char of value) {
    hash = char.charCodeAt(0) + ((hash << 5) - hash);
  }

  return palette[Math.abs(hash) % palette.length];
}
