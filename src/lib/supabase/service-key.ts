import "server-only";

export function getSupabaseServiceKey(): string | undefined {
  const key = process.env.SUPABASE_SECRET_KEY?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return key && !key.includes("[SENSITIVE]") ? key : undefined;
}

export function hasSupabaseServiceCredentials(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabaseServiceKey());
}

export function getSupabaseServiceHeaders(key: string): Record<string, string> {
  if (key.startsWith("sb_secret_")) return { apikey: key };
  return { apikey: key, authorization: `Bearer ${key}` };
}
