// =========================================================================
// Booking / Competition types used across pages
// =========================================================================

export interface CompetitionTrack {
  id: number;
  competitionDate: string;
  letter: string;
  trackType: string;
  size: string;
  competitionType: string;
  referee: string | null;
  sizeStandard: string | null;
  sortOrder: number;
  isRelay: boolean;
}

export interface CompetitionInfo {
  id: number;
  descriptionEst: string | null;
  descriptionEng: string | null;
  sponsorImages: unknown;
  maxCompetitorsPerDay: Record<string, number> | null;
}

export interface Booking {
  id: number;
  startDate: string;
  endDate: string;
  qualTime: string | null;
  organizerName: string;
  clubName: string;
  email: string;
  phone: string;
  location: string;
  referee: string[];
  info: string | null;
  competitionClasses: string | null;
  competitionType: string;
  status: string;
  regStatus: string | null;
  regCloseDate: string | null;
  competitionInfo: CompetitionInfo | null;
  competitionTracks: CompetitionTrack[];
}

/** Booking list item (competitions page, calendar) */
export type BookingListItem = Pick<
  Booking,
  "id" | "startDate" | "endDate" | "organizerName" | "clubName" | "location" | "competitionType" | "status" | "regStatus" | "regCloseDate"
>;

/** Calendar event shape */
export interface CalendarEvent {
  id: number;
  clubName: string;
  start: string;
  end: string;
  referee: string[];
  competitionClasses: string;
  competitionType: string;
  description: string;
  location: string;
  regStatus: string | null;
  status: string;
}
