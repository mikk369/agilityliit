// =========================================================================
// SIZE GROUPS (suurusrühm)
// =========================================================================

/**
 * The size group a track is run for, stored in `competition_tracks.size`.
 *
 * A dog's own size is NOT one of these: dogs carry the Estonian class label
 * ("Midi(M)"), see DOG_SIZE_CLASSES in `dog-sizes.ts`.
 */
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
// TRACK TYPES / võistlusklass (`competition_tracks.track_type`)
// =========================================================================

/**
 * The class a track is run for, read as `trackType` and labelled
 * "Võistlusklass": a dog may enter it once it has reached that class.
 *
 * Shared convention: the same values are written by the WordPress app, so this
 * list mirrors TRACK_TYPE_OPTIONS in organizerPage/src/constants/trackTypes.ts.
 * The neighbouring `competition_type` column holds the officiality
 * (ametlik / mitteametlik) and is read as `officiality`, NOT as a track type.
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

/** Track types that can never be official — the organizer form forces these. */
export const NON_OFFICIAL_TRACK_TYPES = new Set([
  "A0",
  "H0",
  "tunnelid",
  "Seenior A",
  "Seenior H",
]);

/** Team track types; only these may be run as a relay. */
export const TEAM_TRACK_TYPES = new Set(["Open Team A", "Open Team H"]);

// =========================================================================
// TRACK OFFICIALITY / ametlikkus (`competition_tracks.competition_type`)
// =========================================================================

/**
 * Whether the track counts officially — read as `officiality`.
 *
 * The UI labels this "Võistlustüüp", the same words the booking form uses for
 * its own field (COMPETITION_OFFICIALITY below) — two different fields, one
 * label, so do not go by the label when reading a track: this one is ametlik /
 * mitteametlik, the booking one is CACIAG, Rahvuslik võistlus, ...
 */
export const TRACK_OFFICIALITY = ["ametlik", "mitteametlik"] as const;
export type TrackOfficiality = (typeof TRACK_OFFICIALITY)[number];

// =========================================================================
// TRACK LETTERS
// =========================================================================

export const TRACK_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

// =========================================================================
// COMPETITION KINDS (võistlustüüp)
// =========================================================================

/**
 * What kind of competition a booking is (võistlustüüp), stored in
 * `bookings.competition_type` and read as `competitionOfficiality`. Mirrors the list in
 * organizerPage/src/registerNewCompetition/RegisterBookings.tsx so bookings
 * imported from the WordPress app carry values this app also offers.
 *
 * A club event is NOT one of these - that is the booking status CLUBEVENT.
 */
export const COMPETITION_OFFICIALITY = [
  "EKL eesti edukamate sportkoerte ja koerajuhtide võistlus",
  "Tõuühingu meistrivõistlus",
  "Klubimeistrivõistlus",
  "Rahvuslik võistlus",
  "CACIAG",
  "Mitteametlik võistlus",
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
