# Agility Competition System - Next.js Rebuild Plan

## Overview
Rebuild the current two-repo WordPress system (organizerPahe FE + vite-event-calendar BE) into a single Next.js application with its own auth system, deployable to `agilityliit.ee`.

---

## Phase 1: Project Setup & Infrastructure

### 1.1 Initialize Next.js Project
```
agility-nextjs/
  src/
    app/                    # Next.js App Router
    components/             # Shared React components
    lib/                    # Utilities, DB, auth helpers
    types/                  # TypeScript types
  prisma/
    schema.prisma           # Database schema
  public/                   # Static assets (logos, images)
```

### 1.2 Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | MySQL (same as current) |
| ORM | Prisma |
| Auth | NextAuth.js (credentials + optional OAuth) |
| Styling | Tailwind CSS |
| Forms | React Hook Form + Zod validation |
| Rich Text | Tiptap (lighter than Quill) |
| PDF | jsPDF (keep current) |
| Excel | xlsx (keep current) |
| i18n | next-intl (ET/EN) |
| Deployment | VPS with Node.js or Vercel |

### 1.3 Environment Config
```env
DATABASE_URL=mysql://user:pass@host:3306/agility_db
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://agilityliit.ee
```

---

## Phase 2: Database Schema (Prisma)

Migrate the current 14 WordPress custom tables into proper Prisma models with relations. Drop all WordPress dependency (wp_users, wp_options, etc.).

### 2.1 Models

