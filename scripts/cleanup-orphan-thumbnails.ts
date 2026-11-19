import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { FileObject } from "@supabase/storage-js";
import { createSupabaseServiceFetch } from "../src/lib/supabase/service-key-headers";

const BUCKET = "thumbnails";
const PAGE_SIZE = 1_000;
const MAX_BATCH_BYTES = 200_000_000;

type ArticleThumbnailRow = { id: string; thumbnail_url: string | null };
type SizedFileObject = Omit<FileObject, "metadata"> & { metadata: { size?: number | string } | null };
type ValidThumbnailObject = SizedFileObject & {
  name: string;
  id: string;
  created_at: string;
  updated_at: string;
};

function createCleanupClient(url: string, key: string) {
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: createSupabaseServiceFetch(key) },
  });
}

function isExplicitFolderEntry(object: SizedFileObject): boolean {
  return object.id === null && object.metadata === null && object.created_at === null && object.updated_at === null;
}

function getValidObjectSize(object: SizedFileObject): number {
  const rawSize = object.metadata?.size;
  if (typeof rawSize !== "number" && typeof rawSize !== "string") {
    throw new Error(`Storage object ${object.name || "<unnamed>"} is missing its size`);
  }
  if (typeof rawSize === "string" && rawSize.trim() === "") {
    throw new Error(`Storage object ${object.name || "<unnamed>"} has an empty size`);
  }
  const size = Number(rawSize);
  if (!Number.isSafeInteger(size) || size < 0) {
    throw new Error(`Storage object ${object.name || "<unnamed>"} has an invalid size`);
  }
  return size;
}

function validateStorageFileObject(object: SizedFileObject): asserts object is ValidThumbnailObject {
  if (typeof object.name !== "string" || object.name.length === 0 || object.name.includes("/")) {
    throw new Error("Storage returned a file without a valid root object name");
  }
  if (typeof object.id !== "string" || object.id.length === 0) {
    throw new Error(`Storage object ${object.name} is missing an object ID`);
  }
  getValidObjectSize(object);
  for (const [label, value] of [["creation", object.created_at], ["update", object.updated_at]] as const) {
    if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
      throw new Error(`Storage object ${object.name} has an invalid ${label} timestamp`);
    }
  }
}

export async function readAllByKeyset<T extends { id: string }>(
  readPage: (afterId: string | null, limit: number) => Promise<readonly T[]>,
  pageSize = PAGE_SIZE,
): Promise<T[]> {
  const rows: T[] = [];
  let afterId: string | null = null;

  for (;;) {
    const page = await readPage(afterId, pageSize);
    if (page.length === 0) return rows;
    let nextId: string | null = afterId;
    for (const row of page) {
      if (!row.id || (nextId !== null && row.id <= nextId)) {
        throw new Error("Keyset pagination did not advance by ID");
      }
      nextId = row.id;
    }
    rows.push(...page);
    afterId = nextId;
  }
}

export async function readAllByOffset<T>(
  readPage: (offset: number, limit: number) => Promise<readonly T[]>,
  getIdentity: (row: T) => string,
  pageSize = PAGE_SIZE,
): Promise<T[]> {
  const rows: T[] = [];
  const seen = new Set<string>();
  let offset = 0;

  for (;;) {
    const page = await readPage(offset, pageSize);
    if (page.length === 0) return rows;
    for (const row of page) {
      const identity = getIdentity(row);
      if (seen.has(identity)) throw new Error("Offset pagination returned a duplicate storage object");
      seen.add(identity);
    }
    rows.push(...page);
    offset += page.length;
  }
}

export function requirePageData<T>(data: unknown, source: string): T[] {
  if (!Array.isArray(data)) throw new Error(`${source} did not return a page array`);
  return data as T[];
}

