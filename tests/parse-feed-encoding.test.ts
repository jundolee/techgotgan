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

test("proxied feed decoding supports UTF-16 aliases and unknown labels", () => {
  assert.equal(decodeFeedResponseBody(Buffer.from("한글", "utf16le"), "application/rss+xml; charset=ucs2"), "한글");
  assert.equal(decodeFeedResponseBody(Buffer.from("feed", "utf16le"), "application/rss+xml; charset=utf16le"), "feed");
  assert.equal(decodeFeedResponseBody(Buffer.from("feed", "utf8"), "application/rss+xml; charset=x-unknown"), "feed");
});
