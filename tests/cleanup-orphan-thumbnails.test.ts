import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getThumbnailBytes,
  getThumbnailInventoryDigest,
  getUnreferencedThumbnailObjects,
  isThumbnailObjectReferenced,
  readAllByKeyset,
  readAllByOffset,
  requirePageData,
} from "../scripts/cleanup-orphan-thumbnails";

test("thumbnail cleanup keeps article references and ignores folder entries", () => {
  const objects = [
    { id: "file-1", name: "article-1.webp", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z", metadata: { size: 1_000 } },
    { id: "file-2", name: "article-2.jpg", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z", metadata: { size: "2000" } },
    { id: null, name: "folder", created_at: null, updated_at: null, metadata: null },
  ] as never;
  const candidates = getUnreferencedThumbnailObjects(objects, [
    "https://project.supabase.co/storage/v1/object/public/thumbnails/article-1.webp",
  ]);

  assert.deepEqual(candidates.map((object) => object.name), ["article-2.jpg"]);
  assert.equal(getThumbnailBytes(candidates), 2_000);
});

test("thumbnail references match the exact decoded object path", () => {
  assert.equal(isThumbnailObjectReferenced("article one.webp", "https://project.supabase.co/storage/v1/object/public/thumbnails/article%20one.webp"), true);
  assert.equal(isThumbnailObjectReferenced("one.webp", "https://project.supabase.co/storage/v1/object/public/thumbnails/subfolder/one.webp"), false);
  assert.equal(isThumbnailObjectReferenced("one.webp", "https://project.supabase.co/storage/v1/object/public/other-bucket/one.webp"), false);
  assert.equal(isThumbnailObjectReferenced("one.webp", "http://["), true);
});

test("thumbnail inventory digest is order independent and binds names, IDs, sizes, and revisions", () => {
  const first: Array<{ id: string; name: string; created_at: string; updated_at: string; metadata: { size: number } }> = [
    { id: "file-1", name: "a.webp", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z", metadata: { size: 10 } },
    { id: "file-2", name: "b.webp", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z", metadata: { size: 20 } },
  ];
  const reversed = [...first].reverse();

  assert.equal(getThumbnailInventoryDigest(first as never), getThumbnailInventoryDigest(reversed as never));
  assert.notEqual(getThumbnailInventoryDigest(first as never), getThumbnailInventoryDigest([
    { id: "file-3", name: "a.webp", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z", metadata: { size: 10 } },
    first[1],
  ] as never));
  assert.notEqual(getThumbnailInventoryDigest(first as never), getThumbnailInventoryDigest([
    first[0],
    { ...first[1], metadata: { size: 21 } },
  ] as never));
  assert.notEqual(getThumbnailInventoryDigest(first as never), getThumbnailInventoryDigest([
    first[0],
    { ...first[1], updated_at: "2026-01-03T00:00:00Z" },
  ] as never));
});

test("keyset pagination continues when the server caps pages below the requested limit", async () => {
  const rows = Array.from({ length: 7 }, (_, index) => ({
    id: `id-${index + 1}`,
    thumbnail_url: index === 6 ? "https://project.supabase.co/storage/v1/object/public/thumbnails/used-on-late-page.webp" : null,
  }));
  const read = await readAllByKeyset(async (afterId, requestedLimit) => {
    assert.equal(requestedLimit, 5);
    return rows.filter(({ id }) => !afterId || id > afterId).slice(0, 2);
  }, 5);

  assert.equal(read.length, 7);
  const candidates = getUnreferencedThumbnailObjects([
    { id: "storage-1", name: "used-on-late-page.webp", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z", metadata: { size: 10 } },
  ] as never, read.map(({ thumbnail_url }) => thumbnail_url));
  assert.equal(candidates.length, 0);
});

test("offset pagination advances by the raw capped page length until empty", async () => {
  const source = ["a.webp", "b.webp", "c.webp", "d.webp", "e.webp"];
  const requestedOffsets: number[] = [];
  const read = await readAllByOffset(async (offset, requestedLimit) => {
    assert.equal(requestedLimit, 4);
    requestedOffsets.push(offset);
    return source.slice(offset, offset + 2).map((name) => ({ name }));
  }, ({ name }) => name, 4);

  assert.deepEqual(read.map(({ name }) => name), source);
  assert.deepEqual(requestedOffsets, [0, 2, 4, 5]);
});

test("storage inventory rejects incomplete objects and missing pages instead of treating them as safe", () => {
  const valid = {
    id: "file-1",
    name: "article.webp",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    metadata: { size: 10 },
  };
  const invalid = [
    { ...valid, id: undefined },
    { ...valid, metadata: { size: -1 } },
    { ...valid, metadata: { size: "" } },
    { ...valid, metadata: { size: "unknown" } },
    { ...valid, updated_at: "not-a-date" },
    { ...valid, created_at: "not-a-date" },
  ];

  for (const object of invalid) {
    assert.throws(() => getUnreferencedThumbnailObjects([object] as never, []));
  }
  assert.throws(() => requirePageData(null, "Storage list query"));
  assert.throws(() => requirePageData(undefined, "Article query"));
  assert.deepEqual(requirePageData([valid], "Storage list query"), [valid]);
});
