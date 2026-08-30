# Agility Competition Management System

Estonian agility dog competition management system built with Next.js. Replaces the previous WordPress-based two-repo system (organizerPahe + vite-event-calendar).

Live: `agliit.agilityliit.ee`

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: MySQL + Prisma ORM
- **Auth**: NextAuth.js v4 (credentials, JWT sessions)
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **Exports**: xlsx (Excel), window.print (PDF)
- **i18n**: Custom context (ET/EN), cookie-based

## Getting Started

### Prerequisites

- Node.js 20+
- MySQL 8+ running locally

### Setup

```bash
npm install
```

Create `.env`:

```env
DATABASE_URL="mysql://root:@localhost:3306/agliit"
NEXTAUTH_SECRET="your-random-secret"
NEXTAUTH_URL="http://localhost:3000"

# Optional — public API read by the WordPress calendar on agilityliit.ee
# PUBLIC_APP_URL="https://agliit.agilityliit.ee"          # base for links in /api/public/calendar and reset mails (defaults to NEXTAUTH_URL)
# PUBLIC_ALLOWED_ORIGINS="https://agilityliit.ee"         # CORS allow-list (defaults to agilityliit.ee and www.agilityliit.ee)
# SPONSOR_UPLOAD_DIR="/var/lib/agliit/sponsors"          # where sponsor logos are written (defaults to ./uploads/sponsors)

# Outgoing mail — required in production for password reset
SMTP_HOST="smtp.example.ee"
SMTP_PORT="587"
SMTP_USER="no-reply@agilityliit.ee"
SMTP_PASSWORD="..."
SMTP_FROM="Eesti Agility Liit <no-reply@agilityliit.ee>"
```

Without SMTP configured, development logs reset mails to the console instead of sending them; production refuses to send.

### Roles

Sign-up always creates a competitor — no request can ask for another role.

The first admin is promoted directly in the database: register the account through the app, then

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.ee';
SELECT id, name, email, role FROM users WHERE role = 'ADMIN';
```

The new role is picked up on the next session refresh; a reload is enough. From then on admins manage every role at `/admin/users`, and the database is only needed again if the last admin account is ever lost.

### First install, in order

Every step here is per machine, not per clone-of-the-repo — nothing below arrives
through git.

```bash
mysql -u root -e "CREATE DATABASE agliit CHARACTER SET utf8mb4"   # 1. Prisma fills the database, it does not create it
npm install                                                       # 2.
#                                                                    3. write .env (above)
npx prisma generate                                               # 4. TypeScript client -> src/generated/
npx prisma migrate deploy                                         # 5. tables, from prisma/migrations
npm run dev                                                       # 6.
```

Open http://localhost:3000, register an account, then promote it to admin — see
[Roles](#roles) above.

If `DATABASE_URL` points at a database that **already has the tables** (an
existing server, or one first created with `db push`), skip step 5: `migrate
deploy` would try to CREATE them again and fail. Baseline that database once
instead — `prisma/migrations/README.md` has the two commands.

### After every `git pull`

```bash
npm install                 # only when package-lock.json changed
npx prisma generate         # whenever prisma/schema.prisma changed — harmless otherwise, so when unsure, run it
npx prisma migrate deploy   # only when prisma/migrations/ gained a folder
npm run build               # production only — `npm run dev` rebuilds on its own
```

Which of those you actually need, the pull itself will tell you:

```bash
git diff HEAD@{1} --stat -- prisma/ package-lock.json
```

`prisma generate` is the step people skip. The generated client is gitignored, so
a pull never brings it, and a schema change without it leaves the client
describing the old shape — the build fails, or the app throws
`@prisma/client did not initialize yet`.

### The Prisma commands

They do different jobs and are easy to mix up:

| Command | What it does | When |
|---------|--------------|------|
| `npx prisma generate` | Writes the TypeScript client into `src/generated/prisma`. **Never touches the database.** | After `npm install`, and after every schema change. Per machine — `src/generated/` is gitignored, so the server needs its own |
| `npx prisma migrate deploy` | Applies the pending migrations in `prisma/migrations` to `DATABASE_URL`. Writes no code. | On first install, and after a pull that brought a new migration |
| `npx prisma migrate dev --name ...` | Writes a new migration from a schema change **and** applies it locally. | Only while developing, never on the server |

Unlike `db push`, `migrate deploy` does **not** run `generate` for you — a schema
change needs both, generate first.

Do not use `npx prisma db push` on a database holding real rows: it has no
migration history, so it resolves a column rename as DROP + ADD and empties the
column without asking.

**Stop the dev server before running any of these.** Windows locks `query_engine-windows.dll.node` while the app is running, and generate fails with `EPERM: operation not permitted, rename ...`. The database change still went through — only the client copy failed, so re-run `npx prisma generate` with the server stopped.

## Deploying to the server

The subdomain is proxied by the hosting panel to a local port (e.g. `3939`), and
the app runs under PM2 on that port. Apache/cPanel handles the certificate; the
app itself only ever speaks plain HTTP to `127.0.0.1`.

### Every deploy

```bash
git pull
npm ci                     # only when package-lock.json changed
npx prisma generate        # required — src/generated/ is not in git
npx prisma migrate deploy  # only when prisma/migrations/ gained a folder
npm run build
pm2 restart agliit
```

Same flow as [After every `git pull`](#after-every-git-pull) above, plus the PM2
restart. `prisma generate` is the step people skip: the generated client is
gitignored, so a fresh `git pull` never brings it. Without it the build fails or
the app throws `@prisma/client did not initialize yet`.

The very first deploy against a database that already carries the WordPress data
is the baseline case — `migrate resolve --applied 0_init` rather than
`migrate deploy`. See `prisma/migrations/README.md`.

Stop the app before running prisma commands if the platform locks the query
engine file (Windows does; Linux does not).

### The port

The port lives in two places, and they must match: the proxy rule in the hosting
panel, and the PM2 start command. There is no port setting in the repo.

```bash
# start the app on the proxied port
pm2 start npm --name agliit -- start -- -p 3939
pm2 save                     # remember it across reboots

