import assert from "node:assert/strict";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { processInsertedArticleMetadata } from "../src/lib/ingestion/ingest-source";
import { isThumbnailMirroringEnabled } from "../src/lib/storage/thumbnail-policy";

test("thumbnail mirroring stays enabled by default and can be disabled for free ingestion", () => {
  assert.equal(isThumbnailMirroringEnabled(undefined), true);
  assert.equal(isThumbnailMirroringEnabled("true"), true);
  assert.equal(isThumbnailMirroringEnabled("false"), false);
});

test("disabling thumbnail storage still classifies newly ingested articles", async () => {
  const previousFlag = process.env.MIRROR_THUMBNAILS_ENABLED;
  let mirrorCalls = 0;
  let classificationCalls = 0;
  const updates: Array<Record<string, unknown>> = [];
  const supabase = {
    from(table: string) {
      assert.equal(table, "articles");
      return {
        update(patch: Record<string, unknown>) {
          return {
            async eq() {
              updates.push(patch);
              return { error: null };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;

  try {
    process.env.MIRROR_THUMBNAILS_ENABLED = "false";
    await processInsertedArticleMetadata(
      supabase,
      [{ articleId: "article-1", thumbnailUrl: "https://example.com/cover.png", index: 0 }],
      [{ title: "Service design", excerpt: "A backend service" }],
      {
        mirror: async () => { mirrorCalls += 1; return "https://example.supabase.co/storage/v1/object/public/thumbnails/article-1.png"; },
        classify: async () => {
          classificationCalls += 1;
          return [{ category: "backend", tags: ["api"] }];
        },
      },
    );
  } finally {
    if (previousFlag === undefined) delete process.env.MIRROR_THUMBNAILS_ENABLED;
    else process.env.MIRROR_THUMBNAILS_ENABLED = previousFlag;
  }

  assert.equal(mirrorCalls, 0);
  assert.equal(classificationCalls, 1);
  assert.deepEqual(updates, [{ category: "backend", tags: ["api"] }]);
});
