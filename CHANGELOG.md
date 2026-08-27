# Changelog

## Public competition pages, and the calendar hand-over that never landed (2026-08-27)

A click in the WordPress calendar showed "registreerimine veel suletud" **and** opened the competition anyway, where the page said "Võistlust ei leitud". Two unrelated bugs wearing one costume.

The app half: `/competitions` and `/competitions/[id]` are public in `src/middleware.ts`, but both fetched `/api/bookings`, which is not. An anonymous visitor got `307 -> /api/auth/signin`, the HTML broke `res.json()`, the silent `catch` left the state null, and the page rendered its empty case. Confirmed against production — `/competitions/2` returned 200 while `/api/bookings/2` returned 307. So the public pages had been broken for logged-out visitors since they were made public; testing while signed in hid it. Part 3 of `calendar-handoff-plan.md` assumed `/competitions/[id]` "is already public and returns 200 anonymously" (finding 4) — true of the page, not of the data behind it.

| Area | File | Change |
|------|------|--------|
| API | `src/app/api/public/competitions/route.ts` (new) | Anonymous competition list, `BOOKED` only, with a computed `registrationOpen` |
| API | `src/app/api/public/competitions/[id]/route.ts` (new) | Anonymous detail for **any** booking — the calendar links to PENDING ones too |
| Page | `src/app/competitions/page.tsx` | Reads the public feed; amber "Ootab kinnitamist" badge for PENDING |
| Page | `src/app/competitions/[id]/page.tsx` | Reads the public feed; status is three-state, not open/closed |
| Page | `src/app/organizer/competition/[id]/page.tsx` | Amber pill in the header while PENDING |
| Page | `src/app/organizer/competition/[id]/SettingsTab.tsx` | Pending notice; reg-status select and save disabled until an admin approves |
| Types | `src/types/booking.ts` | `PublicCompetitionListItem`, `PublicCompetitionDetail` |
| i18n | `src/i18n/translations/{et,en}.ts` | `compRegPending`, `compDetailPending`, `compDetailPendingText`, `compDetailClubEvent`, `compDetailEnded` |

**PENDING was invisible, which made the whole flow unreadable.** Every non-open state rendered as "Registreerimine suletud", so a date reservation waiting on an admin looked like a competition whose organizer had not opened entries yet — a competitor could wait for a registration that was never going to open. The three states are now distinct end to end: organizer creates (PENDING) -> admin approves at `/admin/bookings` (BOOKED) -> organizer opens registration (`reg_open`).

The organizer's Seaded tab disables the registration controls while PENDING rather than letting them be set. `isRegistrationOpen()` refuses anything that is not `BOOKED`, so the setting had no effect anyway — it just looked like it did.

**Wording is split by audience on purpose.** Public surfaces say "Ootab kinnitamist"; only the organizer's own pages name the admin ("Võistlus ootab admini kinnitust"), because that is the person they are waiting on. A `CLUBEVENT` gets no special text at all — it shows the same message as any other entry with nothing to register for.

**`email` and `phone` are now readable anonymously** through the public detail endpoint. Deliberate: `bookingSchema` requires them precisely so they can be published with the competition, and the page already displayed them to any signed-in user. But it is a step from "any account" to "anyone", and the privacy note in Part 2 of `calendar-handoff-plan.md` names these exact fields. Dropping them from the `select` is a one-line change if that trade stops being worth it.

**The other half of the fix is in `../vite-event-calendar`, not this repo.** `mapEvents` spread the API event, and `url` is a FullCalendar built-in: an event carrying it renders as a real `<a href>` and navigates before `eventClick` can stop it. Renamed to `appUrl`, plus a `preventDefault()`. That bundle has to be rebuilt and copied into `booking_calendar/dist/` to take effect — `dist/` is gitignored there, so it does not travel with a commit.

Verified with `npx tsc --noEmit` and `npx next build`, and the calendar with `npm run build`. **Not verified:** the new endpoints against real PENDING and CLUBEVENT rows, and a real click from the WordPress page — the deployed calendar bundle is still the old one. The pre-existing eslint error in `src/app/competitions/page.tsx:18` (`fetchBookings` used before declaration) was left alone; it predates this change.

