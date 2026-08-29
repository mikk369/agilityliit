# Changelog

## Sponsor logos are back, stored by this app rather than by WordPress (2026-08-29)

`competition_info.sponsor_image_urls` held logos that nothing here could add, remove or show. The WordPress editor uploaded them to the media library and stored `{ id, url, size }`; there is no media library in this app, so the bytes now go to a directory on the server and the stored entry keeps that exact shape — rows carried over from production still read, and still render, without touching the data.

| File | Change |
|------|--------|
| `src/lib/sponsor-images.ts` | New — the limits, the S/M/L sizes, and `readSponsorImages()`, which validates rows written by either app and drops duplicates and junk |
| `src/lib/sponsor-storage.ts` | New — the upload directory, the generated file name, and the name check. Separate because the module above is imported by the browser too, where `fs` cannot go |
| `src/app/api/sponsor-images/route.ts` | New — POST uploads (organizer or admin, 2 MB, images only); GET lists the logos the organizer has used on their other competitions |
| `src/app/api/sponsor-images/[file]/route.ts` | New — serves a stored file, publicly and immutably |
| `src/app/organizer/competition/[id]/SponsorImagesPanel.tsx` | New — upload, pick from earlier competitions, set each logo's size, remove; under Põhiinfo |
| `src/app/competitions/[id]/page.tsx` | The logos above the description, at the widths the WordPress stylesheet used |
| `src/app/api/public/competitions/[id]/route.ts`, `src/types/booking.ts` | The public detail carries `sponsorImages` |
| `src/lib/validations.ts` | The stored entry is `{ id: string \| number, url, size: S \| M \| L }` — the previous shape (`id` string-only, `size` a number) would have rejected every migrated row on save |
| `src/middleware.ts` | `/api/sponsor-images/<file>` is public; the collection route above it checks the session itself |
| `.gitignore`, `.env.example`, `README.md` | `SPONSOR_UPLOAD_DIR`, defaulting to `./uploads/sponsors`, and that directory ignored |

Uploading and attaching are deliberately separate steps, as they are in the WordPress editor: the file is stored on upload, but only reaches a competition when the list is saved.

Removing a logo unlinks it from the competition and leaves the file alone — the same `force_delete_media=false` the old app used. It stays available in "Vali varasematest", which is what makes next season's competition a two-click job.

The gallery is built from the organizer's own competitions rather than a site-wide library, which covers the case the library served: the same club, the same sponsors, next year. An admin sees all of them.

File names are generated, never taken from the upload, and are validated against a strict pattern before being joined onto the upload directory, so a crafted name cannot read anything else on the server.

Verified with `npx tsc --noEmit`, `npx eslint` and `npx next build`. `readSponsorImages()` and the file-name check were exercised directly: path traversal, a WordPress row with a numeric id, a local row, a duplicate and malformed entries all behave. **Unverified:** the upload itself — no file has been written or served, and `DATABASE_URL` (localhost:3306) refuses connections from here, so nothing has been saved onto a competition.

---

## Adding a track covers every size group at once (2026-08-29)

A track is stored per size, so "Saturday's B track, H2, for all five sizes" meant five trips through the add form, picking the letter by hand each time and getting it wrong when a day already had tracks. The WordPress editor asks once: a row carries a size multi-select and is expanded on save, all sizes sharing the row's letter.

| File | Change |
|------|--------|
| `src/app/organizer/competition/[id]/TrackForm.tsx` | Adding shows size checkboxes (all ticked to start) and reports `NewTracksData`; editing keeps its single-size select. The letter defaults to the first free one for the chosen day and follows the day when it changes, and a lone referee is preselected |
| `src/app/organizer/competition/[id]/page.tsx` | `handleAddTracks` posts one track per ticked size, and knows which letters each day already uses |

The button says how many tracks it will create ("Lisa 5 rada"), and cannot be pressed with no size ticked.

If some sizes fail, the ones that were created stay: the table reloads either way and the message names the sizes that did not go through, rather than claiming the whole row failed.

Editing is deliberately untouched — a stored track is one size, and changing which size an existing track is for is a different act from creating five.

Verified with `npx tsc --noEmit`, `npx eslint` and `npx next build`. **Unverified:** against a running database — `DATABASE_URL` (localhost:3306) refuses connections from here, so no row has actually been expanded.

---

## A track can be corrected instead of deleted and re-added (2026-08-29)

`/api/competitions/[id]/tracks` had GET, POST and DELETE. Fixing a referee or an officiality meant deleting the track and adding it again — and a track with entries cannot be deleted at all, so after registration opened a wrong value was simply stuck. Deleting also takes its results, protocol rows and team results with it.

| File | Change |
|------|--------|
| `src/app/api/competitions/[id]/tracks/route.ts` | New PATCH: owner or admin, every field optional, and the track is checked against the booking in the URL |
| `src/lib/validations.ts` | `competitionTrackUpdateSchema` — the track schema partial, plus the required `trackId` |
| `src/app/organizer/competition/[id]/TrackForm.tsx` | Takes an optional `initial`, and titles itself "Muuda rada" when it has one |
| `src/app/organizer/competition/[id]/TrackTable.tsx` | A "Muuda" button beside "Kustuta" |
| `src/app/organizer/competition/[id]/page.tsx` | Holds the track being edited and PATCHes it |

