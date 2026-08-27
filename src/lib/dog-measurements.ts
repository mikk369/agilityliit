import { prisma } from "@/lib/db";
import { classFromCm, confirmedClass, DOG_SIZE_CLASSES } from "@/lib/dog-sizes";

/**
 * Accept a stored result only when it is exactly one of the known class labels.
 * Legacy free-text results (e.g. "47-48") are ignored so they cannot decide a class.
 */
function normalizeClassLabel(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  return (DOG_SIZE_CLASSES as readonly string[]).includes(trimmed) ? trimmed : "";
}

/**
 * Recalculate and persist a dog's officially confirmed classes from its full
 * measurement history.
 *
 * A class is only confirmed once TWO measurements resolve to the SAME class, so
 * a second measurement landing in a different class than the first leaves the
 * dog's competition class unchanged. Always rebuilds from scratch, so it is
 * safe to call after an insert, an update or a delete.
 */
export async function recalculateDogOfficialSizes(dogId: number) {
  const rows = await prisma.dogMeasurement.findMany({
    where: { dogId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { measurementEst: true, measurementCm: true, measurementFci: true },
  });

  const estClasses: string[] = [];
  const fciClasses: string[] = [];

  for (const row of rows) {
    const cm = row.measurementCm === null ? null : Number(row.measurementCm);

    // Prefer the recorded height; fall back to a stored class label so rows
    // created before cm was captured still count.
    const est = cm !== null ? classFromCm(cm, "EST") : normalizeClassLabel(row.measurementEst);
    const fci = cm !== null ? classFromCm(cm, "FCI") : normalizeClassLabel(row.measurementFci);

    if (est) estClasses.push(est);
    if (fci) fciClasses.push(fci);
  }

  const sizeOfficial = confirmedClass(estClasses);
  const sizeOfficialFci = confirmedClass(fciClasses);

  await prisma.dog.update({
    where: { id: dogId },
    data: { sizeOfficial, sizeOfficialFci },
  });

  return { sizeOfficial, sizeOfficialFci };
}
