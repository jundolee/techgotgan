import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const validationScript = fileURLToPath(new URL("../apps/in-toss/scripts/validate-build-env.mjs", import.meta.url));

function runValidator(overrides = {}) {
  const env = { ...process.env, ...overrides };
  for (const key of ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_TECHGOTGAN_API_URL"]) {
    if (!(key in overrides)) delete env[key];
  }
  const cwd = mkdtempSync(join(tmpdir(), "intoss-build-env-"));
  try {
    return spawnSync(process.execPath, [validationScript], { cwd, env, encoding: "utf8" });
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

test("App-in-Toss build refuses to package without a public API URL", () => {
  const result = runValidator();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /VITE_SUPABASE_URL/);
});

test("App-in-Toss build accepts the Supabase Edge API using a publishable key", () => {
  const result = runValidator({
    VITE_SUPABASE_URL: "https://project-ref.supabase.co",
    VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test-key",
  });
  assert.equal(result.status, 0, result.stderr);
});

test("App-in-Toss build accepts the legacy anon JWT for older Supabase projects", () => {
  const payload = Buffer.from(JSON.stringify({ role: "anon" })).toString("base64url");
  const result = runValidator({
    VITE_SUPABASE_URL: "https://project-ref.supabase.co",
    VITE_SUPABASE_PUBLISHABLE_KEY: `eyJhbGciOiJIUzI1NiJ9.${payload}.signature`,
  });
  assert.equal(result.status, 0, result.stderr);
});

test("App-in-Toss build rejects Supabase secret and service-role keys", () => {
  const serviceRolePayload = Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url");
  for (const key of [
    "sb_secret_server-key",
    `eyJhbGciOiJIUzI1NiJ9.${serviceRolePayload}.signature`,
  ]) {
    const result = runValidator({
      VITE_SUPABASE_URL: "https://project-ref.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: key,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /publishable key or legacy anon JWT/);
  }
});

test("App-in-Toss build rejects the documented key placeholder", () => {
  const result = runValidator({
    VITE_SUPABASE_URL: "https://project-ref.supabase.co",
    VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_<public-key>",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Replace the VITE_SUPABASE_PUBLISHABLE_KEY placeholder/);
});

test("trailing slash on a Supabase Edge URL does not bypass the public-key requirement", () => {
  const result = runValidator({
    VITE_TECHGOTGAN_API_URL: "https://project-ref.supabase.co/functions/v1/techgotgan-intoss-api/",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Set VITE_SUPABASE_PUBLISHABLE_KEY/);
});

test("App-in-Toss release bundles reject insecure API origins", () => {
  const result = runValidator({ VITE_TECHGOTGAN_API_URL: "http://localhost:3000" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /HTTPS/);
});