```prisma
// NEW - replaces wp_users
model User {
  id            Int       @id @default(autoincrement())
  email         String    @unique
  password      String    // bcrypt hashed
  name          String
  role          Role      @default(COMPETITOR)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  handler       Handler?
  bookings      Booking[]
}

enum Role {
  ADMIN
  ORGANIZER
  COMPETITOR
}

// From wp_bookings
model Booking {
  id                 Int       @id @default(autoincrement())
  userId             Int       // organizer who created it
  user               User      @relation(fields: [userId], references: [id])
  startDate          DateTime
  endDate            DateTime
  qualTime           String?
  organizerName      String
  clubName           String
  email              String
  phone              String
  location           String
  referee            Json      // array of referee names
  info               String?   @db.Text
  competitionClasses String?   @db.Text
  competitionType    String
  status             String    @default("PENDING") // PENDING, BOOKED, CLUBEVENT
  regStatus          String?   // reg_open, reg_closed
  regCloseDate       DateTime?
  protocolPublished  Int       @default(0)
  teamsLocked        Int       @default(0)
  teamsPublished     Int       @default(0)
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  competitionInfo    CompetitionInfo?
  competitors        Competitor[]
  competitionTracks  CompetitionTrack[]
  startProtocols     StartProtocol[]
  teams              Team[]
  awardings          Awarding[]
  dogMeasurements    DogMeasurement[]
}

// From wp_competition_info
model CompetitionInfo {
  id                    Int      @id @default(autoincrement())
  bookingId             Int      @unique
  booking               Booking  @relation(fields: [bookingId], references: [id])
  descriptionEst        String?  @db.LongText
  descriptionEng        String?  @db.LongText
  sponsorImages         Json?    // array of { id, url, size }
  maxCompetitorsPerDay  Json?    // { "2026-09-05": 40, "2026-09-06": 40 }
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

// From wp_handlers
model Handler {
  id            Int      @id @default(autoincrement())
  userId        Int      @unique
  user          User     @relation(fields: [userId], references: [id])
  firstName     String
  lastName      String
  club          String?
  country       String?  @default("EST")
  phone         String?
  email         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  dogs          Dog[]
  competitors   Competitor[]
}

// From wp_dogs
model Dog {
  id                     Int       @id @default(autoincrement())
  handlerId              Int
  handler                Handler   @relation(fields: [handlerId], references: [id])
  nickName               String
  officialName           String?
  breed                  String?
  gender                 String?
  birthday               DateTime?
  sizeEst                String?   // Väikemini(XS), Mini(S), Midi(M), Väikemaksi(SL), Maksi(L)
  sizeFci                String?
  agilityClass           String?   // A1, A2, A3
  jumpClass              String?   // H0, H1, H2, H3
  registerCode           String?
  idCode                 String?
  generalVaccinationEnd  DateTime?
  rabiesVaccinationEnd   DateTime?
  ownersName             String?
  agilityClassChangedAt  DateTime?
  jumpClassChangedAt     DateTime?
  info                   String?   @db.Text
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
  competitors            Competitor[]
  measurements           DogMeasurement[]
}

// From wp_competitors (registration for a competition)
model Competitor {
  id               Int       @id @default(autoincrement())
  bookingId        Int
  booking          Booking   @relation(fields: [bookingId], references: [id])
  handlerId        Int
  handler          Handler   @relation(fields: [handlerId], references: [id])
  dogId            Int
  dog              Dog       @relation(fields: [dogId], references: [id])
  status              String    @default("PENDING") // PENDING, ACCEPTED
  remarks             String?   @db.Text
  needsMeasurement    Boolean   @default(false)
  needsCompetitionBook Boolean  @default(false)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  competitorTracks    CompetitorTrack[]
  startProtocols   StartProtocol[]
  results          CompetitorResult[]
  teamMembers      TeamMember[]
}

// From wp_competitor_tracks
model CompetitorTrack {
  id                 Int              @id @default(autoincrement())
  competitorId       Int
  competitor         Competitor       @relation(fields: [competitorId], references: [id], onDelete: Cascade)
  competitionTrackId Int
  competitionTrack   CompetitionTrack @relation(fields: [competitionTrackId], references: [id])
  competitionDate    DateTime
  sizeStandard       String?          // 'EST' or 'FCI'
  createdAt          DateTime         @default(now())
}

// From wp_competition_tracks
model CompetitionTrack {
  id              Int       @id @default(autoincrement())
  bookingId       Int
  booking         Booking   @relation(fields: [bookingId], references: [id])
  competitionDate DateTime
  letter          String    // A, B, C...
  trackType       String    // agility, jumping
  size            String    // XS, S, M, L
  competitionType String    // A0, A1, A2, A3
  referee         String?
  sizeStandard    String?
  sortOrder       Int       @default(0)
  isRelay         Boolean   @default(false)
  createdAt       DateTime  @default(now())
  competitorTracks  CompetitorTrack[]
  startProtocols    StartProtocol[]
  trackResults      TrackResult[]
  competitorResults CompetitorResult[]
  teamResults       TeamResult[]
}

// From wp_start_protocol
model StartProtocol {
  id                 Int              @id @default(autoincrement())
  bookingId          Int
  booking            Booking          @relation(fields: [bookingId], references: [id])
  competitorId       Int
  competitor         Competitor       @relation(fields: [competitorId], references: [id])
  competitionTrackId Int
  competitionTrack   CompetitionTrack @relation(fields: [competitionTrackId], references: [id])
  competitionDate    DateTime
  size               String
  startNumber        Int
  sortOrder          Int              @default(0)
  createdAt          DateTime         @default(now())
}

// From wp_track_results (track parameters per size group)
model TrackResult {
  id                 Int              @id @default(autoincrement())
  competitionTrackId Int
  competitionTrack   CompetitionTrack @relation(fields: [competitionTrackId], references: [id])
  sizeGroup          String
  trackLength        Decimal?         @db.Decimal(8, 2)
  trackSpeed         Decimal?         @db.Decimal(8, 2)
  idealTime          Decimal?         @db.Decimal(8, 2)
  maxTime            Decimal?         @db.Decimal(8, 2)
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  @@unique([competitionTrackId, sizeGroup])
}

// From wp_competitor_results
model CompetitorResult {
  id                 Int              @id @default(autoincrement())
  startProtocolId    Int
  competitorId       Int
  competitor         Competitor       @relation(fields: [competitorId], references: [id])
  competitionTrackId Int
  competitionTrack   CompetitionTrack @relation(fields: [competitionTrackId], references: [id])
  timeSeconds        Decimal?         @db.Decimal(8, 2)
  faults             Int              @default(0)
  isDsq              Boolean          @default(false)
  isDns              Boolean          @default(false)
  hasQualification   Boolean          @default(false)
  notes              String?
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  @@unique([competitorId, competitionTrackId])
}

// From wp_teams
model Team {
  id              Int       @id @default(autoincrement())
  bookingId       Int
  booking         Booking   @relation(fields: [bookingId], references: [id])
  competitionDate DateTime
  size            String
  trackType       String?
  teamName        String    @default("")
  sortOrder       Int       @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  members         TeamMember[]
  results         TeamResult[]
}

// From wp_team_members
model TeamMember {
  id           Int        @id @default(autoincrement())
  teamId       Int
  team         Team       @relation(fields: [teamId], references: [id], onDelete: Cascade)
  competitorId Int
  competitor   Competitor @relation(fields: [competitorId], references: [id])
  sortOrder    Int        @default(0)
  createdAt    DateTime   @default(now())

  @@unique([teamId, competitorId])
}

// From wp_team_results
model TeamResult {
  id                 Int              @id @default(autoincrement())
  teamId             Int
  team               Team             @relation(fields: [teamId], references: [id], onDelete: Cascade)
  competitionTrackId Int
  competitionTrack   CompetitionTrack @relation(fields: [competitionTrackId], references: [id])
  timeSeconds        Decimal?         @db.Decimal(8, 2)
  faults             Int              @default(0)
  isDsq              Boolean          @default(false)
  isDns              Boolean          @default(false)
  notes              String?
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  @@unique([teamId, competitionTrackId])
}

// From wp_awardings
model Awarding {
  id        Int             @id @default(autoincrement())
  bookingId Int
  booking   Booking         @relation(fields: [bookingId], references: [id])
  name      String
  sortOrder Int             @default(0)
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt
  tracks    AwardingTrack[]
}

// From wp_awarding_tracks
model AwardingTrack {
  id              Int      @id @default(autoincrement())
  awardingId      Int
  awarding        Awarding @relation(fields: [awardingId], references: [id], onDelete: Cascade)
  letter          String
  trackType       String
  competitionDate DateTime
}

// From wp_dog_measurements
model DogMeasurement {
  id        Int      @id @default(autoincrement())
  dogId     Int
  dog       Dog      @relation(fields: [dogId], references: [id])
  bookingId Int
  booking   Booking  @relation(fields: [bookingId], references: [id])
  referee   String   @default("")
  result    String   @default("")
  createdAt DateTime @default(now())
}
```

