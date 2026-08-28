/**
 * Dog measurement -> competition class.
 *
 * A dog's competition class is decided by TWO measurements resolving to the
 * SAME class. If the second measurement lands in a different class than the
 * first, the class is NOT changed - a third, tie-breaking measurement is needed.
 *
 * Thresholds (upper bound inclusive, cm):
 *   EKL: XS -28 | S 28,1-35 | M 35,1-43 | SL 43,1-50 | L 50,1-
 *   FCI: S -35  | M 35,1-43 | IM 43,1-48 | L 48,1-
 *
 * FCI has no XS, and its intermediate class (IM) is stored under the existing
 * 'Väikemaksi(SL)' label so the dogs table enum and all size grouping keep working.
 *
 * Keep in sync with agility_size_thresholds() in
 * vite-event-calendar/includes/helpers.php and organizerPage/src/constants/dogSizes.ts
 */

export type SizeStandard = 'EST' | 'FCI';

export const DOG_SIZE_CLASSES = [
  'Väikemini(XS)',
  'Mini(S)',
  'Midi(M)',
  'Väikemaksi(SL)',
  'Maksi(L)',
] as const;

export type DogSizeClass = (typeof DOG_SIZE_CLASSES)[number];

/**
 * The bare size code inside each class label. `competition_tracks.size` holds
 * exactly these codes, so this is the bridge between a dog and a track.
 */
const CODE_TO_LABEL: Record<string, DogSizeClass> = {
  XS: 'Väikemini(XS)',
  S: 'Mini(S)',
  M: 'Midi(M)',
  SL: 'Väikemaksi(SL)',
  L: 'Maksi(L)',
};

/**
 * The size code for a stored size: "Midi(M)" -> "M". Returns '' for anything
 * unrecognised.
 *
 * Dogs are meant to carry the full Estonian label, but rows written before the
 * dog form was fixed hold the bare code instead. A dog whose size resolves to
 * '' matches no track and no size group at all - so the bare code is accepted
 * here rather than silently hiding every track from its owner.
 */
export function dogSizeCode(size: string | null | undefined): string {
  if (!size) return '';
  const trimmed = String(size).trim();

  const fromLabel = trimmed.match(/\((XS|S|M|SL|L)\)/)?.[1];
  if (fromLabel) return fromLabel;

  const code = trimmed.toUpperCase();
  return code in CODE_TO_LABEL ? code : '';
}

/** The full class label for a size stored either way; '' when unrecognised. */
export function dogSizeLabel(size: string | null | undefined): DogSizeClass | '' {
  const code = dogSizeCode(size);
  return code ? CODE_TO_LABEL[code] : '';
}

/** Upper bound in cm per class; `null` marks the open-ended top class. */
const THRESHOLDS: Record<SizeStandard, { label: DogSizeClass; max: number | null }[]> = {
  EST: [
    { label: 'Väikemini(XS)', max: 28 },
    { label: 'Mini(S)', max: 35 },
    { label: 'Midi(M)', max: 43 },
    { label: 'Väikemaksi(SL)', max: 50 },
    { label: 'Maksi(L)', max: null },
  ],
  FCI: [
    { label: 'Mini(S)', max: 35 },
    { label: 'Midi(M)', max: 43 },
    { label: 'Väikemaksi(SL)', max: 48 },
    { label: 'Maksi(L)', max: null },
  ],
};

/** Minimum / maximum accepted measurement, mirrored by the API. */
export const MIN_MEASUREMENT_CM = 10;
export const MAX_MEASUREMENT_CM = 100;

/** Resolve a measured height in cm to a competition class, or '' if unusable. */
export function classFromCm(cm: number | string | null | undefined, standard: SizeStandard = 'EST'): DogSizeClass | '' {
  if (cm === null || cm === undefined || cm === '') return '';

  const value = typeof cm === 'number' ? cm : parseFloat(String(cm).replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) return '';

  for (const { label, max } of THRESHOLDS[standard]) {
    if (max === null || value <= max) return label;
  }
  return '';
}

/**
 * The class confirmed by two agreeing measurements, or null when the dog's
 * class is not yet decided. Measurements must be ordered oldest first.
 */
export function confirmedClass(classes: (string | null | undefined)[]): DogSizeClass | null {
  const seen = new Map<string, number>();

  for (const c of classes) {
    if (!c) continue;
    const count = (seen.get(c) ?? 0) + 1;
    seen.set(c, count);
    if (count >= 2) return c as DogSizeClass;
  }
  return null;
}

/**
 * Resolve a dog's effective competition class for a size standard.
 * A confirmed (measured) class always wins over the owner's own estimate.
 */
export function effectiveDogSize(
  dog: {
    sizeEst?: string | null;
    sizeFci?: string | null;
    sizeOfficial?: string | null;
    sizeOfficialFci?: string | null;
  },
  standard: SizeStandard = 'EST'
): string {
  if (standard === 'FCI') {
    return dog.sizeOfficialFci || dog.sizeFci || dog.sizeEst || '';
  }
  return dog.sizeOfficial || dog.sizeEst || '';
}