The track is addressed by its own id, so PATCH re-checks that it belongs to the booking in the URL — owning one competition must not be enough to edit another's tracks.

The edit form is keyed by track id, so opening a second track while one is open shows that track's values rather than the first one's.

Verified with `npx tsc --noEmit`, `npx eslint` and `npx next build`. **Unverified:** against a running database — `DATABASE_URL` (localhost:3306) refuses connections from here, so no track has actually been edited.

---

## The competition's referees can be edited again, and the forms offer them (2026-08-29)

Referees could only be typed when the competition was created; afterwards the Põhiinfo tab printed them read-only, and every form that wanted a judge asked for free text. `PATCH /api/bookings/[id]` had accepted `referee` all along — there was no screen sending it. The result was the same judge spelled three ways across one competition, which the dog-statistics judge filter reads as three judges.

| File | Change |
|------|--------|
| `src/components/ui/RefereeList.tsx` | New — the add/remove/rename list, plus `refereeOptions()` which trims blanks and duplicates out of the stored JSON |
| `src/app/organizer/new/page.tsx` | Uses the shared list; its own three handlers are gone |
| `src/app/organizer/competition/[id]/InfoTab.tsx` | The edit form carries the referees, saved with the rest of the booking |
| `src/app/organizer/competition/[id]/TrackForm.tsx` | The referee is picked from the competition's list |
| `src/app/organizer/competition/[id]/page.tsx` | Passes the list to the track form |
| `src/app/organizer/competition/[id]/measurements/page.tsx` | Same dropdown, and a lone referee is preselected — one judge usually measures the whole day |

Both dropdowns fall back to a text field while the competition has no referees on file, so a competition imported without them is not stuck.

Blank rows are dropped on save: an empty input is a row the organizer has not filled in yet, never a referee named "".

Verified with `npx tsc --noEmit`, `npx eslint` and `npx next build`. **Unverified:** against a running database — `DATABASE_URL` (localhost:3306) refuses connections from here, so no referee list has been round-tripped.

---

## The per-day start limit is back, and this time it is enforced (2026-08-29)

`max_competitors_per_day` had a column, a Zod field and a route that stored it — and no screen to set it, no count to compare it against, and no check anywhere. `POST /api/competitors` asked only whether registration was open, so a day the organizer had capped in the WordPress app kept taking entries here.

| File | Change |
|------|--------|
| `src/lib/capacity.ts` | New — the day key, the competition's day list, the stored limits read defensively, and the per-day count of entries |
| `src/app/api/competitions/[id]/capacity/route.ts` | New — `{ dates, maxPerDay, registeredPerDay }`, so the editor and the entry form show the numbers the API enforces |
| `src/app/api/competitors/route.ts` | An entry onto a full day is refused with 409 |
| `src/app/organizer/competition/[id]/MaxPerDayPanel.tsx` | New — the limit per day with `registered/max` and spots left, under Seaded |
| `src/app/organizer/competition/[id]/page.tsx` | Renders the panel above the registration settings |
| `src/app/competitor/register/[id]/page.tsx` | Each day carries its spots counter; a full day's tracks are disabled, and a day that fills while the form is open is dropped from the entry rather than failing it |
| `src/i18n/translations/*.ts` | `regSpotsFilled`, `regSpotsLeft`, `regDayFull` |

An entry counts once per day it has a track on, however many tracks that is — the limit is on starters per day, not on runs. Entries still PENDING count too: they are holding the spot until the organizer decides.

The day a track belongs to comes from the track's own `competition_date`, not from the single `competitionDate` the entry form posts, so an entry spanning two days takes a spot on each.

Saving the limits posts only `maxCompetitorsPerDay`, which the info route now treats as a partial update — the descriptions are left alone.

Verified with `npx tsc --noEmit`, `npx eslint` and `npx next build`. **Unverified:** against a running database — `DATABASE_URL` (localhost:3306) refuses connections from here, so no day has actually been filled and refused.

---

## Registration can no longer be "opened" behind a deadline that has passed (2026-08-29)

The settings tab let the organizer set the status to Avatud while the closing date was in the past. `isRegistrationOpen()` still answered "closed", so the save reported "Registreerimise seaded salvestatud!" and no entrant could register — the organizer had no way to tell the setting had done nothing. The WordPress app refuses the same combination (`useRegistrationStatus.ts`: "Sulgemise kuupäev peab olema tulevikus").

| File | Change |
|------|--------|
| `src/lib/registration.ts` | New `isRegCloseDatePast()` and `REG_CLOSE_DATE_PAST_ERROR`, sharing the deadline rule with `isRegistrationOpen()` — the deadline day itself still counts as open |
| `src/app/api/bookings/[id]/route.ts` | An open status over an expired deadline is refused with 400. Only checked when the request touches `regStatus` or `regCloseDate`, so editing an old competition's other details still works |
| `src/app/organizer/competition/[id]/SettingsTab.tsx` | Save is disabled with the reason under the date field; a competition already sitting in that state says why entries stopped and what to do |

