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

/** Booking list item (competitions page) */
export type BookingListItem = Pick<
  Booking,
  "id" | "startDate" | "endDate" | "organizerName" | "clubName" | "location" | "competitionType" | "status" | "regStatus" | "regCloseDate"
>;

/**
 * Calendar event shape — the payload the WordPress calendar on agilityliit.ee
 * reads from `/api/public/calendar`. This app has no calendar page of its own,
 * so this is an external contract: additive changes only, and never add
 * personal fields (`email`, `phone`, `userId`).
 */
export interface CalendarEvent {
  id: number;
  clubName: string;
  organizerName: string;
  /** ISO date, from the booking's `startDate` */
  start: string;
  /** ISO date, from the booking's `endDate` */
  end: string;
  referee: string[];
  competitionClasses: string;
  competitionType: string;
  /** From the booking's `info` */
  description: string;
  location: string;
  regStatus: string | null;
  regCloseDate: string | null;
  /** Computed: whether the calendar should link this event to registration */
  registrationOpen: boolean;
  status: string;
  /** Absolute link into the app for a click on this event */
  url: string;
}

