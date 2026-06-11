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