---

## Phase 3: Authentication System

### 3.1 NextAuth.js Setup
Replace WordPress user system with NextAuth.js credentials provider.

**Features needed:**
- Email + password login (credentials provider)
- User registration (custom signup API route)
- Role-based access: ADMIN, ORGANIZER, COMPETITOR
- Session stored in JWT (no DB sessions needed)
- Middleware to protect routes by role

### 3.2 Auth Routes
| Route | Purpose |
|-------|---------|
| `/login` | Login page |
| `/register` | Registration page |
| `/api/auth/[...nextauth]` | NextAuth handler |

### 3.3 Middleware
```
src/middleware.ts
  - /organizer/*  -> requires ORGANIZER or ADMIN role
  - /competitor/* -> requires COMPETITOR role
  - /admin/*      -> requires ADMIN role
  - /api/*        -> role checks per endpoint
```

### 3.4 User Migration
- Export existing WP users (email, display_name, role)
- Hash new passwords with bcrypt
- Send password reset emails to all migrated users
- Map WP roles: `organisaator` -> ORGANIZER, `subscriber` -> COMPETITOR

---

## Phase 4: API Routes (Next.js Route Handlers)

Replace all 50+ PHP endpoints with Next.js API route handlers.

### 4.1 File Structure
```
src/app/api/
  auth/
    [...nextauth]/route.ts
    register/route.ts
  bookings/
    route.ts                        # GET all, POST create
    [id]/
      route.ts                      # GET by id, PATCH update, DELETE
      status/route.ts               # PATCH status
  handlers/
    route.ts                        # GET all handlers
    me/route.ts                     # GET/POST/PATCH my handler
  dogs/
    route.ts                        # POST create
    me/route.ts                     # GET my dogs
    [id]/route.ts                   # PATCH update, DELETE
    search/route.ts                 # GET search
  competitors/
    route.ts                        # POST register
    [id]/
      route.ts                      # DELETE, PATCH status, PUT update
      tracks/route.ts               # PUT update tracks
    booking/[id]/route.ts           # GET competitors for booking
    my-bookings/
      route.ts                      # GET my registrations
      [id]/
        route.ts                    # DELETE unregister
        tracks/route.ts             # PUT update tracks
        info/route.ts               # PATCH update info
  competitions/
    [id]/
      info/route.ts                 # GET/POST competition info
      combined/route.ts             # GET combined info
      reg-close-date/route.ts       # PATCH
      reg-status/route.ts           # PATCH
    tracks/[id]/route.ts            # DELETE track
    latest-descriptions/route.ts    # GET
  start-protocol/
    [bookingId]/
      route.ts                      # GET/POST protocol
      publish/route.ts              # PATCH toggle publish
      public/route.ts               # GET public protocol
      team-order/route.ts           # POST team order
  teams/
    [bookingId]/
      route.ts                      # GET/POST teams
      lock/route.ts                 # PATCH toggle lock
      publish/route.ts              # PATCH toggle publish
      results/route.ts              # GET/POST results
      member-results/route.ts       # GET member results
      public/route.ts               # GET public teams
  awardings/
    [bookingId]/
      route.ts                      # GET/POST awardings
      public/route.ts               # GET public
  results/
    tracks/[bookingId]/route.ts     # GET results tracks
    track/[trackId]/route.ts        # GET track results
    parameters/[trackId]/route.ts   # POST save parameters
    save/route.ts                   # POST save result
    public/[bookingId]/route.ts     # GET public results
    dog-progression/[dogId]/route.ts # GET class progression
  dog-statistics/
    route.ts                        # GET search
    options/route.ts                # GET dropdown options
    autocomplete/route.ts           # GET autocomplete
    my-results/route.ts             # GET my dog results
  dog-measurements/
    dog/[dogId]/route.ts            # GET by dog
    booking/[bookingId]/route.ts    # GET by booking
    route.ts                        # POST add
    [id]/route.ts                   # DELETE
  dashboard/route.ts                # GET my dashboard
```

