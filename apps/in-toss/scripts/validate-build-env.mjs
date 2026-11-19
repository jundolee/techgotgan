import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { publicKeyValidationError } from "./public-key-validation.mjs";

// Read Vite's production env files without importing the app-only Vite dependency.
// Load from highest to lowest priority; existing shell variables keep precedence.
for (const file of [".env.production.local", ".env.production", ".env.local", ".env"]) {
  const path = resolve(process.cwd(), file);
  if (existsSync(path)) process.loadEnvFile(path);
}

const apiBase = process.env.VITE_TECHGOTGAN_API_URL?.trim()
  || (process.env.VITE_SUPABASE_URL?.trim()
    ? `${process.env.VITE_SUPABASE_URL.trim().replace(/\/$/, "")}/functions/v1/techgotgan-intoss-api`
    : "");

const allowUnconfigured = process.argv.includes("--allow-unconfigured");
const configuredKeyError = publicKeyValidationError(process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
if (configuredKeyError) {
  console.error(configuredKeyError);
  process.exit(1);
}

if (!apiBase && allowUnconfigured) process.exit(0);

if (!apiBase || apiBase.includes("<") || apiBase.includes(">")) {
  console.error("Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY before creating the .ait bundle.");
  process.exit(1);
}

let parsedUrl;
try {
  parsedUrl = new URL(apiBase);
} catch {
  console.error("VITE_TECHGOTGAN_API_URL must be an absolute HTTPS URL.");
  process.exit(1);
}

if (parsedUrl.protocol !== "https:") {
  console.error("The App-in-Toss bundle must use an HTTPS API URL.");
  process.exit(1);
}

const usesSupabaseFunction = parsedUrl.pathname.replace(/\/+$/, "").endsWith("/functions/v1/techgotgan-intoss-api");
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

if (usesSupabaseFunction && !publishableKey) {
  console.error("Set VITE_SUPABASE_PUBLISHABLE_KEY before building for the Supabase Edge Function.");
  process.exit(1);
}
