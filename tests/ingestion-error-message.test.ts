import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getIngestionErrorMessage,
  IngestionInfrastructureError,
  isIngestionInfrastructureFailure,
} from "../src/lib/ingestion/error-message";

test("non-Error source failures retain Supabase code and message instead of [object Object]", () => {
  assert.equal(getIngestionErrorMessage({ code: "23514", message: "invalid article payload" }), "23514: invalid article payload");
  assert.equal(getIngestionErrorMessage(new Error("feed timed out")), "feed timed out");
  const postgrestError = Object.assign(new Error("unique constraint violation"), { code: "23505" });
  assert.equal(getIngestionErrorMessage(postgrestError), "23505: unique constraint violation");
  assert.equal(getIngestionErrorMessage({ unexpected: true }), "Ingestion failed with a non-Error object");
});

test("source error messages redact URL credentials, query strings, fragments, and bearer secrets", () => {
  const message = getIngestionErrorMessage({
    code: "EHTTP",
    message: "Failed https://reader:password@example.com/feed?token=query-secret#fragment, Authorization: Bearer sb_secret_private",
  });
  assert.equal(message, "EHTTP: Failed https://example.com/feed Authorization: Bearer [redacted]");
});

test("database transport failures with empty error codes are explicitly tagged as infrastructure errors", () => {
  const error = new IngestionInfrastructureError("Article lookup", { code: "", message: "fetch failed" });
  assert.equal(error instanceof IngestionInfrastructureError, true);
  assert.equal(error.message, "Article lookup: fetch failed");
  assert.equal(getIngestionErrorMessage(error), "Article lookup: fetch failed");
  assert.equal(isIngestionInfrastructureFailure(error, false, true), true);
  assert.equal(isIngestionInfrastructureFailure(new Error("publisher returned 404"), false, true), false);
  assert.equal(isIngestionInfrastructureFailure(Object.assign(new Error("publisher connection closed"), { code: "EPIPE" }), false, true), false);
  assert.equal(isIngestionInfrastructureFailure(new IngestionInfrastructureError("Source operation timeout", new Error("timed out")), false, true), true);
  assert.equal(isIngestionInfrastructureFailure(new Error("status write failed"), true, true), true);
  assert.equal(isIngestionInfrastructureFailure(new Error("failed to record last_error"), false, false), true);
});
