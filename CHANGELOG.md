# Changelog

## API auth helper (2026-08-25)

Created `src/lib/api-auth.ts` with centralized auth helpers to replace repeated session/role check boilerplate across all API routes.

| Helper | Purpose |
|--------|---------|
| `requireAuth()` | Returns session or 401 response |
| `requireRole(...roles)` | Returns session or 401/403 response |
| `isOrganizerOrAdmin(session)` | Boolean helper for inline checks |

**Updated 25 API route files (~29 handler functions):**

| Pattern | Count | Routes |
|---------|-------|--------|
| `requireRole("ORGANIZER", "ADMIN")` | 18 files | results, teams, start-protocol, awardings, dog-measurements, competitors, bookings POST, handlers search, dogs search |
| `requireRole("ADMIN")` | 1 file | booking status change |
| `requireAuth()` | 13 files | handlers/me, dogs, competitors, results/my, dog-progression, bookings PATCH/DELETE, competition tracks/info write |

**Not changed:** `GET /api/bookings` (conditional `mine=true` auth) and all public routes (calendar, statistics, public results/protocol/teams).

---

## Shared type definitions (2025-08-25)

Extracted duplicate inline interfaces into shared type files under `src/types/`. Pages now import from `@/types` instead of re-defining the same interfaces.

| File | Types |
|------|-------|
| `types/booking.ts` | `Booking`, `BookingListItem`, `CompetitionTrack`, `CompetitionInfo`, `CalendarEvent` |
| `types/dog.ts` | `Dog`, `DogSummary`, `DogRegistration`, `ProgressionData` |
| `types/handler.ts` | `Handler`, `HandlerSummary`, `HandlerWithCountry` |
| `types/competitor.ts` | `CompetitorResult`, `CompetitorEntry`, `ResultEntryCompetitor`, `DogResult`, `MyRegistration` |
| `types/team.ts` | `Team`, `TeamMember`, `TeamsResponse` |
| `types/statistics.ts` | `StatResult`, `SearchResponse`, `StatFilters`, `AutocompleteField` |
| `types/index.ts` | Barrel export for all types |

Updated pages: `competitor/dogs`, `competitor/results`, `competitor/competitions`, `competitor/register/[id]`, `competitions`, `calendar`, `dog-statistics`, `results/[id]`, `organizer/competition/[id]` (editor, competitors, protocol, measurements, teams).

---

## Centralized constants (2025-08-25)

Extracted all hardcoded magic strings and repeated arrays into a single `src/lib/constants.ts` file. All constants are typed with `as const` for proper type inference.

| Constant | Previously defined in |
|----------|----------------------|
| `SIZES` | `competitor/dogs/page.tsx`, `organizer/competition/[id]/page.tsx` |
| `AGILITY_CLASSES` | `competitor/dogs/page.tsx` |
| `JUMP_CLASSES` | `competitor/dogs/page.tsx` |
| `COMPETITION_CLASSES` | `organizer/competition/[id]/page.tsx` |
| `TRACK_TYPES` | `organizer/competition/[id]/page.tsx` |
| `TRACK_LETTERS` | `organizer/competition/[id]/page.tsx` (was `LETTERS`) |
| `COMPETITION_TYPES` | `organizer/new/page.tsx` |
| `COUNTRIES` | `competitor/profile/page.tsx` |
| `BOOKING_STATUSES` | scattered string literals |
| `COMPETITOR_STATUSES` | scattered string literals |
| `USER_ROLES` | scattered string literals |
| `REG_STATUS_OPEN/CLOSED` | scattered string literals |
| `SIZE_STANDARDS` | scattered string literals |

Exported types: `Size`, `SizeStandard`, `TrackType`, `BookingStatus`, `CompetitorStatus`, `UserRole`.

---

## Competition calendar — ported from vite-event-calendar (2026-08-25)

The yearly competition calendar from the old Vite-based WordPress plugin (`vite-event-calendar`) has been ported into the Next.js app as a standalone page at `/calendar`. Uses pure React with zero external calendar dependencies — the original FullCalendar library was replaced with a custom-built month grid and modal detail view.

The calendar shows all competitions color-coded by status (BOOKED = blue, PENDING = yellow, CLUBEVENT = green) with hover tooltips. Clicking a month opens a modal with a detailed day grid and event list. Clicking a competition navigates to the registration page.

| File | Change |
|------|--------|
| `src/app/calendar/page.tsx` | New — calendar page with yearly grid, month modal, event list |
| `src/app/calendar/calendar.css` | New — all calendar styles (ported from `App.css` + `mediaQuerys.css`, FullCalendar styles replaced with custom modal styles) |
| `src/app/api/bookings/calendar/route.ts` | New — public API endpoint returning bookings with calendar-needed fields (referee, competitionClasses, info) |
| `src/components/NavBar.tsx` | Added "Võistluskalender" link in desktop and mobile nav |
| `src/i18n/translations/et.ts` | Added `navCalendar` translation key |
| `src/i18n/translations/en.ts` | Added `navCalendar` translation key |

---
