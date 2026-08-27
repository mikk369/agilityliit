// =========================================================================
// DOG SIZES
// =========================================================================

export const SIZES = ["XS", "S", "M", "SL", "L"] as const;
export type Size = (typeof SIZES)[number];

// =========================================================================
// SIZE STANDARDS
// =========================================================================

export const SIZE_STANDARDS = ["EST", "FCI"] as const;
export type SizeStandard = (typeof SIZE_STANDARDS)[number];

// =========================================================================
// AGILITY & JUMP CLASSES
// =========================================================================

export const AGILITY_CLASSES = ["", "A0", "A1", "A2", "A3"] as const;
export const COMPETITION_CLASSES = ["A0", "A1", "A2", "A3"] as const;
export const JUMP_CLASSES = ["H0", "H1", "H2", "H3"] as const;

// =========================================================================
// TRACK TYPES
// =========================================================================

/**
 * A track's class, stored in `competition_tracks.track_type`.
 *
 * Shared table: the same values are written by the WordPress app, so this list
 * mirrors TRACK_TYPE_OPTIONS in organizerPage/src/constants/trackTypes.ts.
 * The neighbouring `competition_type` column holds the officiality
 * (ametlik / mitteametlik), not the class.
 */
export const TRACK_TYPES = [
  "H0",
  "H1",
  "A1",
  "H2",
  "A2",
  "H3",
  "A3",
  "Open A",
  "Open H",
  "Seenior A",
  "Seenior H",
  "Open Team A",
  "Open Team H",
  "tunnelid",
] as const;
export type TrackType = (typeof TRACK_TYPES)[number];

/** Track classes that can never be official — the organizer form forces these. */
export const NON_OFFICIAL_TRACK_TYPES = new Set([
  "A0",
  "H0",
  "tunnelid",
  "Seenior A",
  "Seenior H",
]);

/** Team classes; only these may be run as a relay. */
export const TEAM_TRACK_TYPES = new Set(["Open Team A", "Open Team H"]);

// =========================================================================
// TRACK OFFICIALITY (`competition_tracks.competition_type`)
// =========================================================================

export const TRACK_OFFICIALITY = ["ametlik", "mitteametlik"] as const;
export type TrackOfficiality = (typeof TRACK_OFFICIALITY)[number];

// =========================================================================
// TRACK LETTERS
// =========================================================================

export const TRACK_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

// =========================================================================
// COMPETITION TYPES
// =========================================================================

export const COMPETITION_TYPES = [
  "Ametlik võistlus",
  "Mitteametlik võistlus",
  "Klubiüritus",
  "Treening",
] as const;

// =========================================================================
// BOOKING STATUS
// =========================================================================

export const BOOKING_STATUSES = ["PENDING", "BOOKED", "CLUBEVENT"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// =========================================================================
// REGISTRATION STATUS
// =========================================================================

export const REG_STATUS_OPEN = "reg_open";
export const REG_STATUS_CLOSED = "reg_closed";

// =========================================================================
// COMPETITOR STATUS
// =========================================================================

export const COMPETITOR_STATUSES = ["PENDING", "ACCEPTED"] as const;
export type CompetitorStatus = (typeof COMPETITOR_STATUSES)[number];

// =========================================================================
// USER ROLES
// =========================================================================

export const USER_ROLES = ["ADMIN", "ORGANIZER", "COMPETITOR"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// =========================================================================
// COUNTRIES
// =========================================================================

export const COUNTRIES = [
  "EST", "FIN", "LAT", "LTU", "SWE", "NOR", "DNK", "DEU", "POL", "CZE",
  "SVK", "HUN", "AUT", "CHE", "FRA", "GBR", "IRL", "NLD", "BEL", "ITA",
  "ESP", "PRT", "ROU", "BGR", "HRV", "SRB", "SVN", "BIH", "MNE", "MKD",
  "ALB", "GRC", "TUR", "UKR", "BLR", "MDA", "RUS", "GEO", "ARM", "AZE",
  "KAZ", "ISL", "LUX", "MLT", "CYP",
] as const;
