const PUBLIC_THUMBNAIL_PREFIX = "/storage/v1/object/public/thumbnails/";
const TRANSFORMED_THUMBNAIL_PREFIX = "/storage/v1/render/image/public/thumbnails/";
// The first card is at most 332 CSS pixels on mobile; 640px covers a 2x display without
// triggering the much slower 1080px Supabase transform on high-DPR phones.
const RESPONSIVE_THUMBNAIL_WIDTHS = [32, 48, 64, 96, 128, 256, 384, 640];

export function getSupabaseThumbnailTransformUrl(
  sourceUrl: string,
  width: number,
  quality = 70
): string | null {
  try {
    const url = new URL(sourceUrl);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".supabase.co")) return null;
    if (!url.pathname.startsWith(PUBLIC_THUMBNAIL_PREFIX)) return null;

    url.pathname = url.pathname.replace(PUBLIC_THUMBNAIL_PREFIX, TRANSFORMED_THUMBNAIL_PREFIX);
    url.search = "";
    url.searchParams.set("width", String(width));
    url.searchParams.set("quality", String(quality));
    url.searchParams.set("resize", "contain");
    url.searchParams.set("format", "webp");
    return url.toString();
  } catch {
    return null;
  }
}

export function getSupabaseThumbnailTransformSrcSet(sourceUrl: string, quality = 70): string | null {
  const candidates = RESPONSIVE_THUMBNAIL_WIDTHS.map((width) => {
    const url = getSupabaseThumbnailTransformUrl(sourceUrl, width, quality);
    return url ? `${url} ${width}w` : null;
  });

  if (candidates.some((candidate) => candidate === null)) return null;
  return candidates.join(", ");
}
