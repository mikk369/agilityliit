import type { BookingListItem } from "@/types";

/** A row in the admin bookings table — what `GET /api/bookings` returns. */
export type AdminBooking = BookingListItem;

export const STATUS_FILTERS = [
  { value: "", label: "Kõik" },
  { value: "PENDING", label: "Ootel" },
  { value: "BOOKED", label: "Kinnitatud" },
  { value: "CLUBEVENT", label: "Klubiüritused" },
] as const;

export const PAGE_SIZES = [10, 20, 50] as const;
