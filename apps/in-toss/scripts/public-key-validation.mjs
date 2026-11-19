export function isLegacyAnonKey(value) {
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  try {
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return claims?.role === "anon";
  } catch {
    return false;
  }
}

export function publicKeyValidationError(value, required = false) {
  const key = value?.trim() ?? "";
  if (!key) {
    return required ? "Set VITE_SUPABASE_PUBLISHABLE_KEY before building for the Supabase Edge Function." : null;
  }
  if (key.includes("<") || key.includes(">")) {
    return "Replace the VITE_SUPABASE_PUBLISHABLE_KEY placeholder with a real public key.";
  }
  if (key.startsWith("sb_publishable_") && key.length > "sb_publishable_".length) return null;
  if (isLegacyAnonKey(key)) return null;
  return "VITE_SUPABASE_PUBLISHABLE_KEY must be a Supabase publishable key or legacy anon JWT.";
}
