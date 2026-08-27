// =========================================================================
// Competitor & Result types used across pages
// =========================================================================

import type { CompetitionTrack } from "./booking";
import type { DogSummary } from "./dog";
import type { HandlerSummary } from "./handler";

/** Result for a single competitor on a single track */
export interface CompetitorResult {
  id: number;
  timeSeconds: number | null;
  faults: number;
  isDsq: boolean;
  isDns: boolean;
  hasQualification: boolean;
  notes?: string | null;
}

/** Competitor with handler, dog and track info (organizer views) */
export interface CompetitorEntry {
  id: number;
  status: string;
  remarks: string | null;
  needsMeasurement: boolean;
  needsCompetitionBook: boolean;
  createdAt: string;
  handler: HandlerSummary & { country?: string | null };
  dog: DogSummary & {
    sizeFci?: string | null;
    agilityClass: string | null;
    jumpClass: string | null;
  };
  competitorTracks: {
    competitionTrack: Pick<
      CompetitionTrack,
      "id" | "competitionDate" | "letter" | "trackType" | "size" | "competitionType"
    >;
  }[];
}

/** Competitor row in result entry (organizer results/[trackId]) */
export interface ResultEntryCompetitor {
  startProtocolId: number | null;
  competitorId: number;
  startNumber: number;
  sortOrder: number;
  size: string;
  handler: HandlerSummary;
  dog: DogSummary & { agilityClass: string | null; jumpClass: string | null };
  result: CompetitorResult | null;
}

/** Dog result as seen by competitor (my results page) */
export interface DogResult {
  id: number;
  dogNickName: string;
  dogId: number;
  bookingId: number;
  bookingName: string;
  bookingDate: string;
  trackLetter: string;
  trackType: string;
  competitionType: string;
  competitionDate: string;
  timeSeconds: number | null;
  faults: number;
  isDsq: boolean;
  isDns: boolean;
  hasQualification: boolean;
}

/** My registration (competitor competitions page) */
export interface MyRegistration {
  id: number;
  status: string;
  remarks: string | null;
  booking: {
    id: number;
    startDate: string;
    endDate: string;
    organizerName: string;
    clubName: string;
    location: string;
    competitionType: string;
    status: string;
    /** Judges of the competition; stored as a JSON array. */
    referee: string[] | null;
    regStatus: string | null;
    regCloseDate: string | null;
  };
  dog: {
    id: number;
    nickName: string;
    sizeEst: string | null;
    agilityClass: string | null;
    jumpClass: string | null;
  };
  competitorTracks: {
    competitionTrack: {
      id: number;
      letter: string;
      trackType: string;
      size: string;
      competitionType: string;
      competitionDate: string;
    };
  }[];
}
