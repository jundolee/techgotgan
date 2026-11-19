import assert from "node:assert/strict";
import { test } from "node:test";
import { getSupabaseServiceHeaders, getSupabaseServiceKey } from "../src/lib/supabase/service-key";

test("new Supabase secret keys are sent only in the apikey header", () => {
  assert.deepEqual(getSupabaseServiceHeaders("sb_secret_test-key"), {
    apikey: "sb_secret_test-key",
  });
});

test("legacy service-role JWTs retain bearer authorization compatibility", () => {
  const key = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature";
  assert.deepEqual(getSupabaseServiceHeaders(key), {
    apikey: key,
    authorization: `Bearer ${key}`,
  });
});

test("new secret key takes precedence while legacy service-role remains a fallback", () => {
  const previousSecret = process.env.SUPABASE_SECRET_KEY;
  const previousLegacy = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    process.env.SUPABASE_SECRET_KEY = "sb_secret_primary";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "legacy-service-role";
    assert.equal(getSupabaseServiceKey(), "sb_secret_primary");

    delete process.env.SUPABASE_SECRET_KEY;
    assert.equal(getSupabaseServiceKey(), "legacy-service-role");
  } finally {
    if (previousSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = previousSecret;
    if (previousLegacy === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousLegacy;
  }
});
