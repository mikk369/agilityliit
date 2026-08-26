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

Create the database tables:

```bash
npx prisma db push
```

Run dev server:

```bash
npm run dev
```

Open http://localhost:3000

### The two Prisma commands

They do different jobs and are easy to mix up:

| Command | What it does | When |
|---------|--------------|------|
| `npx prisma generate` | Writes the TypeScript client into `src/generated/prisma`. **Never touches the database.** | After `npm install` and after every schema change. Per machine — `src/generated/` is gitignored, so the server needs its own |
| `npx prisma db push` | Creates and alters the **tables** in `DATABASE_URL` to match the schema. Writes no code. | Once per database, and again after a schema change |

`db push` runs `generate` for you at the end, so a schema change usually needs only the push.

**Stop the dev server before running either.** Windows locks `query_engine-windows.dll.node` while the app is running, and generate fails with `EPERM: operation not permitted, rename ...`. The database change still went through — only the client copy failed, so re-run `npx prisma generate` with the server stopped.

## Deploying to the server

In this order, from the project directory:

```bash
# 1. stop the running app first (pm2 stop agliit, systemctl stop agliit, or Ctrl+C)
git pull

# 2. dependencies — only when package.json changed, but harmless to always run
npm install

# 3. regenerate the Prisma client (src/generated/ is not in git, so this is required)
npx prisma generate

# 4. apply schema changes to the database — only when prisma/schema.prisma changed
npx prisma db push

# 5. build and start
npm run build
npm start
```

Steps 3 and 4 are the ones people forget. Skipping **3** breaks the build or throws `@prisma/client did not initialize yet`; skipping **4** leaves the code expecting columns the database does not have — after a schema change that adds a column the app reads on every request, that breaks login, not just one page.

For production, `npx prisma migrate deploy` with committed migration files is safer than `db push`: it is versioned, reviewable, and will not silently drop a column. `prisma.config.ts` already points at `prisma/migrations`. `db push` is fine while the app is not yet live.

Server `.env` must also have `NEXTAUTH_URL` and `PUBLIC_APP_URL` set to the real domain, and the `SMTP_*` variables — without them password reset mail cannot be sent.

## Data Migration (from WordPress)

To migrate data from the old WordPress system:

1. Import the WP SQL dump into a local MySQL database:

```bash
mysql -u root -e "CREATE DATABASE d88811sd560857 CHARACTER SET utf8mb4"
mysql -u root d88811sd560857 < d88811sd560857.sql
```

2. Make sure the target database exists with the Prisma schema pushed (see Setup above).

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
