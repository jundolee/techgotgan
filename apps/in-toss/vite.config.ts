import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

import aitDevtools from "@apps-in-toss/devtools/unplugin";
import { publicKeyValidationError } from "./scripts/public-key-validation.mjs";

const supabaseFunctionPath = "/functions/v1/techgotgan-intoss-api";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const apiBase = env.VITE_TECHGOTGAN_API_URL?.trim()
    || (env.VITE_SUPABASE_URL?.trim()
      ? `${env.VITE_SUPABASE_URL.trim().replace(/\/$/, "")}${supabaseFunctionPath}`
      : "");
  let requiresPublishableKey = false;
  try {
    requiresPublishableKey = new URL(apiBase).pathname.replace(/\/+$/, "").endsWith(supabaseFunctionPath);
  } catch {
    // The release validator reports malformed API URLs; web-only builds may omit an API URL.
  }
  const keyError = publicKeyValidationError(env.VITE_SUPABASE_PUBLISHABLE_KEY, requiresPublishableKey);
  if (keyError) throw new Error(keyError);

  return {
    plugins: [aitDevtools.vite(), react()],
    server: { strictPort: true },
    build: { target: "es2022" },
  };
});