**Noticed, not fixed:** the legacy WP data uses competition types like `klubimeistrivõistlus` that are not in `COMPETITION_TYPES` (`src/lib/constants.ts:40`). Imported rows will carry a `competitionType` the app never offers. Belongs in `import-old-data-plan.md` as a mapping step.

---

## Deployment docs, and retire REBUILD-PLAN.md (2026-08-26)

Phase 8 was the last thing left in the rebuild plan, so the plan is now a record of finished work. What remains of deployment is documentation, not code: the app is on shared hosting (Zone), where the panel already proxies the subdomain to a local port and PM2 runs the app on it.

| Area | File | Change |
|------|------|--------|
| Docs | `README.md` | Deployment rewritten around the real setup: the per-deploy sequence, where the port actually lives, and the first-deploy checklist |
| Env | `.env.example` (new) | Every variable the app reads, with a note on what breaks without each |
| Git | `.gitignore` | `!.env.example` — the existing `.env*` rule would otherwise have hidden it |
| Docs | `integration-plan.md` | Infrastructure section rewritten: what is already handled by the host, and the four steps left for the cutover |
| Docs | `REBUILD-PLAN.md` | **Deleted** |

**Written and then deleted the same day:** an Nginx config, an Apache/cPanel config, and `ecosystem.config.js`. They configure a proxy and a process manager from scratch, which is a bare-VPS problem — on shared hosting the panel already does it and nothing would ever have read those files. Recorded here because the mistake is easy to repeat: check what the server actually runs before writing config for it.

The port is the one detail that is not in the repo at all. It lives in the panel's proxy rule and in the PM2 start command (`pm2 start npm --name agliit -- start -- -p 3939`), and the two must match. `PORT` in `.env` does not work — `next start` resolves the port before it reads the env file. `NEXTAUTH_URL` and `PUBLIC_APP_URL` stay the public `https://` address either way, since those are what end up in login redirects, reset-mail links, and the calendar feed.

`REBUILD-PLAN.md` described a schema, API and page inventory that `prisma/schema.prisma` and `src/app/` now document more accurately — it had drifted (it still specified jsPDF, which was never used). Everything unfinished in it moved to `integration-plan.md`, and it stays recoverable in git history. The one piece worth not losing — that the registration-close cron was dropped in favour of computing the deadline on read — is recorded in `src/lib/registration.ts`, in decision D2 of `calendar-handoff-plan.md`, and in this changelog.

**Still needs a person, not a commit:** on the production server, `npx prisma db push` (login breaks without the new column) and the `SMTP_*` settings.

---

## Finish the rebuild plan: rich text, drag & drop, confirmation page (2026-08-26)

The three features `REBUILD-PLAN.md` still listed as unbuilt, plus a phase that should never be built.

| Area | File | Change |
|------|------|--------|
| Rich text | `src/components/ui/RichTextEditor.tsx` (new), `@tiptap/*` | Tiptap editor for competition descriptions: bold, italic, heading, lists, links |
| Rich text | `src/app/organizer/competition/[id]/InfoTab.tsx` | The EST/ENG description textareas became rich text editors |
| Rich text | `src/app/globals.css` | Styles for `.prose` — the markup already used those class names, but the Tailwind typography plugin is not installed, so lists and headings rendered unstyled |
| Drag & drop | `src/app/organizer/competition/[id]/protocol/page.tsx` | Start protocol rows can be dragged into order; start numbers renumber to match. The up/down buttons and the inline number field still work |
| Page | `src/app/competitor/registered/[id]/page.tsx` (new) | Post-registration confirmation, showing the dog and tracks entered |
| Page | `src/app/competitor/register/[id]/page.tsx` | Lands on that page after registering, instead of the competitions list |
| i18n | `src/i18n/translations/{et,en}.ts` | Five `registered*` keys |
| Plan | `REBUILD-PLAN.md` | Phase 7 (cron) marked **DROPPED**; a status table added at the top |

