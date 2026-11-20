import assert from "node:assert/strict";
import test from "node:test";
import { decodeFeedResponseBody } from "../src/lib/ingestion/parse-feed";

test("proxied feed decoding honors a declared legacy charset", () => {
  const bytes = Buffer.from("café", "latin1");
  assert.equal(decodeFeedResponseBody(bytes, "application/rss+xml; charset=ISO-8859-1"), "café");
});

test("proxied feed decoding defaults to UTF-8 when no charset is declared", () => {
  const bytes = Buffer.from("한글 feed", "utf8");
  assert.equal(decodeFeedResponseBody(bytes, "application/rss+xml"), "한글 feed");
});