Closing registration on a past competition is untouched — the rule only applies to a status that is not `reg_closed`.

Verified with `npx tsc --noEmit`, `npx eslint` and `npx next build`. **Unverified:** against a running database — `DATABASE_URL` (localhost:3306) refuses connections from here, so neither the 400 nor the disabled save has been exercised end to end.

---

## Saving a description no longer blanks the sponsors and day limits (2026-08-29)

`POST /api/competitions/[id]/info` wrote all four of its fields on every request. The organizer info page sends only `descriptionEst` and `descriptionEng`, so the route filled in `Prisma.JsonNull` for the other two and every save of a description wiped `sponsor_image_urls` and `max_competitors_per_day` — including the values carried over from the production database, which nothing in this app has a screen for yet.

| File | Change |
|------|--------|
| `src/app/api/competitions/[id]/info/route.ts` | The upsert is built from the fields the request actually carried; an absent field is left untouched |
| `src/lib/validations.ts` | The four fields are `.nullable().optional()`, so an explicit `null` is how a caller clears one |

Clearing a JSON field now writes `Prisma.DbNull` — a real SQL NULL, the same state a fresh row has — rather than a JSON `null` literal in the column.

This is the shape the panels still to be built need: the sponsor manager and the per-day limits will each save on their own without disturbing the descriptions.

Verified with `npx tsc --noEmit`, `npx eslint` and `npx next build`. **Unverified:** against a running database — `DATABASE_URL` (localhost:3306) refuses connections from here, so no save has actually been round-tripped.

---

## Vaccination deadlines now greet the competitor at login (2026-08-29)

A competitor had to open Minu koerad and expand a dog to notice that a vaccination had run out — nothing told them otherwise, and an expired vaccination is caught at the competition instead. Logging in to the competitor area now raises the same modal the production app shows: the dogs whose üldvaktsiin or marutaudivaktsiin has expired or expires within 5 days, each with its date.

| File | Change |
|------|--------|
| `src/lib/vaccination.ts` | New — `VACCINATION_WARNING_DAYS` (5), `vaccinationStatus()` (missing / expired / expiring / valid) and `dogsNeedingVaccination()`, the one place the dates are judged |
| `src/components/VaccinationWarningModal.tsx` | New — the modal; fetches `/api/dogs/me`, and also exports `clearVaccinationWarningSeen()` |
| `src/app/competitor/layout.tsx` | New — mounts the modal over the competitor area, where `homePathForRole` lands a competitor after login |
| `src/components/NavBar.tsx` | Both sign-out buttons clear the seen flag |
| `src/app/competitor/dogs/DogCard.tsx` | Its own `isExpired` / `isSoonExpiring` replaced by `vaccinationStatus()`; the 30-day badge threshold is now the named `DOG_CARD_VACC_SOON_DAYS` |
| `src/i18n/translations/*.ts` | `vaccWarning*` keys and a shared `close` |

It fires once per browser session, keyed by user id in `sessionStorage`, so it does not reappear on every page the handler opens afterwards. `sessionStorage` outlives a logout within the same tab, so signing out clears the flag — otherwise the next person to log in on that browser would be shown nothing.

The two thresholds are deliberately different. The dog card keeps colouring a vaccination yellow 30 days out; the modal interrupts, so it waits until 5 days, which is what the production wording promises.

Dogs with no vaccination date at all are left out of the modal. They have no deadline to warn about, and the dogs page already prints them red as "Puudub".

Verified with `npx tsc --noEmit`, `npx eslint` and `npx next build`. **Unverified:** in a browser against a logged-in competitor — `DATABASE_URL` (localhost:3306) refuses connections from here, so the modal has not been seen on screen.

---

## Both migrations are applied (2026-08-29)

`scripts/migration-2026-08-28.sql` has been run in full against the database.

- Part 1 — `SELECT id, nick_name, size_est FROM dogs WHERE size_est IN ('XS','S','M','SL','L')` returns no rows, so no dog is left holding a bare size code.
- Part 2 — the columns are `bookings.competition_officiality` and `competition_tracks.officiality`; the schema was pointed at them in the entry below, which is what cleared the `{"error":"Serveri viga"}` on registering a competition.

Still open, both needing a reachable `DATABASE_URL` and neither affecting how the app runs:

- `npx prisma migrate resolve --applied 0_init`, after the drift check in `prisma/migrations/README.md`. Until it runs, `prisma migrate deploy` against that database would try to create tables that already exist.
- Bookings still holding `Ametlik võistlus`, which is not one of the six võistlustüüp values the form now offers — it displays, but cannot be re-picked when editing. `UPDATE bookings SET competition_officiality = 'Rahvuslik võistlus' WHERE competition_officiality = 'Ametlik võistlus';` when you have decided that is the right target. `Mitteametlik võistlus` is in the list and needs nothing.

No code changed. This entry records what the database now looks like, because the two entries below say the migrations had not been run.

---

