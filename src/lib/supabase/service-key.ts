import "server-only";

export { getSupabaseServiceHeaders } from "./service-key-headers";

export function getSupabaseServiceKey(): string | undefined {
  const key = process.env.SUPABASE_SECRET_KEY?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return key && !key.includes("[SENSITIVE]") ? key : undefined;
}

export function hasSupabaseServiceCredentials(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && getSupabaseServiceKey());
}