**Phase 7 was dropped, not implemented.** It called for a daily job flipping `reg_status` to `reg_closed`. The deadline is computed on read in `src/lib/registration.ts` instead, so there is no scheduler and no second clock to disagree with the app. Building the cron now would reintroduce the drift that removed.

Descriptions were already rendered as HTML on the public competition page (`dangerouslySetInnerHTML`), so the editor changes what organizers can write, not how it displays. Note that the field is still trusted: an organizer posting to the API directly can put arbitrary HTML in it. Server-side sanitising is worth adding if that trust ever feels too broad.

Verified with `npx tsc --noEmit`, `npx eslint src` and `npx next build`. **Not verified:** dragging a row and saving the reordered protocol against a live database, and the confirmation page with real entries — both need a working DB.

---

## Drop the set-role script (2026-08-26)

The first admin is promoted with a direct `UPDATE` on the `users` table instead of a CLI script. Same operation, same access required, one less thing to maintain — and it is a one-time step, since every later role change happens at `/admin/users`.

| Area | File | Change |
|------|------|--------|
| CLI | `scripts/set-role.ts` | Deleted |
| Docs | `README.md` | The roles section now shows the SQL |
| Docs | `admin-page-plan.md` | Part C bootstrap is a database update, not a script |

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.ee';
```

The guards that mattered are on the endpoint, not the script: `/api/admin/users/{id}/role` still refuses to let an admin change their own role or demote the last remaining admin. Recovering from zero admins now means the same `UPDATE`.

---

## Password reset, admin users page, session revocation (2026-08-26)

Steps 3–8 of `admin-page-plan.md`. The app had no way to reset a password since the move off WordPress — and `scripts/migrate-data.ts` gave every imported user the same temporary password, so this was the missing half of that migration.

| Area | File | Change |
|------|------|--------|
| Mail | `src/lib/mail.ts` (new), `nodemailer` dependency | SMTP wrapper. Throws in production when unconfigured; logs the message in development so the flow works with no mail server |
| Schema | `prisma/schema.prisma` | `PasswordResetToken` (sha256 hash only, 1 hour, single use) and `User.passwordChangedAt` |
| Tokens | `src/lib/password-reset.ts` (new) | Issue and mail a link; consume a token and set the password. Callers never receive the token |
| Limits | `src/lib/rate-limit.ts` (new) | In-process fixed-window limiter, keyed per address and per caller |
| API | `src/app/api/auth/forgot-password/route.ts` (new) | Identical answer for known and unknown addresses — no account enumeration |
| API | `src/app/api/auth/reset-password/route.ts` (new) | Consumes the token; unknown, expired and used all fail the same way |
| API | `src/app/api/auth/change-password/route.ts` (new) | Signed-in change, current password required |
| API | `src/app/api/admin/users/route.ts`, `[id]/role`, `[id]/password-reset` (new) | Users list, role change with guards, admin-triggered reset |
| Pages | `src/app/forgot-password`, `src/app/reset-password` (new) | Public, added to the middleware allow-list; "Unustasid parooli?" now links from `/login` |
| Pages | `src/app/admin/users/page.tsx`, `src/components/AdminTabs.tsx` (new) | Users screen and the admin tab bar |
| Profile | `src/components/ChangePasswordCard.tsx` (new), `competitor/profile` | Change your own password without email |
| Session | `src/lib/auth.ts`, `src/lib/api-auth.ts`, `src/middleware.ts`, `src/types/next-auth.d.ts` | The JWT is re-checked against the database on refresh |
| Removed | `scripts/seed-organizer.js` | Replaced by `/admin/users`; it hardcoded a password |

**An admin can start a reset but never finish one.** The link goes to the user's own address, the response carries no token, and no route lets anyone but the account holder choose a password.

**Session revocation.** The role and the password live outside the token, so the `jwt` callback now re-reads them: a role change applies on the next session refresh, and a password change marks every token issued earlier as revoked — the middleware refuses it and `requireAuth()` returns 401. NextAuth v4 requires a token back from the callback, so revocation is a flag on the token rather than a null return. Changing your own password therefore signs you out, which the UI says plainly before redirecting to `/login`.

Verified with `npx tsc --noEmit`, `npx eslint src` (still 32 pre-existing problems, none in the new files) and `npx next build`. Against a dev server: the reset pages return 200 while logged out, `/admin/users` and `/api/admin/users` 307 anonymous callers, `forgot-password` returns the same message for an unknown address, and password validation rejects a short or mismatched password.

**Before deploying:** `npx prisma db push` (or a migration) for the new table and column, and set the `SMTP_*` variables. **Not verified:** every database path — MySQL is not running on this machine, so no reset link has actually been issued, mailed, or consumed end to end.

---

## Admin bookings page and role script (2026-08-26)

Steps 1 and 2 of `admin-page-plan.md`: the wp-admin bookings table (`../reactAdminPage`) now exists in the app, and there is a way to create the first ADMIN. `/admin` was linked in the NavBar and guarded by the middleware but had no route at all — clicking "Admin" 404'd.

| Area | File | Change |
|------|------|--------|
| CLI | `scripts/set-role.ts` (new) | `npx tsx scripts/set-role.ts <email> ADMIN`, plus `--list [ROLE]`. Refuses to demote the last ADMIN. *(Removed again later the same day — see the entry above.)* |
| Route | `src/app/admin/page.tsx` (new) | `/admin` redirects to `/admin/bookings` |
| Page | `src/app/admin/bookings/page.tsx` (new) | Bookings table: status filter, page size, approve, delete |
| Page | `src/app/admin/bookings/BookingRow.tsx`, `types.ts` (new) | Row rendering and the filter/page-size constants |

Approving (`PENDING -> BOOKED`) calls the existing ADMIN-only `PATCH /api/bookings/{id}/status`; deleting calls `DELETE /api/bookings/{id}`, which already refuses when competitors are registered. Editing links to the organizer's competition editor rather than duplicating an inline-edit form, and "Lisa võistlus või klubiüritus" reuses `/organizer/new`, where the status picker is admin-only since the approval guard landed. No new API surface.

Password reset is deliberately **not** an admin power: an admin cannot see, set, or trigger a password change. Self-service reset is Part D of the plan and needs a mail transport the app does not have yet.

Verified with `npx tsc --noEmit`, `npx next build`, and `npx eslint src` — still 32 problems, all pre-existing, none in the new files. The data-loading effect is written to avoid the `set-state-in-effect` error the rest of the codebase trips: `loadBookings()` returns rows and never sets state.

**Not verified:** anything that talks to the database. MySQL is not running on this machine, so the table, the approve/delete actions, and `set-role.ts` past its argument parsing are untested against real data.

---

## Registration deadline and booking approval guards (2026-08-26)

Groundwork from `calendar-handoff-plan.md` Part 6, pulled forward because the public calendar feed depends on it. Full admin-page plan now lives in `admin-page-plan.md`.

| Area | File | Change |
|------|------|--------|
| Shared rule | `src/lib/registration.ts` (new) | `isRegistrationOpen()` — one implementation of open/closed, used by the public feed and the entry endpoint |
| Feed | `src/app/api/public/calendar/route.ts` | Uses the shared helper instead of its own copy |
| Entries | `src/app/api/competitors/route.ts` | Was checking only `regStatus === "reg_closed"`; now applies the full rule, so a competition past its `regCloseDate` stops accepting entries |
| Approval | `src/app/api/bookings/route.ts` | A non-admin's new booking is always `PENDING` — the status field is no longer taken from the request body |
| Approval | `src/app/api/bookings/[id]/route.ts` | `status` is only applied when the caller is an ADMIN; the owner keeps every other field |
| UI | `src/app/organizer/new/page.tsx` | The status picker (Ootel / Kinnitatud / Klubiüritus) renders for admins only |

**Why:** the hourly WordPress cron (`bookingRegStatusCron.php`) was the only thing that closed registration when a deadline passed, and it ran against the WordPress database — which the bookings left. Nothing had owned that transition since. Computing it on read closes the hole without a scheduler, but only if the entry endpoint applies the same rule; otherwise the calendar would show "closed" while the API kept accepting entries.

Roles now match the WordPress split they always had: the organizer opens and closes registration, the admin approves `PENDING → BOOKED` and files club events, the competitor enters. Empty `regStatus` still counts as open, matching the old PHP check, so migrated rows with a NULL behave as before.

Verified with `npx tsc --noEmit`, `npx eslint src` (no new problems) and `npx next build`. Not verified against real rows — MySQL is not running on this machine.

---

## Public calendar API for WordPress (2026-08-26)

Part 2 of `calendar-handoff-plan.md`: the WordPress calendar on agilityliit.ee now has an endpoint it can actually read. Previously `/api/bookings/calendar` sat behind the auth middleware, so an anonymous cross-origin caller got `307 → /api/auth/signin` and no data at all.

| Area | File | Change |
|------|------|--------|
| Endpoint | `src/app/api/public/calendar/route.ts` (new) | `GET /api/public/calendar`, optional `?year=`; returns the finished `CalendarEvent[]` shape so the WP bundle needs no mapping |
| Endpoint | `src/app/api/bookings/calendar/route.ts` | Deleted — replaced by the above; it had no consumer left after the calendar page was removed, and WordPress still reads its own `wp-json` route until Part 4 |
| CORS | `src/lib/cors.ts` (new) | Origin allow-list (`agilityliit.ee`, `www.agilityliit.ee`, override with `PUBLIC_ALLOWED_ORIGINS`) plus an `OPTIONS` preflight helper |
| Middleware | `src/middleware.ts` | `/api/public` added to the public route list — one prefix for the whole external surface |
| Types | `src/types/booking.ts` | `CalendarEvent` gains `organizerName`, `regCloseDate`, `registrationOpen`, `url`, and a comment marking it an external contract |
| Docs | `README.md` | Documented the optional `PUBLIC_APP_URL` and `PUBLIC_ALLOWED_ORIGINS` env vars |

`registrationOpen` is computed per request from `status`, `regStatus`, `regCloseDate` and `endDate`, so the retired WP `bookingRegStatusCron.php` has no successor to write and the two systems cannot disagree about the clock (decision D2 in the plan). `url` points at the public `/competitions/{id}` page rather than the protected registration form (decision D1) — it works for anonymous visitors and links onward to registration.

Responses carry `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`; error responses deliberately do not, since a cached 500 would blank the WP calendar for the whole TTL. The `select` is the privacy allow-list — `email`, `phone` and `userId` are not in it and must not be added.

Verified with `npx tsc --noEmit`, `npx eslint src` (no new problems) and `npx next build`. Against a running dev server: the route no longer 307s, an allowed `Origin` is echoed back in `Access-Control-Allow-Origin` while an unknown one is not, `OPTIONS` returns 204 with `GET, OPTIONS`, `?year=abc` returns 400, and no error response carries the cache header.

**Not verified:** the success path with real rows — MySQL is not running on this machine (`Can't reach database server at localhost:3306`), so every DB-backed route returns 500 locally. Worth a re-check against a live DB before the WP side is pointed at it.

