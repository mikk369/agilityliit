import { REG_STATUS_CLOSED } from "./constants";

/**
 * Is registration open for a competition?
 *
 * One rule, two callers: the public calendar feed the WordPress site reads
 * (`/api/public/calendar`) and the entry endpoint (`POST /api/competitors`).
 * They must agree — a calendar that says "closed" while the API still accepts
 * entries is worse than either answer on its own.
 *
 * Who moves the pieces (unchanged from the WordPress system):
 *  - the organizer opens registration and may close it early (`regStatus`)
 *  - the admin approves the date reservation (`status`: PENDING -> BOOKED)
 *  - the deadline (`regCloseDate`) closes it on its own — this used to be an
 *    hourly WP cron writing `reg_closed`; it is computed here instead, so
 *    there is no cron to run and no second clock to disagree with.
 *
 * An empty `regStatus` counts as open, matching the old PHP check
 * (`!empty($reg_status) && $reg_status !== 'reg_open'` -> blocked), so legacy
 * rows with a NULL keep behaving the way they always did.
 */
export function isRegistrationOpen(
  booking: {
    status: string;
    regStatus: string | null;
    regCloseDate: Date | null;
    endDate: Date;
  },
  now: Date = new Date()
): boolean {
  // Only an admin-approved competition takes entries: a PENDING date
  // reservation is not confirmed yet, and a CLUBEVENT is not a competition.
  if (booking.status !== "BOOKED") return false;

  // The organizer closed it by hand.
  if (booking.regStatus === REG_STATUS_CLOSED) return false;

  // The deadline day itself still counts as open, like the old cron
  // (`reg_close_date < CURDATE()`).
  if (booking.regCloseDate && endOfDay(booking.regCloseDate) < now) return false;

  // Nothing to enter once the competition itself is over.
  if (endOfDay(booking.endDate) < now) return false;

  return true;
}

/**
 * Is a registration deadline already behind us?
 *
 * The deadline day itself still counts as open, matching `isRegistrationOpen`
 * above — only a date before today is past. Shared by the settings form and
 * `PATCH /api/bookings/[id]` so the form cannot offer a save the API refuses.
 */
export function isRegCloseDatePast(
  date: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!date) return false;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return false;
  return endOfDay(parsed) < now;
}

/**
 * Why opening registration behind an expired deadline is refused rather than
 * saved: `isRegistrationOpen` would keep answering "closed", so the save would
 * report success and change nothing an entrant could see.
 */
export const REG_CLOSE_DATE_PAST_ERROR =
  "Sulgemise kuupäev on möödas. Registreerimise avamiseks vali tänane või hilisem kuupäev.";

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
