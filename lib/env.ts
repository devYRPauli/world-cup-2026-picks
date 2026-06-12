const requiredPublicKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
] as const;

const requiredServerKeys = [
  ...requiredPublicKeys,
  "SUPABASE_SECRET_KEY"
] as const;

type PublicEnvKey = (typeof requiredPublicKeys)[number];
type ServerEnvKey = (typeof requiredServerKeys)[number];

export function getEnv() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
    footballDataToken: process.env.FOOTBALL_DATA_TOKEN,
    adminEmails: process.env.ADMIN_EMAILS,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL
  };
}

export function getMissingPublicEnv(): PublicEnvKey[] {
  return requiredPublicKeys.filter((key) => !process.env[key]);
}

export function getMissingServerEnv(): ServerEnvKey[] {
  return requiredServerKeys.filter((key) => !process.env[key]);
}

export function hasPublicSupabaseEnv() {
  return getMissingPublicEnv().length === 0;
}

export function hasServerSupabaseEnv() {
  return getMissingServerEnv().length === 0;
}

export function requirePublicSupabaseEnv() {
  const missing = getMissingPublicEnv();
  if (missing.length) {
    throw new Error(`Missing Supabase public env vars: ${missing.join(", ")}`);
  }

  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string
  };
}

export function requireServerSupabaseEnv() {
  const missing = getMissingServerEnv();
  if (missing.length) {
    throw new Error(`Missing Supabase server env vars: ${missing.join(", ")}`);
  }

  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string,
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY as string
  };
}

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

// Temporary, reversible per-group pick-deadline overrides. Format:
//   GROUP_PICK_OVERRIDES="Group A=2026-06-12T19:00:00Z, Group B=..."
// A group's lock becomes the override instant instead of its earliest kickoff.
// Self-expires once the instant passes; remove the env var afterward to clean up.
function normalizeGroupKey(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase();
}

export function getGroupLockOverrides(): Map<string, string> {
  const overrides = new Map<string, string>();

  for (const pair of (process.env.GROUP_PICK_OVERRIDES ?? "").split(",")) {
    const separator = pair.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = normalizeGroupKey(pair.slice(0, separator));
    const iso = pair.slice(separator + 1).trim();
    if (!key || !iso || Number.isNaN(new Date(iso).getTime())) {
      continue;
    }

    overrides.set(key, iso);
  }

  return overrides;
}

export function getGroupLockOverride(groupName: string): string | null {
  return getGroupLockOverrides().get(normalizeGroupKey(groupName)) ?? null;
}
