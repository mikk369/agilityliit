import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import {
  MAX_SPONSOR_IMAGE_BYTES,
  SPONSOR_IMAGE_TYPES,
  readSponsorImages,
  type SponsorImage,
} from "@/lib/sponsor-images";
import { storeSponsorImage } from "@/lib/sponsor-storage";

/**
 * Upload one or more sponsor logos.
 *
 * The file is stored and handed back as an entry; nothing is attached to a
 * competition here. The organizer's page puts the entries into the sponsor
 * list and saves that list with the rest of the competition info, so an
 * upload the organizer then abandons never reaches a competition.
 */
export async function POST(req: Request) {
  try {
    const { response } = await requireRole("ORGANIZER", "ADMIN");
    if (response) return response;

    const form = await req.formData();
    const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: "Ühtegi faili ei saadetud" }, { status: 400 });
    }

    const images: SponsorImage[] = [];
    const rejected: string[] = [];

    for (const file of files) {
      if (!SPONSOR_IMAGE_TYPES[file.type]) {
        rejected.push(`${file.name} — pole toetatud pildifail`);
        continue;
      }
      if (file.size > MAX_SPONSOR_IMAGE_BYTES) {
        rejected.push(
          `${file.name} — liiga suur (maksimum ${MAX_SPONSOR_IMAGE_BYTES / (1024 * 1024)} MB)`
        );
        continue;
      }
      images.push(await storeSponsorImage(file));
    }

    return NextResponse.json({ images, rejected }, { status: images.length ? 201 : 400 });
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}

/**
 * The sponsor logos this organizer has used before.
 *
 * The WordPress editor picked from the site's whole media library. There is no
 * library here, so the gallery is built from the organizer's own competitions —
 * which is the case it served: the same club, the same sponsors, next season.
 */
export async function GET() {
  try {
    const { session, response } = await requireRole("ORGANIZER", "ADMIN");
    if (response) return response;

    const isAdmin = session.user.role === "ADMIN";
    const rows = await prisma.competitionInfo.findMany({
      where: isAdmin ? {} : { booking: { userId: parseInt(session.user.id) } },
      select: { sponsorImages: true },
      orderBy: { updatedAt: "desc" },
    });

    const gallery: SponsorImage[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      for (const image of readSponsorImages(row.sponsorImages)) {
        const key = String(image.id);
        if (seen.has(key)) continue;
        seen.add(key);
        gallery.push(image);
      }
    }

    return NextResponse.json(gallery);
  } catch {
    return NextResponse.json({ error: "Serveri viga" }, { status: 500 });
  }
}
