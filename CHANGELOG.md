# Changelog

## Split large page files (2026-08-26)

Broke up the four largest page components listed in `refactoring-plan.md`. Components are co-located next to their route — in App Router only `page.tsx`/`route.ts` become routes, so sibling files are safe.

| Page | Lines | Extracted |
|------|-------|-----------|
| `competitor/dogs/page.tsx` | 666 → 211 | `DogCard.tsx` (incl. `DetailItem`), `DogForm.tsx` |
| `organizer/competition/[id]/page.tsx` | 687 → 289 | `InfoTab.tsx` (incl. `InfoRow`, `FormField`), `TrackForm.tsx`, `TrackTable.tsx`, `SettingsTab.tsx` |
| `organizer/competition/[id]/competitors/page.tsx` | 349 → 206 | `CompetitorTable.tsx`, `ExportButton.tsx` |
| `results/[id]/page.tsx` | 555 → 177 | `types.ts`, `TrackResultCard.tsx`, `resultsPdf.ts` |

Beyond moving markup, tab-local state moved into the component that owns it: `TrackForm` owns the new-track form, `SettingsTab` owns the registration settings, `InfoTab` owns the edit/description state, and `TrackTable` absorbed the group-by-date logic. Pages now hold only fetch and mutation handlers. The seven subpage nav links in the competition editor collapsed into a `SUBPAGES` array.

Verified with `npx tsc --noEmit`, `npx eslint src`, and `npx next build` — no new errors or warnings, all 33 routes unchanged.

**Not changed:** the `set-state-in-effect` lint error in `DogCard.tsx` (moved verbatim — fixing it is a behavior change, not a move).

---

## Reusable UI components (2026-08-25)

Created shared UI components in `src/components/ui/` to replace duplicated patterns across pages.

| Component | Replaces | Files updated |
|-----------|----------|---------------|
| `MessageBanner` | Inline `{message && <div className={...}>}` success/error banners | 8 page files |
| `LoadingSkeleton` | Inline `animate-pulse` skeleton loading blocks | 9 page files |
| `StatusBadge` | Local `StatusBadge` functions with status-to-color mapping | 2 page files |

Skipped: `ConfirmModal` (all pages use native `window.confirm()` — no benefit), `PageHeader` (patterns too varied across pages).

---

## Utility helpers (2026-08-25)

Created `src/lib/utils.ts` with shared utility functions to replace duplicated logic across pages.

| Helper | Replaces | Files updated |
|--------|----------|---------------|
| `formatDate(dateStr, locale?)` | Local `formatDate` functions with `toLocaleDateString` | 13 page files |
| `sortResults(competitors)` | Duplicated DNS/DSQ/time/faults sort logic | `results/[id]/page.tsx` (2 instances) |

---

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
