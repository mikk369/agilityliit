import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import { SPONSOR_IMAGE_TYPES } from "@/lib/sponsor-images";
import { safeFileName, sponsorUploadDir } from "@/lib/sponsor-storage";

const CACHE_CONTROL = "public, max-age=31536000, immutable";

const CONTENT_TYPES: Record<string, string> = Object.fromEntries(
  Object.entries(SPONSOR_IMAGE_TYPES).map(([type, extension]) => [extension, type])
);

/**
 * Serve a stored sponsor logo.
 *
 * Public: these are published on the competition page, which anyone may read.
 * The name is generated and never guessable, and it is validated before it is
 * joined onto the upload directory, so this cannot be used to read anything
 * else on the server.
 *
 * File names are unique per upload and their content never changes, hence the
 * immutable cache.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  try {
    const { file } = await params;
    const fileName = safeFileName(file);
    if (!fileName) {
      return NextResponse.json({ error: "Vigane failinimi" }, { status: 400 });
    }

    const extension = fileName.split(".").pop()!.toLowerCase();
    const contentType = CONTENT_TYPES[extension];
    if (!contentType) {
      return NextResponse.json({ error: "Vigane failinimi" }, { status: 400 });
    }

    const filePath = path.join(sponsorUploadDir(), fileName);
    const info = await stat(filePath).catch(() => null);
    if (!info?.isFile()) {
      return NextResponse.json({ error: "Pilti ei leitud" }, { status: 404 });
    }

    const body = await readFile(filePath);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
