# Migrations

`0_init` describes the database as it already exists — it is a **baseline**, not
something to run. It was generated from `prisma/schema.prisma` after the
`competition_type` columns were split into `bookings.competition_officiality`
and `competition_tracks.officiality`.

## Finish the baseline (once, against each database)

Both commands need a reachable `DATABASE_URL`.

```bash
# 1. Confirm the database really matches the schema. Prints nothing when it does.
npx prisma migrate diff \
  --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script

# 2. Record 0_init as already applied. Does NOT run the SQL.
npx prisma migrate resolve --applied 0_init
```

If step 1 prints statements, the database has drifted from the schema. Fix the
drift (or regenerate `0_init/migration.sql` with `--from-empty --to-url
"$DATABASE_URL"` so the baseline describes what actually exists) before running
step 2 — a baseline that lies is worse than none.

Until step 2 is run on a database, `prisma migrate deploy` there will try to
CREATE tables that already exist and fail.

## From then on

```bash
npx prisma migrate dev --name what_changed --create-only   # writes the SQL, runs nothing
# edit the generated migration.sql when it is a rename:
#   Prisma writes DROP COLUMN + ADD COLUMN, which throws the data away.
#   Replace it with ALTER TABLE ... CHANGE COLUMN ... to keep it.
npx prisma migrate dev                                     # applies it
npx prisma migrate deploy                                  # on the server
```

Do not use `prisma db push` on a database that holds real rows: with no history
it resolves a rename as DROP + ADD and empties the column without asking.
