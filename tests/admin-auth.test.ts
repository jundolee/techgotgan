import assert from "node:assert/strict";
import test from "node:test";
import { isAdminGateConfigured } from "../src/lib/admin-auth";

test("admin access requires a configured email list or legacy password", () => {
  assert.equal(isAdminGateConfigured(undefined, undefined), false);
  assert.equal(isAdminGateConfigured(" , ", undefined), false);
  assert.equal(isAdminGateConfigured("owner@example.com", undefined), true);
  assert.equal(isAdminGateConfigured(" , owner@example.com ", undefined), true);
  assert.equal(isAdminGateConfigured(undefined, "password"), true);
});
