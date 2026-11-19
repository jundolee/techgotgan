export function isThumbnailMirroringEnabled(value = process.env.MIRROR_THUMBNAILS_ENABLED): boolean {
  return value !== "false";
}