### 4.2 Auth Middleware Pattern
Each route handler checks session and role:
```ts
// Example pattern
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ORGANIZER') return Response.json({ error: 'Forbidden' }, { status: 403 });
  // ... business logic with Prisma
}
```

---

## Phase 5: Frontend Pages

### 5.1 App Router Structure
```
src/app/
  (public)/                         # Public layout (no auth)
    page.tsx                        # Landing / calendar page
    competitions/page.tsx           # Public competitions list
    results/[id]/page.tsx           # Public results
    start-protocol/page.tsx         # Public start protocol list
    start-protocol/[id]/page.tsx    # Public start protocol detail
    login/page.tsx
    register/page.tsx

  (organizer)/                      # Organizer layout (requires ORGANIZER role)
    organizer/
      page.tsx                      # Dashboard / links page (LinksPage)
      competitions/page.tsx         # Choose competition (ChooseCompetition)
      competition/[id]/
        page.tsx                    # Competition info (AddCompetitionInfo)
        competitors/page.tsx        # Competitor table (CompetitorTable)
        protocol/page.tsx           # Start protocol (StartProtocol)
        teams/page.tsx              # Teams management (Teams)
        results/page.tsx            # Competition results overview (CompetitionResults)
        results/[trackId]/page.tsx  # Track results entry (TrackResults)
        awardings/page.tsx          # Awardings (Awardings)
        ajakava/page.tsx            # Timeline generator (Ajakava)
      new/page.tsx                  # Register new competition (RegisterBookings)

  (competitor)/                     # Competitor layout (requires COMPETITOR role)
    competitor/
      page.tsx                      # Dashboard (CompetitorPageView)
      profile/page.tsx              # Handler info (CompetitorAddInfo)
      dogs/page.tsx                 # My dogs (CompetitorDogs)
      competitions/page.tsx         # My competitions (CompetitorCompetitions)
      results/page.tsx              # My results (TulemusedPage)
      register/[id]/page.tsx        # Register for competition (CompetitorRegisterPage)
      registered/[id]/page.tsx      # Registration confirmation (RegisteredPage)

  (admin)/                          # Admin panel (future)
    admin/
      page.tsx                      # Admin dashboard
      users/page.tsx                # User management
```

