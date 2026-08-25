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
  agilityClass: string | null;
  jumpClass: string | null;
  registerCode: string | null;
  idCode: string | null;
  generalVaccinationEnd: string | null;
  rabiesVaccinationEnd: string | null;
  ownersName: string | null;
  info: string | null;
}

/** Minimal dog info used in tables/lists */
export type DogSummary = Pick<Dog, "id" | "nickName" | "sizeEst" | "breed">;

/** Dog info for registration */
export type DogRegistration = Pick<
  Dog,
  "id" | "nickName" | "officialName" | "sizeEst" | "sizeFci" | "agilityClass" | "jumpClass" | "registerCode" | "idCode" | "generalVaccinationEnd" | "rabiesVaccinationEnd"
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