export function getUnreferencedThumbnailObjects(
  objects: readonly SizedFileObject[],
  thumbnailUrls: readonly (string | null)[],
): SizedFileObject[] {
  return objects.filter((object) => {
    if (isExplicitFolderEntry(object)) return false;
    validateStorageFileObject(object);
    return !thumbnailUrls.some((url) => isThumbnailObjectReferenced(object.name, url));
  });
}

export function isThumbnailObjectReferenced(objectName: string, thumbnailUrl: string | null): boolean {
  if (!thumbnailUrl) return false;
  try {
    const parsed = new URL(thumbnailUrl, "https://techgotgan.invalid");
    const pathSegments = decodeURIComponent(parsed.pathname).split("/").filter(Boolean);
    const bucketIndex = pathSegments.lastIndexOf(BUCKET);
    return bucketIndex >= 0 && pathSegments.length === bucketIndex + 2 && pathSegments[bucketIndex + 1] === objectName;
  } catch {
    // A malformed non-null reference must not make a stored object eligible for deletion.
    return true;
  }
}

export function getThumbnailBytes(objects: readonly SizedFileObject[]): number {
  return objects.reduce((total, object) => total + getValidObjectSize(object), 0);
}

export function getThumbnailInventoryDigest(objects: readonly SizedFileObject[]): string {
  const inventory = objects.map((object) => {
    validateStorageFileObject(object);
    return [object.name, object.id, getValidObjectSize(object), object.created_at, object.updated_at] as const;
  })
    .sort(([leftName, leftId, leftSize, leftCreatedAt, leftUpdatedAt], [rightName, rightId, rightSize, rightCreatedAt, rightUpdatedAt]) =>
      leftName < rightName ? -1 : leftName > rightName ? 1
        : leftId < rightId ? -1 : leftId > rightId ? 1
          : leftSize - rightSize !== 0 ? leftSize - rightSize
            : leftCreatedAt < rightCreatedAt ? -1 : leftCreatedAt > rightCreatedAt ? 1
              : leftUpdatedAt < rightUpdatedAt ? -1 : leftUpdatedAt > rightUpdatedAt ? 1 : 0);
  return createHash("sha256").update(JSON.stringify(inventory)).digest("hex");
}

async function listArticleThumbnailUrls(): Promise<string[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required");
  const supabase = createCleanupClient(supabaseUrl, secretKey);
  const rows = await readAllByKeyset(async (afterId, limit) => {
    let query = supabase.from("articles")
      .select("id,thumbnail_url")
      .not("thumbnail_url", "is", null)
      .order("id", { ascending: true })
      .limit(limit);
    if (afterId) query = query.gt("id", afterId);
    const { data, error } = await query;
    if (error) throw new Error(`Could not read article thumbnail references: ${error.message}`);
    return requirePageData<ArticleThumbnailRow>(data, "Article thumbnail query");
  });
  return rows.map(({ thumbnail_url }) => thumbnail_url).filter((url): url is string => Boolean(url));
}

