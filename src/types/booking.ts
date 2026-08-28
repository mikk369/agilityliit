// =========================================================================
// Booking / Competition types used across pages
// =========================================================================

export interface CompetitionTrack {
  id: number;
  competitionDate: string;
  letter: string;
  trackType: string;
  size: string;
  officiality: string;
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
  competitionOfficiality: string;
  status: string;
  regStatus: string | null;
  regCloseDate: string | null;
  competitionInfo: CompetitionInfo | null;
  competitionTracks: CompetitionTrack[];
}

/** Booking list item (competitions page) */
export type BookingListItem = Pick<
  Booking,
  "id" | "startDate" | "endDate" | "organizerName" | "clubName" | "location" | "competitionOfficiality" | "status" | "regStatus" | "regCloseDate"
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


/**
 * Public competition list item — `/api/public/competitions`.
 *
 * `registrationOpen` is computed server-side by `isRegistrationOpen()`, the
 * same rule the calendar feed and `POST /api/competitors` use, so the badge on
 * the page can never disagree with what the API will accept.
 */
export interface PublicCompetitionListItem {
  id: number;
  startDate: string;
  endDate: string;
  organizerName: string;
  clubName: string;
  location: string;
  competitionOfficiality: string;
  status: string;
  regStatus: string | null;
  regCloseDate: string | null;
  registrationOpen: boolean;
}

/** Public competition detail — `/api/public/competitions/[id]`. */
export interface PublicCompetitionDetail {
  id: number;
  startDate: string;
  endDate: string;
  organizerName: string;
  clubName: string;
  email: string;
  phone: string;
  location: string;
  competitionOfficiality: string;
  competitionClasses: string | null;
  referee: string[];
  info: string | null;
  status: string;
  regStatus: string | null;
  regCloseDate: string | null;
  registrationOpen: boolean;
  competitionInfo: {
    descriptionEst: string | null;
    descriptionEng: string | null;
  } | null;
  competitionTracks: Pick<
    CompetitionTrack,
    "id" | "competitionDate" | "letter" | "trackType" | "size" | "officiality" | "referee" | "isRelay"
  >[];
}