## The renamed columns are live (2026-08-28)

`scripts/migration-2026-08-28.sql` part 2 has been run: `bookings.competition_type` is now `competition_officiality` and `competition_tracks.competition_type` is now `officiality`. The schema's `@map`s still pointed at the old names, so every booking and track query hit a column that no longer existed and the routes answered `{"error":"Serveri viga"}`.

| File | Change |
|------|--------|
| `prisma/schema.prisma` | The two `@map`s point at the new columns |
| `prisma/migrations/0_init/` | New — baseline describing the database as it now stands, generated from the schema |
| `prisma/migrations/README.md` | New — how to finish the baseline (`migrate resolve --applied 0_init`) and how to write a rename migration without losing the column |

The baseline is only files. `npx prisma migrate resolve --applied 0_init` still has to run against each database, and needs a reachable `DATABASE_URL`; until it does, `prisma migrate deploy` on that database would try to create tables that already exist. The README carries both commands and the drift check to run first.

Verified with `npx tsc --noEmit` and `npx next build`. **Unverified:** against a running database — `DATABASE_URL` (localhost:3306) refuses connections from here, so the fix is confirmed by the column names alone, not by a request that succeeded.

---

## `competition_type` meant two different things in two tables (2026-08-28)

`bookings.competition_type` is the võistlustüüp — CACIAG, Rahvuslik võistlus, Tõuühingu meistrivõistlus. `competition_tracks.competition_type` is ametlik / mitteametlik. One name, two unrelated fields, which is what put the class and the officiality in the wrong columns once already (see the 2026-08-27 entry below). They are now read under names that say which is which: `officiality` on a track, `competitionOfficiality` on a booking. `competition_tracks.track_type` is unchanged — it holds the class (A1 / H1 / Open A / tunnelid) and was already right.

The labels were inverted too: the public competition table printed `trackType` under "Tüüp" and the officiality under "Klass", and the organizer's track table did the same.

| File | Change |
|------|--------|
| `prisma/schema.prisma` | `CompetitionTrack.officiality` and `Booking.competitionOfficiality`, both still `@map`ed to `competition_type` until the migration runs |
| `src/lib/constants.ts` | `COMPETITION_TYPES` → `COMPETITION_OFFICIALITY`, now carrying production's six võistlustüüp values from organizerPage's RegisterBookings; every section names the column it belongs to |
| `src/lib/validations.ts` | `officiality` / `competitionOfficiality`; the three track messages each name their own field |
| `src/i18n/translations/*.ts` | `compDetailCompClass` / `compDetailSizeGroup` / `compDetailOfficiality`; `regTrack` takes class, size and officiality in that order |
| `TrackForm.tsx`, `TrackTable.tsx`, `competitions/[id]/page.tsx` | Võistlusklass / Suurusrühm / Võistlustüüp, each over the field it describes |
| `InfoTab.tsx`, `organizer/new/page.tsx` | The booking label is Võistlustüüp, one word, as production spells it |
| `scripts/migration-2026-08-28.sql` | New — renames the columns to `competition_officiality` and `officiality` |

`/api/public/calendar` still emits the `competitionType` key: the WordPress calendar on agilityliit.ee reads it, so that contract keeps the old name while the value comes from `competitionOfficiality`.

The two fields deliberately share one label, "Võistlustüüp". The comment above `TRACK_OFFICIALITY` records that and lists which values belong to which, so a track is never read by its label alone.

Verified with `npx tsc --noEmit`, `npx eslint` and `npx next build`. **Unverified:** against a real database — the column rename has not been run, and until it is, both fields keep their `@map("competition_type")`.

---

## A dog stored with a bare size code could enter no track at all (2026-08-28)

`dogSizeCode()` read the size out of the parentheses of an Estonian label (`Midi(M)` → `M`) and returned `''` for anything else. Dogs added before the dog form was fixed (2026-08-27, below) hold the bare `M`, so `isTrackEligible()` bailed on its first check and the registration page said "Sellel koeral pole ühtki sobivat rada" for a dog whose size and class were both fine.

The reader now accepts either shape. Matching a bare code anywhere in the string would be wrong — `Väikemaksi(SL)` would hit the `S` alternative and resolve to Mini — so the label branch requires the parentheses and only a whole-string match falls through to the bare code.

| File | Change |
|------|--------|
| `src/lib/dog-sizes.ts` | `dogSizeCode()` moved here from track-eligibility and reads both shapes; new `dogSizeLabel()` normalises the other way |
| `src/lib/track-eligibility.ts` | Imports and re-exports it; the eligibility rule itself is unchanged |
| `scripts/migration-2026-08-28.sql` | New — rewrites bare codes in `dogs.size_est` / `size_fci` / `size_official` / `size_official_fci` to labels |

Checked against the stored shapes: `Midi(M)`, `M`, `m` and ` SL ` resolve; `Väikemaksi(SL)` gives `SL`, not `S`; `bogus` and `null` give `''`. A dog at bare `M` / A2 / H2 is now eligible for M-size A1, A2, H2, Seenior A and tunnelid, and rejected for A3 and for L-size tracks — previously it was rejected for every one of them. The migration has since been run: no dog is left with a bare size code (see the 2026-08-29 entry above).