### 5.2 Shared Components to Build
| Component | Current file | Purpose |
|-----------|-------------|---------|
| NavBar | navBar.tsx | Navigation with role-based links |
| DateRangeFilter | DateRangeFilter.tsx | Date filtering |
| SearchableSelect | SearchableSelect.tsx | Dropdown with search |
| TrackEditor | TrackEditor.tsx | Track configuration |
| TrackInputRow | TrackInputRow.tsx | Single track input |
| DescriptionEditors | DescriptionEditors.tsx | Rich text EST/ENG |
| RefereeManager | RefereeManager.tsx | Add/remove referees |
| SponsorImageManager | SponsorImageManager.tsx | Upload sponsor logos |
| CompetitionTopMenu | CompetitionTopMenu.tsx | Competition sub-navigation |
| ResultEntryModal | ResultEntryModal.tsx | Enter competitor results |
| AuthGate | AuthGate.tsx | Login prompt for public pages |
| HandlerInfo | HandlerInfo.tsx | Handler display |
| TrackSelector | TrackSelector.tsx | Select tracks for registration |
| DogSelector | DogSelector.tsx | Select dog for registration |
| CompetitionInfoDisplay | CompetitionInfoDisplay.tsx | Show competition details |
| RegisteredCompetitors | RegisteredCompetitors.tsx | List of registered competitors |
| MaxCompetitorsSection | MaxCompetitorsSection.tsx | Max competitor limits |
| TrackSizeTable | TrackSizeTable.tsx | Track parameters table |
| RelayResultsSection | RelayResultsSection.tsx | Relay/team results |
| DogStatistics | DogStatistics.tsx | Dog stats search & display |
| LangToggle | (in navBar) | EST/ENG toggle |

### 5.3 Features to Preserve
- PDF export (start protocol, results) - jsPDF
- Excel export (competitor lists) - xlsx
- Rich text editor (competition descriptions EST/ENG) - Tiptap
- Drag & drop (start protocol ordering)
- Dog statistics search with autocomplete
- Vaccination date validation
- Registration status auto-close (cron -> Next.js cron or Vercel cron)
- i18n EST/ENG on competitor side

---

## Phase 6: Data Migration

### 6.1 Migration Script
Write a Node.js script to migrate data from the existing WordPress MySQL DB to the new Prisma schema.

```
scripts/
  migrate-data.ts
    1. Export wp_users -> User table (hash new passwords)
    2. Export wp_handlers -> Handler table (link to User by user_id)
    3. Export wp_dogs -> Dog table
    4. Export wp_bookings -> Booking table
    5. Export wp_competition_info -> CompetitionInfo table
    6. Export wp_competition_tracks -> CompetitionTrack table
    7. Export wp_competitors -> Competitor table
    8. Export wp_competitor_tracks -> CompetitorTrack table
    9. Export wp_start_protocol -> StartProtocol table
    10. Export wp_track_results -> TrackResult table
    11. Export wp_competitor_results -> CompetitorResult table
    12. Export wp_teams -> Team table
    13. Export wp_team_members -> TeamMember table
    14. Export wp_team_results -> TeamResult table
    15. Export wp_dog_measurements -> DogMeasurement table
```

### 6.2 User Migration Strategy
1. Export all WP users with roles
2. Create new User records with temporary passwords
3. Send "set your password" emails to all users
4. Keep old IDs as reference during migration

---

## Phase 7: Cron Jobs

Replace WordPress cron with Next.js cron (or Vercel cron).

### 7.1 Registration Auto-Close
```
src/app/api/cron/close-registration/route.ts
  - Runs daily
  - Checks reg_close_date < today
  - Updates reg_status to 'reg_closed'
  - Trigger: Vercel cron or system crontab calling the endpoint
```

---

## Phase 8: Deployment

### 8.1 Option A: VPS (Recommended for your case)
```
- Ubuntu VPS (same server or new)
- Node.js 20+ with PM2
- Nginx reverse proxy
- MySQL (existing or new DB)
- SSL via Let's Encrypt
- Subdomain: app.agilityliit.ee or just agilityliit.ee
```

### 8.2 Option B: Vercel
```
- Push to GitHub -> auto deploy
- Vercel handles SSL, CDN, serverless functions
- External MySQL (PlanetScale, Railway, or your existing server)
- Vercel Cron for scheduled tasks
```

### 8.3 Domain Setup
- Point `agilityliit.ee` (or subdomain) to the new app
- Keep old WP running on a different subdomain during transition
- Switch DNS when ready

---

## Phase 9: Build Order (Implementation Sequence)

### Step 1 - Foundation (Week 1)
- [ ] Initialize Next.js project with TypeScript
- [ ] Set up Tailwind CSS
- [ ] Set up Prisma with MySQL, define schema
- [ ] Run `prisma db push` to create tables
- [ ] Set up NextAuth.js with credentials provider
- [ ] Build login & register pages
- [ ] Build middleware for role-based route protection

### Step 2 - Core API (Week 2)
- [ ] Bookings CRUD API routes
- [ ] Handlers API routes
- [ ] Dogs API routes
- [ ] Competitors API routes
- [ ] Competition info API routes