**Also done:** `npx prisma generate` — the generated client still resolved the query engine through the pre-rename path `agility project/agilityliit/...` and failed before it ever reached the database.

---

## Remove the calendar page from the app (2026-08-26)

The competition calendar goes back to being a WordPress part of `agilityliit.ee` (the existing `booking_calendar` plugin). Inside the app it was also pointless: `/calendar` sat behind the auth middleware, so the anonymous visitors it was meant for could never reach it. Full handover plan in `calendar-handoff-plan.md` — this commit is Part 1 of it.

| Area | File | Change |
|------|------|--------|
| Page | `src/app/calendar/page.tsx`, `src/app/calendar/calendar.css` | Deleted |
| Nav | `src/components/NavBar.tsx` | Dropped the "Võistluskalender" desktop and mobile links |
| Nav | `src/components/NavBar.tsx` | Logo when logged out → `WP_SITE_URL` (agilityliit.ee, the real front page); logout `callbackUrl` → `/competitions` |
| Redirect | `src/lib/home-path.ts` | Fallback for a session with no known role `/calendar` → `/competitions`; added `WP_SITE_URL` |
| 403 | `src/app/not-allowed/page.tsx` | "Back" button → `/competitions` |
| Middleware | `src/middleware.ts` | Removed the `/calendar` public-route entry |
| i18n | `src/i18n/translations/{et,en}.ts` | Removed `navCalendar` (`regClosedText` stays — the registration page uses it) |

