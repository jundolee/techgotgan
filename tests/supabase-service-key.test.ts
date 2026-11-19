import assert from "node:assert/strict";
import { test } from "node:test";
import { getSupabaseServiceHeaders, getSupabaseServiceKey } from "../src/lib/supabase/service-key";
import { createSupabaseServiceFetch } from "../src/lib/supabase/service-key-headers";

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

test("supabase-js transport strips the bearer header for new secret keys", async () => {
  const receivedHeaders: Headers[] = [];
  const mockFetch: typeof fetch = async (_input, init) => {
    receivedHeaders.push(new Headers(init?.headers));
    return new Response(null, { status: 204 });
  };
  const key = "sb_secret_test-key";
  const serviceFetch = createSupabaseServiceFetch(key, mockFetch);

  await serviceFetch("https://project.supabase.co/rest/v1/articles", {
    headers: { apikey: "stale-key", authorization: `Bearer ${key}` },
  });

  assert.equal(receivedHeaders[0].get("apikey"), key);
  assert.equal(receivedHeaders[0].has("authorization"), false);
});

test("supabase-js transport preserves legacy service-role bearer authorization", async () => {
  const receivedHeaders: Headers[] = [];
  const mockFetch: typeof fetch = async (_input, init) => {
    receivedHeaders.push(new Headers(init?.headers));
    return new Response(null, { status: 204 });
  };
  const key = "legacy-service-role";
  await createSupabaseServiceFetch(key, mockFetch)("https://project.supabase.co/rest/v1/articles", {
    headers: { apikey: "stale-key", authorization: `Bearer ${key}` },
  });

  assert.equal(receivedHeaders[0].get("apikey"), key);
  assert.equal(receivedHeaders[0].get("authorization"), `Bearer ${key}`);
});

test("secret-key transport preserves headers on Request inputs and unrelated bearer tokens", async () => {
  const receivedHeaders: Headers[] = [];
  const mockFetch: typeof fetch = async (_input, init) => {
    receivedHeaders.push(new Headers(init?.headers));
    return new Response(null, { status: 204 });
  };
  const key = "sb_secret_test-key";
  const request = new Request("https://project.supabase.co/rest/v1/articles", {
    headers: {
      authorization: "Bearer delegated-user-token",
      "content-type": "application/json",
      prefer: "return=representation",
    },
  });

  await createSupabaseServiceFetch(key, mockFetch)(request);

  assert.equal(receivedHeaders[0].get("apikey"), key);
  assert.equal(receivedHeaders[0].get("authorization"), "Bearer delegated-user-token");
  assert.equal(receivedHeaders[0].get("content-type"), "application/json");
  assert.equal(receivedHeaders[0].get("prefer"), "return=representation");
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