### Step 3 - Competitor Side (Week 3)
- [ ] Competitor dashboard
- [ ] Handler profile (add/edit)
- [ ] Dog management (add/edit/delete)
- [ ] Competition list & registration flow
- [ ] Track selection during registration
- [ ] My competitions & registrations view

### Step 4 - Organizer Side (Week 4-5)
- [ ] Organizer dashboard
- [ ] Create new competition form
- [ ] Competition info editor (rich text, tracks, sponsors)
- [ ] Competitor table (view/manage registrations)
- [ ] Accept/reject competitors
- [ ] Organizer add competitor (new + existing)
- [ ] **Ajakava (Timeline Generator)** - Generate competition day schedule
  - Input: start time, tracks with build/inspection/run times, competitor counts per size (XS/S/M/SL/L)
  - Output: timeline table (time + activity for each track phase)
  - Export to PDF and Excel
  - Page: `/organizer/competition/[id]/ajakava`
  - Auto-populate competitor counts from registered competitors when available

### Step 5 - Protocol & Results (Week 5-6)
- [ ] Start protocol management (ordering, drag & drop)
- [ ] Start protocol publish/public view
- [ ] Track parameters entry
- [ ] Result entry modal
- [ ] Competition results overview
- [ ] Public results page

### Step 6 - Teams & Awardings (Week 6-7)
- [ ] Teams management (create, assign members)
- [ ] Team lock/publish
- [ ] Team results entry
- [ ] Combined awardings
- [ ] Public teams & awardings views

### Step 7 - Advanced Features (Week 7-8)
- [ ] Dog statistics search with autocomplete
- [ ] Dog measurements
- [ ] Dog class progression
- [ ] PDF export (protocol, results)
- [ ] Excel export (competitor lists)
- [ ] i18n (EST/ENG) on competitor side
- [ ] Registration auto-close cron

### Step 8 - Polish & Migration (Week 8-9)
- [ ] Data migration script
- [ ] Test with production data copy
- [ ] Public pages (competition list, results, protocol)
- [ ] Responsive design / mobile fixes
- [ ] Error handling & loading states
- [ ] Deploy to staging

### Step 9 - Go Live (Week 9-10)
- [ ] Final data migration
- [ ] DNS switch
- [ ] Send password reset emails to all users
- [ ] Monitor & fix issues
- [ ] Decommission WordPress

---

## File Structure Summary

```
agility-nextjs/
  src/
    app/
      (public)/               # Public pages (no auth)
      (organizer)/            # Organizer pages (role-gated)
      (competitor)/           # Competitor pages (role-gated)
      (admin)/                # Admin pages (future)
      api/                    # All API route handlers
      layout.tsx              # Root layout
      globals.css             # Global styles
    components/
      ui/                     # Generic UI components
      organizer/              # Organizer-specific components
      competitor/             # Competitor-specific components
      public/                 # Public page components
    lib/
      db.ts                   # Prisma client singleton
      auth.ts                 # NextAuth config
      validations.ts          # Zod schemas
      utils.ts                # Helper functions
    types/
      index.ts                # Shared TypeScript types
    i18n/
      et.json                 # Estonian translations
      en.json                 # English translations
  prisma/
    schema.prisma             # Database schema
  scripts/
    migrate-data.ts           # Data migration from WP
  public/
    images/                   # Static images
  .env                        # Environment variables
  next.config.ts
  tailwind.config.ts
  tsconfig.json
  package.json
```

---

## Key Improvements Over Current System

| Current (WordPress) | New (Next.js) |
|---------------------|---------------|
| 2 separate repos | 1 unified codebase |
| 59KB monolith API class | Modular route handlers |
| Raw SQL queries | Prisma ORM with type safety |
| WP nonce auth | JWT sessions with NextAuth |
| React embedded in WP theme | Native Next.js React |
| No real-time capability | Easy to add SSE/polling for live results |
| Manual DB migrations | Prisma migrations (version controlled) |
| No input validation | Zod schemas on every endpoint |
| PHP + JS mixed | Full TypeScript end-to-end |
| WordPress overhead on every request | Only your code runs |

---

## Risk Mitigation

1. **Run both systems in parallel** during transition - old WP on subdomain, new app on main domain
2. **Test with production data copy** before going live
3. **Keep WordPress DB backup** for rollback
4. **Gradual rollout** - competitor side first (simpler), then organizer
5. **Same MySQL server** - can read old WP tables directly during migration