**Kept on purpose:** `src/app/api/bookings/calendar/route.ts` and the `CalendarEvent` type. They stop being internal and become the contract the WordPress calendar reads; both are commented as such.

Verified with `npx tsc --noEmit`, `npx eslint src`, and `npx next build` — clean, no new lint problems, and the route table no longer lists `/calendar` (only the API endpoint remains).

**Not changed:** that endpoint is still blocked by the middleware for anonymous callers (`307 → /api/auth/signin`), so WordPress cannot read it yet — that is Part 2 of the plan.

---

## Remove app front page (2026-08-26)

The app lives under `agilityliit.ee`, which is the real front page — its "Logi sisse" and "Registreeru" buttons link straight into this app's login and register pages. The marketing landing page at `/` (hero, "Vaata võistlusi"/"Registreeru" buttons, three feature cards) duplicated that entry point, so it is gone. `/` is now a session-only redirect and renders nothing.

| Area | File | Change |
|------|------|--------|
| Root route | `src/app/page.tsx` | Client landing page → server component that reads the session and redirects: no session → `/login`, `COMPETITOR` → `/competitor`, `ORGANIZER`/`ADMIN` → `/organizer` |
| Role mapping | `src/lib/home-path.ts` (new) | `homePathForRole()` — single source for role → landing route |
| Nav | `src/components/NavBar.tsx` | Logo links to the role's page when logged in, `/calendar` when not; logout `callbackUrl` `/` → `/calendar` |
| 403 | `src/app/not-allowed/page.tsx` | "Back" button `/` → `/calendar` |
| Middleware | `src/middleware.ts` | Added `/calendar` to the public route list |
| i18n | `src/i18n/translations/{et,en}.ts` | Dropped the now-dead `home*` keys and their section comment |

