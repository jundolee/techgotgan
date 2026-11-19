import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatSourceDiagnostics,
  parseSourceDiagnosticIds,
  sanitizeDiagnosticError,
} from "../scripts/inspect-ingestion-sources";

test("source diagnostics accepts and deduplicates only UUIDs", () => {
  assert.deepEqual(
    parseSourceDiagnosticIds("D489E2A3-D227-4BF0-AB1D-894CB8EAC51A, d489e2a3-d227-4bf0-ab1d-894cb8eac51a"),
    ["d489e2a3-d227-4bf0-ab1d-894cb8eac51a"],
  );
  assert.throws(() => parseSourceDiagnosticIds(undefined));
  assert.throws(() => parseSourceDiagnosticIds("not-a-uuid"));
  assert.throws(() => parseSourceDiagnosticIds("00000000-0000-0000-0000-000000000000"));
});

test("source diagnostics returns feed and scraper settings without unrelated source columns", () => {
  const [diagnostic] = formatSourceDiagnostics([{
    id: "d489e2a3-d227-4bf0-ab1d-894cb8eac51a",
    title: "Example publisher",
    site_url: "https://user:password@example.com/path?token=site-secret#fragment",
    feed_url: "https://example.com/feed.xml?api_key=feed-secret#fragment",
    feed_type: "rss",
    scrape_config: {
      listItemSelector: "article",
      titleSelector: "h2",
      linkSelector: "a",
      useBotUserAgent: true,
    },
    is_active: true,
    last_error: "HTTP 404 for https://example.com/feed.xml?token=error-secret with sb_secret_not-a-real-key",
  }]);

  assert.equal(diagnostic.siteUrl, "https://example.com/path");
  assert.equal(diagnostic.feedUrl, "https://example.com/feed.xml");
  assert.equal(diagnostic.feedType, "rss");
  assert.equal(diagnostic.lastError, "HTTP 404 for https://example.com/feed.xml with sb_secret_[redacted]");
  assert.deepEqual(diagnostic.scrapeConfig, {
    listItemSelector: "article",
    titleSelector: "h2",
    linkSelector: "a",
    linkAttr: null,
    excerptSelector: null,
    dateSelector: null,
    thumbnailSelector: null,
    thumbnailAttr: null,
    useBotUserAgent: true,
  });
  assert.equal("owner_id" in diagnostic, false);
});

test("source diagnostic error strings strip URL credentials, query data, and bearer secrets", () => {
  assert.equal(
    sanitizeDiagnosticError("Failed https://user:pass@example.com/feed?token=query-secret#fragment Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature"),
    "Failed https://example.com/feed Authorization: Bearer [redacted]",
  );
});
