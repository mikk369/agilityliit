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
```

Push database schema:

```bash
npx prisma db push
```

Run dev server:

```bash
npm run dev
```

Open http://localhost:3000

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