`/calendar` is the logged-out fallback rather than `/login` so that clicking the logo while browsing a public page (competitions, results, statistics) does not bounce a visitor into login. It was protected by middleware before, which would have broken it in that role — hence the public-route addition.

Verified with `npx tsc --noEmit` and `npx next build` — clean; `/` now builds as a dynamic route, as expected for a session-dependent redirect.

**Not changed:** login still does `router.push("/")` after sign-in and relies on the new redirect for the final hop, and the nav still shows "Logi sisse"/"Registreeru" for anonymous visitors.

---

## Rename to agliit (2026-08-26)

Renamed the app and its identifiers from `agilityliit`/`agiliit` to `agliit`, matching the new domain. The federation's WordPress site keeps its own domain `agilityliit.ee` — the app moves to the `agliit.agilityliit.ee` subdomain under it.

| Area | File | Change |
|------|------|--------|
| Package | `package.json`, `package-lock.json` | `agility-nextjs-temp` → `agliit` |
| Database | `.env`, `scripts/migrate-data.ts`, `README.md` | Target DB → `agliit` (was inconsistent: `.env` said `agiliit`, README and migration script said `agilityliit`) |
| Domains | `.env`, `integration-plan.md` | Test URL → `agliit.webcodes.ee`, production → `agliit.agilityliit.ee` |
| Docs | `README.md`, `REBUILD-PLAN.md` | Live URL, deploy target, env examples, folder tree |

`agility` on its own is the sport, not the brand, so `agilityClass` in the Prisma schema, `AGILITY_CLASSES`, and all domain terminology in `src/**` are untouched. The displayed federation name ("Eesti Agility Liit" / "Estonian Agility Association" in `layout.tsx` and the i18n translations) is also unchanged — that is the organisation's real name, not the app's.

Verified with `npx tsc --noEmit` and `npm run build` — clean, all routes unchanged.

**Not changed (needs manual steps):** the MySQL database itself still has its old name — MySQL has no `RENAME DATABASE`, so it needs a dump/restore or a fresh `prisma db push`. The GitHub repo rename and the `git remote set-url` that follows it, and the local folder rename, are also outstanding.

---

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
