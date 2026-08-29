import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  MAX_SPONSOR_IMAGE_BYTES,
  SPONSOR_IMAGE_TYPES,
  type SponsorImage,
} from "./sponsor-images";

// =========================================================================
// SPONSOR IMAGE STORAGE (server only)
// =========================================================================

/**
 * Where the uploaded logos live. Kept apart from `sponsor-images.ts` because
 * that module is also imported by client components, and `fs` cannot be.
 */

/** Where the files live. Set `SPONSOR_UPLOAD_DIR` to put them on a mounted volume. */
export function sponsorUploadDir(): string {
  return process.env.SPONSOR_UPLOAD_DIR || path.join(process.cwd(), "uploads", "sponsors");
}

/**
 * A stored file name reduced to something safe to join onto the upload
 * directory. Anything with a path separator, a parent segment or an unexpected
 * character is rejected rather than cleaned up, so a crafted name cannot walk
 * out of the directory.
 */
export function safeFileName(name: string): string | null {
  return /^[A-Za-z0-9][A-Za-z0-9_-]*\.[A-Za-z0-9]{1,5}$/.test(name) ? name : null;
}

/** The URL a stored file is served from. */
export function sponsorImageUrl(fileName: string): string {
  return `/api/sponsor-images/${fileName}`;
}

/** Writes one upload and returns the entry to store on the competition. */
export async function storeSponsorImage(file: File): Promise<SponsorImage> {
  const extension = SPONSOR_IMAGE_TYPES[file.type];
  if (!extension) throw new Error("unsupported-type");
  if (file.size > MAX_SPONSOR_IMAGE_BYTES) throw new Error("too-large");

  const dir = sponsorUploadDir();
  await mkdir(dir, { recursive: true });

  // The name is generated, never taken from the upload: two clubs uploading
  // "logo.png" must not collide, and a name from outside is not to be trusted.
  const fileName = `${randomUUID()}.${extension}`;
  await writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));

  return { id: fileName, url: sponsorImageUrl(fileName), size: "M" };
}