---

## Dog sizes are the Estonian class label, not a bare code (2026-08-27)

`dogs.size_est` / `size_fci` hold `Väikemini(XS) | Mini(S) | Midi(M) | Väikemaksi(SL) | Maksi(L)` — the WordPress dog form writes exactly those, the measurement logic writes exactly those into `size_official`, and every size comparison expects them. This app's dog form offered the bare codes (`XS / S / M / SL / L`) instead, so a dog added here matched no track and no size grouping. The bare code belongs to `competition_tracks.size`, a different column with a different job.

| File | Change |
|------|--------|
| `src/app/competitor/dogs/DogForm.tsx` | Size selects offer `DOG_SIZE_CLASSES`, the same five labels as organizerPage's AddDogInfo |
| `src/lib/constants.ts` | `SIZES` is documented as the track size, not a dog size |
| `../databases/migration_dog_size_labels.sql` | New — converts bare codes in `dogs.size_est` / `size_fci` to labels |

`src/lib/track-eligibility.ts` is unchanged and still reads the label exactly the way production's `parseDogSizeCode` does — the mismatch was on the writing side, so it is fixed there rather than by teaching the reader a second format.

FCI has no XS, so a dog stored as bare `XS` under FCI becomes `Mini(S)`, matching where FCI's smallest class starts. The migration prints the affected rows before touching them and prints anything left with an unrecognised size afterwards.

Verified with `npx tsc --noEmit` and `npx next build`. A dog at `Midi(M)` / A2 / H2 is eligible for M-size A1, A2 and H1 tracks and rejected for H3 and for SL tracks. **Unverified:** against a real database — the migration has not been run.

---

## Track class and officiality were stored in the wrong columns (2026-08-27)

`competition_tracks` is a shared table, and the WordPress app fills it like this:

```
track_type       A1 | H2 | Open A | Seenior A | tunnelid ...   (the class)
competition_type ametlik | mitteametlik                        (the officiality)
```

The organizer form in this app wrote them the other way round: `TRACK_TYPES = ["agility", "jumping"]` went into `track_type` and the class (`A0..A3`) into `competition_type`. `competitionTrackSchema` types both as a plain string, so nothing objected. The app then disagreed with itself about which column to read — `dog-progression` matches `"Seenior A"` and `startsWith("A")` against `trackType` (the database's convention), while the protocol filter and the competitors table rendered `competitionType` as the class (the form's convention).

The database wins. The form now writes the class into `track_type` and the officiality into `competition_type`, from the same option list the WordPress app uses.

