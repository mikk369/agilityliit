// =========================================================================
// SPONSOR IMAGES
// =========================================================================

/**
 * Sponsor logos shown on a competition's public page.
 *
 * The WordPress app kept these in the media library and stored the media id
 * and its URL. There is no media library here, so the bytes go to a directory
 * on the server and the stored entry keeps the same shape — an id, a URL and a
 * display size — which means rows carried over from production still read.
 *
 * The directory lives outside `public/`: files written there after a build are
 * not something Next promises to serve, so they are streamed by
 * `GET /api/sponsor-images/[file]` instead.
 *
 * Reading and writing those files lives in `sponsor-storage.ts` — this module
 * is imported by the browser too, and `fs` cannot go there.
 */

export const MAX_SPONSOR_IMAGE_BYTES = 2 * 1024 * 1024;

/** What a browser may send. The extension is taken from this, never from the upload's own name. */
export const SPONSOR_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

/** How large the logo is drawn. Same three the WordPress app wrote. */
export const SPONSOR_IMAGE_SIZES = ["S", "M", "L"] as const;
export type SponsorImageSize = (typeof SPONSOR_IMAGE_SIZES)[number];

export interface SponsorImage {
  /** The stored file name here; a numeric media id on rows written by WordPress. */
  id: string | number;
  url: string;
  size?: SponsorImageSize;
}

/**
 * The stored JSON as a list. Written by two apps over the years, so every
 * entry is checked rather than trusted, and anything unrecognisable is dropped.
 */
export function readSponsorImages(value: unknown): SponsorImage[] {
  if (!Array.isArray(value)) return [];

  const images: SponsorImage[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const { id, url, size } = entry as Record<string, unknown>;
    if (typeof url !== "string" || !url) continue;
    if (typeof id !== "string" && typeof id !== "number") continue;

    const key = String(id);
    if (seen.has(key)) continue;
    seen.add(key);

    images.push({
      id: typeof id === "number" ? id : String(id),
      url,
      size: SPONSOR_IMAGE_SIZES.includes(size as SponsorImageSize)
        ? (size as SponsorImageSize)
        : "M",
    });
  }

  return images;
}
