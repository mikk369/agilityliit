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

export const TRACK_TYPES = ["agility", "jumping"] as const;
export type TrackType = (typeof TRACK_TYPES)[number];

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