# check what it is running with
pm2 describe agliit

# change the port later (also update the panel's proxy rule)
pm2 delete agliit
pm2 start npm --name agliit -- start -- -p 4000
pm2 save
```

`PORT=3939` in `.env` does **not** work: `next start` resolves the port before it
loads the env file. Use the `-p` flag, or PM2's own env.

Whatever the number, `.env` must still use the **public** URL, not the port —
`NEXTAUTH_URL` and `PUBLIC_APP_URL` are what end up in login redirects, in the
calendar feed's links, and in password reset mails:

```env
NEXTAUTH_URL="https://agliit.agilityliit.ee"
PUBLIC_APP_URL="https://agliit.agilityliit.ee"
```

### Behind the proxy

The password-reset rate limiter keys on the caller's address, read from
`X-Forwarded-For` or `X-Real-IP`. Apache's `mod_proxy_http` sets
`X-Forwarded-For` by default, so this normally works — but if reset requests
ever start being throttled for everyone at once, that header is the thing to
check, because every visitor would be arriving as `127.0.0.1`.

### First deploy checklist

1. `.env` from `.env.example` — real domain, a fresh `NEXTAUTH_SECRET`
   (`openssl rand -base64 32`), and the `SMTP_*` block.
2. `npx prisma migrate deploy` to create the tables (or baseline an existing
   database — see `prisma/migrations/README.md`).
3. `npm run build`, then start under PM2 on the proxied port.
4. `pm2 save` so it survives a reboot.
5. Register an account, then promote it:
   `UPDATE users SET role = 'ADMIN' WHERE email = '...';`
6. Check `/admin/bookings`, and request a password reset to confirm mail sends.

## Data Migration (from WordPress)

To migrate data from the old WordPress system:

1. Import the WP SQL dump into a local MySQL database:

```bash
mysql -u root -e "CREATE DATABASE d88811sd560857 CHARACTER SET utf8mb4"
mysql -u root d88811sd560857 < d88811sd560857.sql
```

2. Make sure the target database exists with its tables created (see First install above).

3. Run the migration script:

```bash
npx tsx scripts/migrate-data.ts
```

This migrates all users, handlers, dogs, bookings, tracks, competitors, results, teams, awardings, and measurements. All users get the temporary password `Parool123!` and must reset their password.

## User Roles

| Role | Access |
|------|--------|
| ADMIN | Full access |
| ORGANIZER | Create/manage competitions |
| COMPETITOR | Register for competitions, manage dogs/profile |

## Project Structure

```
src/
  app/
    api/            # API route handlers
    competitor/     # Competitor pages (profile, dogs, competitions)
    organizer/      # Organizer pages (competition editor, protocols, results)
    competitions/   # Public competition list & detail
    results/        # Public results
    start-protocol/ # Public start protocol
    dog-statistics/ # Public dog statistics search
    teams/          # Public teams
    login/          # Login page
    register/       # Registration page
  components/       # Shared React components
  lib/              # DB client, auth config, utils, validations
  i18n/             # Language context, translations (ET/EN)
  generated/prisma/ # Generated Prisma client
prisma/
  schema.prisma     # Database schema (16 models)
scripts/
  migrate-data.ts   # WP -> Prisma data migration
```
