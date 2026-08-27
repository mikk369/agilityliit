// =========================================================================
// Dog types used across pages
// =========================================================================

export interface Dog {
  id: number;
  nickName: string;
  officialName: string | null;
  breed: string | null;
  gender: string | null;
  birthday: string | null;
  sizeEst: string | null;
  sizeFci: string | null;
  /** Confirmed by two agreeing measurements; null until the class is decided. */
  sizeOfficial: string | null;
  sizeOfficialFci: string | null;
  agilityClass: string | null;
  jumpClass: string | null;
  registerCode: string | null;
  idCode: string | null;
  generalVaccinationEnd: string | null;
  rabiesVaccinationEnd: string | null;
  ownersName: string | null;
  info: string | null;
}

/**
 * Editable dog fields. Confirmed classes are set by the API from two agreeing
 * measurements and are never edited through the dog form.
 */
export type DogFormFields = Omit<Dog, "id" | "sizeOfficial" | "sizeOfficialFci">;

/** Minimal dog info used in tables/lists */
export type DogSummary = Pick<Dog, "id" | "nickName" | "sizeEst" | "breed"> &
  Partial<Pick<Dog, "sizeOfficial" | "sizeOfficialFci">>;

/** Dog info for registration */
export type DogRegistration = Pick<
  Dog,
  "id" | "nickName" | "officialName" | "sizeEst" | "sizeFci" | "sizeOfficial" | "sizeOfficialFci" | "agilityClass" | "jumpClass" | "registerCode" | "idCode" | "generalVaccinationEnd" | "rabiesVaccinationEnd"
>;

/** Dog progression/class upgrade data */
export interface ProgressionData {
  dogId: number;
  currentAgilityClass: string;
  currentJumpClass: string;
  agilityClearCount: number;
  agilityRequired: number;
  agilityNextClass: string | null;
  agilityEligible: boolean;
  agilityEligibleDate: string | null;
  jumpClearCount: number;
  jumpRequired: number;
  jumpNextClass: string | null;
  jumpEligible: boolean;
  jumpEligibleDate: string | null;
  seniorAgilityClearCount: number;
  seniorJumpClearCount: number;
  clearTracks: Array<{
    competitionName: string;
    trackName: string;
    date: string;
    timeSeconds: number;
    faults: number;
  }>;
}

/** One recorded measurement of a dog, as shown in its measurement history. */
export interface DogMeasurementEntry {
  id: number;
  referee: string;
  /** Resolved EKL class label, derived from `measurementCm` by the API. */
  measurementEst: string;
  /** Measured height in cm. Null on legacy free-text rows. */
  measurementCm: number | null;
  /** Resolved FCI class label, derived from `measurementCm` by the API. */
  measurementFci: string | null;
  createdAt: string;
  competitionId: number;
  competitionName: string;
  competitionStartDate: string;
}

/** Measurement history plus the classes those measurements confirmed. */
export interface DogMeasurementHistory {
  sizeOfficial: string | null;
  sizeOfficialFci: string | null;
  measurements: DogMeasurementEntry[];
}
