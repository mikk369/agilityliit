/**
 * Which tracks a dog may enter.
 *
 * A track is identified by its class (`trackType`: "A2", "H1", "Open A",
 * "Seenior A", "tunnelid") and the size it is run for (`size`: XS/S/M/SL/L).
 * A dog may enter a track when the size matches and the class is not above the
 * class the dog has reached — the same rule as `isTrackEligible()` in
 * organizerPage/src/competitorPage/competitorSubPages/CompetitorCompetitions.tsx.
 */

/** Classes with no rank requirement: any dog of the matching size may enter. */
export const OPEN_TRACK_TYPES = new Set([
  "Open A",
  "Open H",
  "Open Team A",
  "Open Team H",
  "Seenior A",
  "Seenior H",
]);

const AGILITY_RANK: Record<string, number> = { A1: 1, A2: 2, A3: 3 };
const JUMP_RANK: Record<string, number> = { H0: 0, H1: 1, H2: 2, H3: 3 };

export const isOpenTrackType = (trackType: string): boolean =>
  OPEN_TRACK_TYPES.has(trackType);

const isAgilityClass = (trackType: string) => /^A[1-3]$/.test(trackType);
const isJumpClass = (trackType: string) => /^H[0-3]$/.test(trackType);

/**
 * The size code inside a class label: "Midi(M)" -> "M".
 * Tracks store the bare code, dogs store the full Estonian label.
 */
export function dogSizeCode(sizeLabel: string | null | undefined): string {
  if (!sizeLabel) return "";
  return sizeLabel.match(/\((XS|S|M|SL|L)\)/)?.[1] ?? "";
}

export function isTrackEligible(
  track: { trackType: string; size: string },
  dog: {
    sizeEst?: string | null;
    sizeOfficial?: string | null;
    agilityClass?: string | null;
    jumpClass?: string | null;
  }
): boolean {
  // A confirmed (measured) class wins over the owner's own estimate, the same
  // way results and protocols resolve a dog's size.
  const sizeCode = dogSizeCode(dog.sizeOfficial || dog.sizeEst);
  if (!sizeCode) return false;

  const trackType = String(track.trackType ?? "");

  // Tunnel runs are open to any dog of the right size.
  if (trackType === "tunnelid") return track.size === sizeCode;

  if (track.size !== sizeCode) return false;
  if (isOpenTrackType(trackType)) return true;

  if (isAgilityClass(trackType)) {
    const dogClass = dog.agilityClass ?? "";
    if (!(dogClass in AGILITY_RANK)) return false;
    return AGILITY_RANK[trackType] <= AGILITY_RANK[dogClass];
  }

  if (isJumpClass(trackType)) {
    const dogClass = dog.jumpClass ?? "";
    if (!(dogClass in JUMP_RANK)) return false;
    return JUMP_RANK[trackType] <= JUMP_RANK[dogClass];
  }

  return false;
}
