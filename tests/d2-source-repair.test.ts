import assert from "node:assert/strict";
import { test } from "node:test";
import {
  D2_OLD_FEED_URL,
  D2_SITE_URL,
  D2_SOURCE_ID,
  D2_SCRAPE_CONFIG,
  getD2SourceRepairState,
} from "../scripts/repair-d2-source";

test("NAVER D2 repair only replaces its known dead Atom feed with verified scraping selectors", () => {
  assert.equal(D2_SOURCE_ID, "d489e2a3-d227-4bf0-ab1d-894cb8eac51a");
  assert.equal(D2_SITE_URL, "https://d2.naver.com/home");
  assert.equal(D2_OLD_FEED_URL, "https://d2.naver.com/d2.atom");
  assert.deepEqual(D2_SCRAPE_CONFIG, {
    listItemSelector: ".post_article",
    titleSelector: "h2 a",
    linkSelector: "h2 a",
    excerptSelector: "a.post_txt_wrap",
    dateSelector: "dl dd:first-of-type",
    thumbnailSelector: ".cont_img img",
    useBotUserAgent: true,
  });
});

test("NAVER D2 repair recognizes only the exact reviewed old and repaired states", () => {
  const old = {
    site_url: D2_SITE_URL,
    feed_url: D2_OLD_FEED_URL,
    feed_type: "atom",
    is_active: true,
    scrape_config: null,
  };
  assert.equal(getD2SourceRepairState(old), "ready");
  assert.equal(getD2SourceRepairState({
    ...old,
    feed_url: null,
    feed_type: "scrape",
    scrape_config: D2_SCRAPE_CONFIG,
  }), "already-configured");
  assert.equal(getD2SourceRepairState({
    ...old,
    feed_url: null,
    feed_type: "scrape",
    scrape_config: { ...D2_SCRAPE_CONFIG, titleSelector: ".different-title" },
  }), "unexpected");
  assert.equal(getD2SourceRepairState({ ...old, is_active: false }), "unexpected");
  assert.equal(getD2SourceRepairState({ ...old, feed_url: "https://different-feed.example/rss" }), "unexpected");
});
