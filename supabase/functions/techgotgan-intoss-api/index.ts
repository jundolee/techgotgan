import { createIntossHandler } from "./handler.ts";

const handler = createIntossHandler({
  SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_URL: Deno.env.get("NEXT_PUBLIC_SUPABASE_URL"),
  SUPABASE_SECRET_KEYS: Deno.env.get("SUPABASE_SECRET_KEYS"),
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  APP_IN_TOSS_APP_NAME: Deno.env.get("APP_IN_TOSS_APP_NAME") || "techgotgan",
  APP_IN_TOSS_ALLOWED_ORIGINS: Deno.env.get("APP_IN_TOSS_ALLOWED_ORIGINS"),
});

Deno.serve(handler);
