import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../src/app/api/admin/backfill/route";
import { withAdminAccess } from "../src/lib/admin-access";

test("admin backfill exposes no mutating GET method", async () => {
  const response = await GET();
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "POST");
});

test("admin-only operations do not run until production authorization succeeds", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousAdminEmails = process.env.ADMIN_EMAILS;
  const previousAdminPassword = process.env.ADMIN_PASSWORD;
  Reflect.set(process.env, "NODE_ENV", "production");
  process.env.ADMIN_EMAILS = "owner@example.com";
  delete process.env.ADMIN_PASSWORD;

  let operationStarted = false;
  try {
    const result = await withAdminAccess(() => {
        operationStarted = true;
        return "admin-client-created";
    });
    assert.deepEqual(result, { authorized: false });
    assert.equal(operationStarted, false);
  } finally {
    if (previousNodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Reflect.set(process.env, "NODE_ENV", previousNodeEnv);
    if (previousAdminEmails === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = previousAdminEmails;
    if (previousAdminPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = previousAdminPassword;
  }
});