async function listThumbnailObjects(): Promise<SizedFileObject[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required");
  const supabase = createCleanupClient(supabaseUrl, secretKey);
  return readAllByOffset(async (offset, limit) => {
    const { data, error } = await supabase.storage.from(BUCKET).list("", {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`Could not list thumbnail objects: ${error.message}`);
    return requirePageData<SizedFileObject>(data, "Storage list query");
  }, ({ name }) => {
    if (typeof name !== "string" || name.length === 0) throw new Error("Storage returned an unnamed object");
    return name;
  })
    .then((objects) => objects.filter((object) => {
      if (isExplicitFolderEntry(object)) return false;
      validateStorageFileObject(object);
      return true;
    }));
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const expectedCount = Number(process.env.ORPHAN_THUMBNAIL_EXPECTED_COUNT);
  const expectedDigest = process.env.ORPHAN_THUMBNAIL_EXPECTED_DIGEST;
  const expectedInventoryDigest = process.env.ORPHAN_THUMBNAIL_EXPECTED_INVENTORY_DIGEST;
  const dryRun = process.env.ORPHAN_THUMBNAIL_DRY_RUN === "true";
  if (!supabaseUrl || !secretKey || (!dryRun && (!Number.isInteger(expectedCount) || expectedCount < 1))) {
    throw new Error("Supabase credentials and, unless auditing, an expected orphan count are required");
  }

  const [thumbnailUrls, objects] = await Promise.all([listArticleThumbnailUrls(), listThumbnailObjects()]);
  const candidates = getUnreferencedThumbnailObjects(objects, thumbnailUrls);
  const candidateBytes = getThumbnailBytes(candidates);
  const candidateDigest = getThumbnailInventoryDigest(candidates);
  const inventoryDigest = getThumbnailInventoryDigest(objects);
  console.log(JSON.stringify({
    bucket: BUCKET,
    inventory: { objects: objects.length, bytes: getThumbnailBytes(objects), sha256: inventoryDigest },
    candidates: { objects: candidates.length, bytes: candidateBytes, sha256: candidateDigest },
    mode: dryRun ? "audit" : "delete",
  }));

  if (dryRun) return;

  if (candidates.length !== expectedCount) {
    throw new Error(`Refusing to delete: expected ${expectedCount} unreferenced objects, found ${candidates.length}`);
  }
  if (!expectedDigest || candidateDigest !== expectedDigest) {
    throw new Error("Refusing to delete: current object names, IDs, or sizes do not match the reviewed inventory digest");
  }
  if (!expectedInventoryDigest || inventoryDigest !== expectedInventoryDigest) {
    throw new Error("Refusing to delete: the current bucket inventory does not match the reviewed inventory digest");
  }
  if (candidateBytes > MAX_BATCH_BYTES) {
    throw new Error(`Refusing to delete: candidate size ${candidateBytes} exceeds the ${MAX_BATCH_BYTES} byte safety cap`);
  }
  if (candidates.some(({ name }) => name.includes("/") || name.includes(".."))) {
    throw new Error("Refusing to delete a thumbnail path outside the approved root bucket scope");
  }

  const [latestThumbnailUrls, latestObjects] = await Promise.all([listArticleThumbnailUrls(), listThumbnailObjects()]);
  const latestCandidates = getUnreferencedThumbnailObjects(latestObjects, latestThumbnailUrls);
  if (
    getThumbnailInventoryDigest(latestCandidates) !== expectedDigest ||
    getThumbnailInventoryDigest(latestObjects) !== expectedInventoryDigest
  ) {
    throw new Error("Refusing to delete: the approved inventory or article references changed before deletion");
  }

  const supabase = createCleanupClient(supabaseUrl, secretKey);
  const { data: removed, error } = await supabase.storage.from(BUCKET).remove(latestCandidates.map(({ name }) => name));
  if (error) throw new Error(`Storage API refused the approved orphan cleanup: ${error.message}`);
  if ((removed?.length ?? 0) !== expectedCount) {
    throw new Error(`Storage API removed ${removed?.length ?? 0} objects; expected ${expectedCount}`);
  }

  const remaining = await listThumbnailObjects();
  const remainingNames = new Set(remaining.map(({ name }) => name));
  const stillPresent = latestCandidates.filter(({ name }) => remainingNames.has(name)).length;
  if (stillPresent > 0) throw new Error(`${stillPresent} approved thumbnail objects remain after deletion`);
  if (remaining.length !== latestObjects.length - expectedCount) {
    throw new Error(`Bucket object count changed unexpectedly: expected ${latestObjects.length - expectedCount}, found ${remaining.length}`);
  }
  console.log(JSON.stringify({ bucket: BUCKET, removed: removed.length, remainingObjects: remaining.length, remainingBytes: getThumbnailBytes(remaining) }));
}

if (process.argv[1]?.endsWith("cleanup-orphan-thumbnails.ts")) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Thumbnail cleanup failed");
    process.exitCode = 1;
  });
}
