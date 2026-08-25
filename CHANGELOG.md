# Changelog

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