| File | Change |
|------|--------|
| `src/lib/constants.ts` | `TRACK_TYPES` is the class list (mirrors organizerPage's `TRACK_TYPE_OPTIONS`); new `TRACK_OFFICIALITY`, `NON_OFFICIAL_TRACK_TYPES`, `TEAM_TRACK_TYPES`; `COMPETITION_CLASSES` is no longer the track form's source |
| `src/app/organizer/competition/[id]/TrackForm.tsx` | "Tüüp" offers the classes, "Klass" became "Ametlikkus" (ametlik / mitteametlik); a class that cannot be official forces mitteametlik, and only team classes can be a relay |
| `src/app/organizer/competition/[id]/protocol/page.tsx` | Track filter shows `letter - trackType` |
| `src/app/organizer/competition/[id]/competitors/CompetitorTable.tsx` | Track chip shows `letter (trackType)` |
| `../databases/migration_track_type_columns.sql` | New — swaps the two columns back on rows this app wrote |

The forced-officiality and relay rules are ported from `handleTrackFieldChange` in organizerPage's `useTrackManagement`, so a track added here and a track added there end up identical.

Requires the migration for any competition whose tracks were created in this app; rows written by the WordPress app were always correct and the `WHERE track_type IN ('agility', 'jumping')` clause skips them. The migration prints the affected rows before touching them and prints anything left with an unknown class afterwards. A "jumping" row that was given an agility class cannot be recovered automatically — it keeps that class and shows up in that final SELECT.

This is what made track eligibility look broken: `isTrackEligible` reads the class from `trackType`, so a track created here matched no dog at all.

Verified with `npx tsc --noEmit` and `npx next build`. **Unverified:** against a real database — the migration has not been run, and no track has been created through the corrected form end to end.

---

## Only the tracks a dog may actually enter (2026-08-27)

Registration listed every track of a competition, so a Midi A1 dog was offered Maxi tracks and A3 tracks and the entry was accepted. Production filters that list against the dog (`isTrackEligible` in organizerPage's CompetitorCompetitions), and now so does this app — in the registration flow and in the track editor, from one shared rule.

The rule: the track's `size` must equal the dog's size code, and the class in `trackType` must not be above the class the dog has reached (`A1 <= A2 <= A3`, `H0 <= H1 <= H2 <= H3`). `Open *` and `Seenior *` have no rank requirement, `tunnelid` needs only the size to match. A confirmed measured class (`sizeOfficial`) wins over the owner's own `sizeEst`, the same way results and protocols resolve size.

| File | Change |
|------|--------|
| `src/lib/track-eligibility.ts` | New — `isTrackEligible()`, `dogSizeCode()`, `OPEN_TRACK_TYPES` |
| `src/app/competitor/register/[id]/page.tsx` | Step 2 lists only eligible tracks; switching dogs clears the selection |
| `src/app/competitor/competitions/TrackEditor.tsx` | Same filter, against the entry's dog |
| `src/app/api/competitors/my-bookings/route.ts`, `src/types/{dog,competitor}.ts` | `sizeOfficial` is selected so the filter can prefer the measured class |

The filter is client-side only, matching production — `POST /api/competitors` and `PUT /api/competitors/:id/tracks` still accept any track of the competition. Enforcing it server-side is the safer end state, but it would reject entries the organizer legitimately hand-places, so it is left for a decision rather than assumed.

Verified with `npx tsc --noEmit` and `npx next build`. **Unverified:** against a real database.

**Noticed, not fixed — and it matters for this change:** `src/app/organizer/competition/[id]/TrackForm.tsx` writes the two fields the other way round from the shared database. In `wvn1_competition_tracks` the rows read `track_type = 'A1' | 'H2' | 'Open A' | 'Seenior A' | 'tunnelid'` and `competition_type = 'ametlik' | 'mitteametlik'`, and `dog-progression` already reads `trackType` that way. But `TrackForm` offers `TRACK_TYPES = ["agility", "jumping"]` for `trackType` and `COMPETITION_CLASSES = A0..A3` for `competitionType` (`src/lib/constants.ts`). A track created through this app therefore carries no class in `trackType`, and the new filter will find it ineligible for every dog. Tracks created by the PHP app filter correctly.

---

## Editing your own entry: tracks and additional info (2026-08-27)

Production's "Võistlused" table has two actions a competitor could not perform here at all: change which tracks you are entered for, and write your own note on the entry. Both are now on the my-competitions page, and both close when registration closes.

Withdrawal changed rule with them. It used to be allowed only while the entry was `PENDING`, so an organizer accepting an entry locked the competitor in until they asked to be removed by hand. It now follows the same rule as everything else on the page — open until registration closes — which is what the PHP app does and what the footnote under the table promises.

| File | Change |
|------|--------|
| `src/app/api/competitors/[id]/tracks/route.ts` | New — `PUT` replaces the owner's track selection; every track must belong to that competition |
| `src/app/api/competitors/[id]/info/route.ts` | New — `PATCH` writes the owner's own `remarks` |
| `src/app/api/competitors/[id]/route.ts` | `DELETE` gates the owner on registration being open instead of on `PENDING` status |
| `src/app/competitor/competitions/TrackEditor.tsx` | New — modal listing the competition's tracks per day, current selection pre-checked |
| `src/app/competitor/competitions/page.tsx` | "Muuda radu" / "Eemalda" actions, inline Lisainfo editing, the closed-registration footnote |
| `src/lib/validations.ts` | `competitorTracksSchema` (at least one track), `competitorInfoSchema` |
| `src/app/api/competitors/my-bookings/route.ts` | Track `id` is selected so the editor can pre-check the current entry |

Both new routes are owner-only and reuse `isRegistrationOpen()` from `src/lib/registration.ts` — the same rule the entry endpoint and the public calendar feed already share, so a competitor cannot edit an entry the calendar shows as closed. Info editing is a separate route rather than an extra field on `PATCH /api/competitors/:id`: that route is organizer territory and carries `status` and the organizer's checkboxes, which an owner must not be able to write.

The editor replaces the whole selection rather than sending a delta, matching the shape the registration flow posts, and it lists every track of the competition — it does not filter by the dog's size and class the way production's `isTrackEligible` does. The registration flow here does not filter either, so the two agree; filtering both is its own change.

Verified with `npx tsc --noEmit` and `npx next build`. **Unverified:** against a real database — no entry has been edited end to end.

**Noticed, not fixed:** the size standard (EST/FCI) chosen at registration is preserved per track row only if the client sends it; the editor sends none, so re-saving a selection resets `sizeStandard` to null on the rebuilt rows. Production sends a per-track map. Worth following up if the standard is ever used for entries made through this app.

---

## My competitions: club, judge, deadline and per-day tracks (2026-08-27)

The competitor's own competition list showed less than production's "Võistlused" table: no club, no judge, no registration deadline, no additional info, and the track chips carried no date even though the API already returned one. All five were data the page had or could ask for.

| File | Change |
|------|--------|
| `src/app/api/competitors/my-bookings/route.ts` | Selects `clubName`, `referee`, `regStatus`, `regCloseDate` |
| `src/app/competitor/competitions/page.tsx` | Shows club, judges, the deadline (flagged red once closed), tracks grouped per competition day, and the entry's Lisainfo |
| `src/types/competitor.ts` | `MyRegistration.booking` gained the four fields |
| `src/i18n/translations/{et,en}.ts` | `myCompJudges`, `myCompRegCloses`, `myCompRegClosed`, `myCompAdditionalInfo` |

The card's closed-registration check is deliberately a local helper, not `src/lib/registration.ts`: that one is the server's rule and needs `status` and `endDate`, which this endpoint does not return. The card only decides what to grey out — the API still decides what is allowed.

Verified with `npx tsc --noEmit` and `npx next build`. **Unverified:** against a real database.

---

## Measurement results on the dog card (2026-08-27)

Commit [`5526a0d`](https://github.com/mikk369/agliit/commit/5526a0d)

A competitor could see their dog's class progression but not what the dog had actually been measured at. Measurements lived only on the organizer page (`/organizer/competition/[id]/measurements`); the owner had no route to their own `dog_measurements` rows. The dog card now carries a "Mõõtmistulemused" block — measurements grouped per competition, plus the confirmed competition class — matching the organizerPage "Minu koerad" table (its "Mõõtmistulemused" / "Klassi vahetus" columns). Every other column of that table already existed here; "Klassi vahetus" is this app's "Klassi tõus" block.

| File | Change |
|------|--------|
| `src/app/api/dogs/[id]/measurements/route.ts` | New — GET returns the dog's measurement history and confirmed classes; owner or `ORGANIZER`/`ADMIN` |
| `src/app/competitor/dogs/DogCard.tsx` | "Mõõtmistulemused" block, fetched when the card expands, grouped per competition |
| `src/types/dog.ts` | `DogMeasurementEntry`, `DogMeasurementHistory` |
| `src/i18n/translations/{et,en}.ts` | `measurements*` keys; the Estonian wording is taken from production |

The grouping key is deliberately `bookingId` rather than production's `organizer_name (start_date)` string: two competitions run by the same club on the same day no longer collapse into one block, and renaming a competition no longer splits its history in two.

Verified with `npx tsc --noEmit`. **Unverified:** against a real database — no measurement has been stored end to end yet (see "Mõõtmised otsustavad koera võistlusklassi").

**Noticed, not fixed:** `react-hooks/set-state-in-effect` errors in `DogCard.tsx` on both the new effect and the pre-existing progression one — both call `setLoading(true)` in the effect body. The new one follows the existing pattern; the real fix is to move both loads out of effects.

---

## Changing the handler in the competitors table (2026-08-27)

Commit [`e62de1f`](https://github.com/mikk369/agliit/commit/e62de1f)

The competitors table showed the handler read-only. A row can now be re-pointed at a different existing handler: "Muuda" opens a searchable picker that narrows as you type. Useful for fixing a registration filed under the wrong handler without deleting and re-adding the competitor.

The handler's **name itself cannot be edited** — a `handlers` row is that person's own record, shared with their competitor pages. The picker only changes `competitors.handlerId`; no handler row is written. (In organizerPage this was a real bug — the name was a free-text field that renamed the person everywhere; see `../organizerPage` v3.97 and `../vite-event-calendar` v2.62. This app never had the bug, because no handler field was editable at all.)

| File | Change |
|------|--------|
| `src/components/ui/SearchableSelect.tsx` | New — type-to-filter picker; returns the chosen record's `id`, not the typed text |
| `src/app/organizer/competition/[id]/competitors/CompetitorTable.tsx` | "Muuda" button in the "Koerajuht" cell opens the picker; new `handlers` and `onHandlerChange` props |
| `src/app/organizer/competition/[id]/competitors/page.tsx` | Loads the handler list (`GET /api/handlers`) and sends `PATCH /api/competitors/:id` with `handlerId` |
| `src/app/api/competitors/[id]/route.ts` | PATCH takes an optional `handlerId` — checks it exists, updates `competitors.handlerId` |

`SearchableSelect` deliberately returns an `id` rather than text: that way the component cannot be used to rename an existing record, only to select one. `GET /api/handlers` already existed but had no callers — this is its first consumer.

Verified with `npx tsc --noEmit` and `npx next build`. **Unverified:** against a real database.

**Noticed, not fixed:** `PATCH /api/competitors/:id` checks only the role (`ORGANIZER`/`ADMIN`), not whether the user owns that particular booking — so one organizer can edit another's competition. This already applied to the `status`, `remarks`, `needsMeasurement` and `needsCompetitionBook` fields; `handlerId` follows the same pattern. The PHP side does check ownership (`check_user_owns_booking()`).

---

## Measurements decide a dog's competition class (2026-08-27)

Commit [`515b92b`](https://github.com/mikk369/agliit/commit/515b92b)

A measurement is now entered in centimetres and the class is derived from the EKL/FCI boundaries server-side. A dog's competition class changes only once **two** measurements resolve to the **same** class — a second measurement landing in a different class than the first leaves the class untouched.

Boundaries (upper bound inclusive): EKL XS –28 | S 28.1–35 | M 35.1–43 | SL 43.1–50 | L 50.1– • FCI S –35 | M 35.1–43 | IM 43.1–48 | L 48.1–. FCI has no XS, and its intermediate class (IM) is stored under the existing `Väikemaksi(SL)` label, because `size_est`/`size_fci` are enums with five Estonian labels.

Requires the migration `../databases/migration_dog_measurement_classes.sql` (shared table, run once). The same logic also lives in `../vite-event-calendar/includes/helpers.php`.

| File | Change |
|------|--------|
| `prisma/schema.prisma` | `Dog.sizeOfficial` / `sizeOfficialFci`; `DogMeasurement.measurementCm` (Decimal 5,2) / `measurementFci` |
| `src/lib/dog-sizes.ts` | New — EKL/FCI boundaries, `classFromCm()`, `confirmedClass()`, `effectiveDogSize()` |
| `src/lib/dog-measurements.ts` | New — `recalculateDogOfficialSizes()`, rebuilds the confirmed class from the full history |
| `src/lib/validations.ts` | `dogMeasurementSchema` takes `measurementCm` (10–100) and requires a referee; `measurement` no longer comes from the client |
| `src/app/api/dog-measurements/[bookingId]/route.ts` | POST derives both class labels from cm and recomputes the confirmed class |
| `src/app/api/dog-measurements/single/[id]/route.ts` | DELETE recomputes — removing a measurement can revoke a confirmed class |
| `src/app/api/results/save/route.ts`, `results/track/[trackId]/route.ts` | Size resolution prefers the confirmed class over the owner's own estimate |
| `src/app/api/{start-protocol,results,competitors}/**` | Dog selects return `sizeOfficial` / `sizeOfficialFci` |
| `src/app/organizer/competition/[id]/measurements/page.tsx` | cm input with a derived-class preview, "Kinnitatud klass" column, the rule stated under the form; fixed 19 broken `\uXXXX` escapes in display text |
| `src/types/dog.ts` | `Dog` gained the confirmed classes; the new `DogFormFields` keeps them out of the form |

The confirmed class is kept separate from the owner's estimate: only the measurement logic writes `sizeOfficial`, while `sizeEst` stays whatever the competitor entered. Readers prefer the confirmed class and fall back to `sizeFci` / `sizeEst`, so nothing changes before a class is confirmed. Overwriting `sizeEst` directly would have been less code, but the dog form writes there — a competitor could have unknowingly overwritten an officially measured class.

Verified with `npx tsc --noEmit` and `npx next build`. PHP and TS give identical results at the boundary cases (28/28.1 • 35/35.1 • 43/43.1 • 50/50.1 • 48/48.1). **Unverified:** against a real database — the migration has not been run, so no measurement has been stored end to end. An old free-text row (`47-48`) survives but cannot decide a class.

**Noticed, not fixed:** `src/app/organizer/competition/[id]/awardings/page.tsx` contains the same escape bug. `results/save` and `results/track/[trackId]` ignore a track's `sizeStandard` when resolving size (the PHP side accounts for it) — left alone, the bug predates this change.

---

## Public competition pages, and the calendar hand-over that never landed (2026-08-27)

Commit [`c83c5d9`](https://github.com/mikk369/agliit/commit/c83c5d9)

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

Commit [`97ae920`](https://github.com/mikk369/agliit/commit/97ae920)

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

Commit [`09f5b17`](https://github.com/mikk369/agliit/commit/09f5b17)

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

Commit [`339a0d8`](https://github.com/mikk369/agliit/commit/339a0d8)

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

Commit [`898929b`](https://github.com/mikk369/agliit/commit/898929b)

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

Commit [`64e00f1`](https://github.com/mikk369/agliit/commit/64e00f1)

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

Commit [`6818a53`](https://github.com/mikk369/agliit/commit/6818a53)

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

Commit [`671f49d`](https://github.com/mikk369/agliit/commit/671f49d)

Created shared UI components in `src/components/ui/` to replace duplicated patterns across pages.

| Component | Replaces | Files updated |
|-----------|----------|---------------|
| `MessageBanner` | Inline `{message && <div className={...}>}` success/error banners | 8 page files |
| `LoadingSkeleton` | Inline `animate-pulse` skeleton loading blocks | 9 page files |
| `StatusBadge` | Local `StatusBadge` functions with status-to-color mapping | 2 page files |

Skipped: `ConfirmModal` (all pages use native `window.confirm()` — no benefit), `PageHeader` (patterns too varied across pages).

---

## Utility helpers (2026-08-25)

Commit [`54365dd`](https://github.com/mikk369/agliit/commit/54365dd)

Created `src/lib/utils.ts` with shared utility functions to replace duplicated logic across pages.

| Helper | Replaces | Files updated |
|--------|----------|---------------|
| `formatDate(dateStr, locale?)` | Local `formatDate` functions with `toLocaleDateString` | 13 page files |
| `sortResults(competitors)` | Duplicated DNS/DSQ/time/faults sort logic | `results/[id]/page.tsx` (2 instances) |

---

## API auth helper (2026-08-25)

Commit [`a8660a7`](https://github.com/mikk369/agliit/commit/a8660a7)

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

Commit [`b4c1fc8`](https://github.com/mikk369/agliit/commit/b4c1fc8)

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

Commit [`a662d8f`](https://github.com/mikk369/agliit/commit/a662d8f)

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
