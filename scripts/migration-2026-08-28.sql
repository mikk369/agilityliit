-- ===========================================================================
-- agliit migration - 2026-08-28
--
-- Runs against agliit's OWN database (the prefixless tables Prisma created),
-- NOT the WordPress one. No `wvn1_` / `mwvj_` prefix anywhere below.
--
-- Set the client to utf8mb4 before running, or the Estonian labels land as
-- 'V?ikemini(XS)'.
--
--   1. Normalise bare dog size codes            - safe, run on its own
--   2. Split the two `competition_type` columns - needs a schema.prisma edit
--                                                 immediately afterwards
-- ===========================================================================

SET NAMES utf8mb4;


-- ---------------------------------------------------------------------------
-- 1. Dog sizes: bare code -> Estonian class label
--
-- A dog's size is stored as the label (Midi(M)); dogs added before the dog
-- form was fixed hold the bare code (M), which no size grouping recognises.
-- `dogSizeCode()` now reads both, so this is about what gets displayed in the
-- dog list and in every protocol.
-- ---------------------------------------------------------------------------

-- Look before you leap: these are the rows that will change.
SELECT `id`, `nick_name`, `size_est`, `size_fci`, `size_official`, `size_official_fci`
FROM `dogs`
WHERE `size_est`          IN ('XS', 'S', 'M', 'SL', 'L')
   OR `size_fci`          IN ('XS', 'S', 'M', 'SL', 'L')
   OR `size_official`     IN ('XS', 'S', 'M', 'SL', 'L')
   OR `size_official_fci` IN ('XS', 'S', 'M', 'SL', 'L');

-- EST keeps every class, XS included.
UPDATE `dogs`
SET `size_est` = CASE `size_est`
  WHEN 'XS' THEN 'Väikemini(XS)'
  WHEN 'S'  THEN 'Mini(S)'
  WHEN 'M'  THEN 'Midi(M)'
  WHEN 'SL' THEN 'Väikemaksi(SL)'
  WHEN 'L'  THEN 'Maksi(L)'
  ELSE `size_est`
END
WHERE `size_est` IN ('XS', 'S', 'M', 'SL', 'L');

UPDATE `dogs`
SET `size_official` = CASE `size_official`
  WHEN 'XS' THEN 'Väikemini(XS)'
  WHEN 'S'  THEN 'Mini(S)'
  WHEN 'M'  THEN 'Midi(M)'
  WHEN 'SL' THEN 'Väikemaksi(SL)'
  WHEN 'L'  THEN 'Maksi(L)'
  ELSE `size_official`
END
WHERE `size_official` IN ('XS', 'S', 'M', 'SL', 'L');

-- FCI has no XS; a dog stored as 'XS' under FCI becomes the smallest FCI class.
UPDATE `dogs`
SET `size_fci` = CASE `size_fci`
  WHEN 'XS' THEN 'Mini(S)'
  WHEN 'S'  THEN 'Mini(S)'
  WHEN 'M'  THEN 'Midi(M)'
  WHEN 'SL' THEN 'Väikemaksi(SL)'
  WHEN 'L'  THEN 'Maksi(L)'
  ELSE `size_fci`
END
WHERE `size_fci` IN ('XS', 'S', 'M', 'SL', 'L');

UPDATE `dogs`
SET `size_official_fci` = CASE `size_official_fci`
  WHEN 'XS' THEN 'Mini(S)'
  WHEN 'S'  THEN 'Mini(S)'
  WHEN 'M'  THEN 'Midi(M)'
  WHEN 'SL' THEN 'Väikemaksi(SL)'
  WHEN 'L'  THEN 'Maksi(L)'
  ELSE `size_official_fci`
END
WHERE `size_official_fci` IN ('XS', 'S', 'M', 'SL', 'L');

-- Anything left that is not a known class needs a human decision.
SELECT `id`, `nick_name`, `size_est`, `size_fci`, `size_official`, `size_official_fci`
FROM `dogs`
WHERE (`size_est` IS NOT NULL AND `size_est` <> '' AND `size_est` NOT IN
        ('Väikemini(XS)', 'Mini(S)', 'Midi(M)', 'Väikemaksi(SL)', 'Maksi(L)'))
   OR (`size_fci` IS NOT NULL AND `size_fci` <> '' AND `size_fci` NOT IN
        ('Väikemini(XS)', 'Mini(S)', 'Midi(M)', 'Väikemaksi(SL)', 'Maksi(L)'));


-- ---------------------------------------------------------------------------
-- 2. One column name, two unrelated meanings
--
--   bookings.competition_type           - võistlustüüp: CACIAG, Rahvuslik ...
--   competition_tracks.competition_type - ametlik / mitteametlik
--
-- `competition_tracks.track_type` is NOT touched: it holds the class
-- (A1 / H1 / Open A / tunnelid) and is already right.
--
-- AFTER running this, the app 500s until these two lines in
-- prisma/schema.prisma point at the new columns, followed by
-- `npx prisma generate`:
--
--   Booking.competitionOfficiality  @map("competition_type") -> @map("competition_officiality")
--   CompetitionTrack.officiality    @map("competition_type") -> @map("officiality")
--
-- Never use `prisma db push` for this: with no migration history it resolves a
-- rename as DROP + ADD and silently empties the column.
-- ---------------------------------------------------------------------------

-- Look before you leap: what the two columns hold today.
SELECT 'bookings' AS source, `competition_type` AS value, COUNT(*) AS rows_
FROM `bookings` GROUP BY `competition_type`
UNION ALL
SELECT 'competition_tracks', `competition_type`, COUNT(*)
FROM `competition_tracks` GROUP BY `competition_type`;

ALTER TABLE `bookings`
  CHANGE COLUMN `competition_type` `competition_officiality` VARCHAR(191) NOT NULL;

ALTER TABLE `competition_tracks`
  CHANGE COLUMN `competition_type` `officiality` VARCHAR(191) NOT NULL;

-- Confirm: neither table should still list a `competition_type`.
SHOW COLUMNS FROM `bookings` LIKE '%competition%';
SHOW COLUMNS FROM `competition_tracks` LIKE '%official%';
