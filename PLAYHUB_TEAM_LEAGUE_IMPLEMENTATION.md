# PlayHub – Lorcana Team League (Implementation Outline)

Source spec: [Lorcana Team League draft 1 (1).pdf](file://Lorcana%20Team%20League%20draft%201%20(1).pdf)

This document is a **build checklist + technical spec** for implementing the “Team League PlayHub” described in the PDF inside this repo’s existing stack:
- Frontend: Vite + React (no router today; mostly modal-based UI)
- Backend: Vercel-style serverless endpoints in `api/`
- Auth: cookie JWT via `api/_lib/auth.js` (`getSession`)
- DB: Postgres via Prisma (`prisma/schema.prisma`)

---

## Goals (what the PlayHub must do)

- **League + Season management** (admin/captain tooling)
- **Player MMR** (100–500), persistent across seasons (per league)
- **Roster constraints**:
  - Captains submit a roster of 5 players with **preseason team cap ≤ 1600**
  - Substitutes allowed weekly if **sub MMR ≤ replaced player MMR** (at time of substitution request)
  - Team MMR may exceed 1600 after matches (cap only for roster construction + subs)
- **Weekly workflow** (regular season + playoffs):
  - Generate **seeded pairings**: seed1 vs seed1 … seed5 vs seed5
  - Scheduling submission (deadline Wednesday 11:59pm)
  - Sub request submission (deadline Tuesday 11:59pm)
  - Result submission (deadline Sunday 11:59pm)
  - “No playing ahead”: future week pairings are viewable but **not reportable**
- **Scoring**:
  - Player points: **+1 per game win +1 per match win**
  - Team week bonus: **+3 for weekly win, +1 for tie, +0 for loss**
  - Live-ish standings: team season points + player season points
- **MMR updates**:
  - Winners’ MMR rises, losers’ MMR drops
  - Must be **auditable** and **recomputable**

---

## Non-goals (v1)

- Automated livestream match selection / streaming tooling
- “SportsCenter” content tooling (we can add later as widgets)
- Fully-automated cron finalization (v1 can be “Admin clicks Finalize Week”)
- Sophisticated anti-cheat / identity verification

---

## Roles & Permissions

- **Admin**
  - Create league + seasons
  - Approve teams/rosters
  - Override results, apply manual point/MMR adjustments
  - Finalize weeks (apply bonuses + MMR updates)
- **Captain**
  - Create team, invite/sign 5 players
  - Submit preseason roster for approval (and confirm weekly lineup if needed)
  - Request substitutes
  - View everything for their team (pairings, standings, history)
- **Player**
  - View schedule, submit availability / confirm schedule
  - Submit results for their own pairing (or confirm opponent’s submission)

Implementation note: the current repo has “authenticated users” but no explicit roles. For v1 we can model “admins” as a list of emails in env/config, or add a `role` column on `User`.

---

## UX / Screen Map (MVP-first)

### Public/Read-only pages (no auth required, optional in MVP)
- **League Landing**: list seasons, current week, top standings
- **Season Standings**: team standings + player standings
- **Week View**: matchups, seeded pairings, reported results

### Authenticated (MVP)
- **My League Dashboard**
  - “My Team” card (captain tools if captain)
  - “My Matches this Week”
  - quick links: schedule, submit result, standings
- **Team Page**
  - roster + MMR totals, season points, match history
  - captain-only actions: submit roster, request sub
- **Week Pairings Page**
  - shows only current week editable actions (schedule + report result)
  - future weeks view-only
- **Admin Console**
  - approve rosters
  - resolve disputes
  - finalize week

UI approach suggestion (matches current app): a top-level “PlayHub” modal (like `TeamHub`) with tabs.

---

## Data Model (Proposed Prisma Models)

### Design principles
- Use **ledgers** for points and MMR so we can re-run calculations and keep an audit trail.
- Separate “season roster” from “league identity” because rosters change season-to-season.
- Store “snapshotted MMR” on match participation rows to preserve the “sub MMR ≤ replaced player MMR” rule at the time of request.

### Proposed Prisma schema additions (draft)
Add these models to `prisma/schema.prisma` (names can change, relationships are what matter):

```prisma
enum LeagueRole {
  PLAYER
  CAPTAIN
  ADMIN
}

enum SeasonPhase {
  OFFSEASON
  REGULAR
  PLAYOFFS
  COMPLETE
}

enum WeekType {
  REGULAR
  PLAYOFF
  OFFSEASON
}

enum MatchState {
  DRAFT      // generated but not opened yet
  OPEN       // current week, schedulable/reportable
  LOCKED     // deadline passed, awaiting admin resolution/finalize
  FINAL      // finalized; ledgers written
}

enum PairingState {
  PENDING_SCHEDULE
  SCHEDULED
  REPORTED
  DISPUTED
  FINAL
}

enum PointsEventType {
  GAME_WIN
  MATCH_WIN
  TEAM_WEEK_BONUS
  ADMIN_ADJUSTMENT
}

enum MMREventType {
  MATCH_RESULT
  ADMIN_ADJUSTMENT
  INITIAL_RATING
}

model League {
  id          String   @id @default(uuid())
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  seasons     Season[]
  members     LeagueMember[]

  @@index([name])
}

model LeagueMember {
  id        String     @id @default(uuid())
  leagueId  String
  userId    String
  role      LeagueRole @default(PLAYER)
  joinedAt  DateTime   @default(now())

  league    League     @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([leagueId, userId])
  @@index([leagueId])
  @@index([userId])
}

// Persistent rating per league (carries across seasons)
model LeagueRating {
  id        String   @id @default(uuid())
  leagueId  String
  userId    String
  mmr       Int      @default(250) // 100..500 (enforce in app)
  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())

  league    League   @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  events    MMREvent[]

  @@unique([leagueId, userId])
  @@index([leagueId])
  @@index([userId])
}

model Season {
  id          String      @id @default(uuid())
  leagueId    String
  name        String      // "Season 1", "2026 S1", etc.
  phase       SeasonPhase @default(OFFSEASON)

  // Config (from PDF; make editable)
  rosterSize          Int @default(5)
  preseasonTeamMmrCap Int @default(1600)
  mmrMin              Int @default(100)
  mmrMax              Int @default(500)
  regularWeeks        Int @default(16)
  playoffWeeks        Int @default(4)
  offseasonWeeks      Int @default(4)

  // Deadlines (store as local-time strings + timezone, or UTC instants per week)
  timezone            String @default("America/New_York")
  subDeadlineDow      Int    @default(2) // Tue
  scheduleDeadlineDow Int    @default(3) // Wed
  resultsDeadlineDow  Int    @default(0) // Sun

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  league      League   @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  teams       SeasonTeam[]
  weeks       SeasonWeek[]
  points      PointsEvent[]

  @@index([leagueId])
}

model SeasonTeam {
  id          String   @id @default(uuid())
  seasonId    String
  name        String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Captain is a user (must be on roster, but enforce in app)
  captainUserId String

  season      Season   @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  captain     User     @relation(fields: [captainUserId], references: [id], onDelete: Restrict)
  rosterSlots SeasonRosterSlot[]
  points      PointsEvent[]

  @@index([seasonId])
  @@index([captainUserId])
  @@unique([seasonId, name])
}

// Exactly 5 slots; store snapshots to compute cap and seedings at specific times
model SeasonRosterSlot {
  id          String   @id @default(uuid())
  seasonTeamId String
  slotIndex   Int      // 1..5
  userId      String
  mmrAtLock   Int      // snapshot at roster approval time (or weekly lock)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  seasonTeam  SeasonTeam @relation(fields: [seasonTeamId], references: [id], onDelete: Cascade)
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([seasonTeamId, slotIndex])
  @@index([seasonTeamId])
  @@index([userId])
}

model SeasonWeek {
  id        String    @id @default(uuid())
  seasonId  String
  weekIndex Int       // 1..N
  type      WeekType  @default(REGULAR)
  state     MatchState @default(DRAFT)

  // Set when week becomes current (controls "no playing ahead")
  opensAt   DateTime?
  locksAt   DateTime?

  createdAt DateTime @default(now())

  season    Season    @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  matchups  WeekMatchup[]

  @@unique([seasonId, weekIndex])
  @@index([seasonId])
}

model WeekMatchup {
  id        String    @id @default(uuid())
  seasonWeekId String
  teamAId   String
  teamBId   String
  state     MatchState @default(DRAFT)

  // computed/locked team seed order for this matchup (optional)
  createdAt DateTime @default(now())

  seasonWeek SeasonWeek @relation(fields: [seasonWeekId], references: [id], onDelete: Cascade)
  teamA     SeasonTeam @relation("MatchupTeamA", fields: [teamAId], references: [id], onDelete: Restrict)
  teamB     SeasonTeam @relation("MatchupTeamB", fields: [teamBId], references: [id], onDelete: Restrict)
  pairings  SeedPairing[]

  @@index([seasonWeekId])
  @@index([teamAId])
  @@index([teamBId])
}

model SeedPairing {
  id          String       @id @default(uuid())
  matchupId   String
  seedIndex   Int          // 1..5
  state       PairingState @default(PENDING_SCHEDULE)

  // Who is playing (after subs, etc)
  playerAId   String
  playerBId   String

  // Snapshots for rules + audit
  mmrAAtCreate Int
  mmrBAtCreate Int

  // Scheduling
  scheduledFor DateTime?
  scheduleProposedByUserId String?
  scheduleConfirmedByA Boolean @default(false)
  scheduleConfirmedByB Boolean @default(false)

  // Result reporting
  gamesWonA   Int @default(0)
  gamesWonB   Int @default(0)
  reportedByUserId String?
  reportedAt DateTime?
  confirmedByOpponent Boolean @default(false)

  matchup     WeekMatchup @relation(fields: [matchupId], references: [id], onDelete: Cascade)
  playerA     User        @relation("PairingPlayerA", fields: [playerAId], references: [id], onDelete: Restrict)
  playerB     User        @relation("PairingPlayerB", fields: [playerBId], references: [id], onDelete: Restrict)

  @@unique([matchupId, seedIndex])
  @@index([matchupId])
  @@index([playerAId])
  @@index([playerBId])
}

model PointsEvent {
  id        String          @id @default(uuid())
  seasonId  String
  weekId    String?
  teamId    String?
  userId    String?
  type      PointsEventType
  points    Int
  reason    String?
  createdAt DateTime @default(now())

  season    Season    @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  week      SeasonWeek? @relation(fields: [weekId], references: [id], onDelete: SetNull)
  team      SeasonTeam? @relation(fields: [teamId], references: [id], onDelete: SetNull)
  user      User?       @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([seasonId])
  @@index([weekId])
  @@index([teamId])
  @@index([userId])
  @@index([type])
}

model MMREvent {
  id        String       @id @default(uuid())
  leagueId  String
  userId    String
  type      MMREventType
  delta     Int
  mmrBefore Int
  mmrAfter  Int
  reason    String?
  createdAt DateTime @default(now())

  rating    LeagueRating? @relation(fields: [leagueId, userId], references: [leagueId, userId], onDelete: Cascade)

  @@index([leagueId])
  @@index([userId])
  @@index([createdAt])
}
```

### Extend `User` model
Add these relations to `User` (names must match relations above):

```prisma
model User {
  // ... existing fields ...
  leagueMemberships LeagueMember[]
  leagueRatings     LeagueRating[]
}
```

---

## API Endpoints (Proposed)

Match existing repo conventions:
- Auth via `getSession(req)`
- Validation via `zod`
- Use Prisma client from `api/_lib/db.js`

### League + Season
- `GET /api/leagues` (public or auth): list leagues
- `POST /api/leagues` (admin): create league
- `GET /api/leagues/[leagueId]` (public): league details + current season pointer
- `POST /api/leagues/[leagueId]/seasons` (admin): create season with config
- `PATCH /api/seasons/[seasonId]` (admin): update season config/phase

### Membership / roles
- `POST /api/leagues/[leagueId]/members` (admin): add member + role
- `PATCH /api/leagues/[leagueId]/members/[userId]` (admin): change role

### Teams + rosters
- `POST /api/seasons/[seasonId]/teams` (captain): create team
- `GET /api/seasons/[seasonId]/teams` (public): list teams + roster + points
- `POST /api/seasons/[seasonId]/teams/[teamId]/roster/submit` (captain): submit roster (enforce cap ≤1600)
- `POST /api/seasons/[seasonId]/teams/[teamId]/roster/approve` (admin): approve (locks `mmrAtLock` snapshots)

### Scheduling + results
- `GET /api/seasons/[seasonId]/weeks/current` (public): current week + deadlines
- `GET /api/seasons/[seasonId]/weeks/[weekIndex]` (public): week details (matchups + pairings)
- `POST /api/pairings/[pairingId]/schedule` (player): propose/confirm time
- `POST /api/pairings/[pairingId]/report` (player): report match score (2-0, 2-1, etc)
- `POST /api/pairings/[pairingId]/confirm` (opponent): confirm reported score
- `POST /api/pairings/[pairingId]/dispute` (either): mark disputed + note

### Substitutions
- `POST /api/pairings/[pairingId]/sub-request` (captain): request substitute
  - Must include `subUserId`
  - Validate: `subMMR <= replacedPlayerMMR` (at request time)
- `POST /api/pairings/[pairingId]/sub-approve` (admin): approve substitution and update pairing players

### Week finalization (MVP: manual admin action)
- `POST /api/weeks/[weekId]/finalize` (admin)
  - Preconditions:
    - all pairings are final OR admin chooses to forfeit/resolve outstanding
  - Actions:
    - write player points events (game wins + match win)
    - compute team totals and write team week bonus event (+3/+1/+0)
    - apply MMR changes as `MMREvent` and update `LeagueRating.mmr`
    - set week/matchup/pairing states to FINAL

---

## Core Calculations (implement as pure functions)

### Seed ordering
- Each week, compute team’s seed1..seed5 order by **current MMR** (or by `mmrAtLock` for that week if you want stable seedings).
- Persist the seed order in the week’s `SeedPairing` creation (playerAId/playerBId + mmr snapshots).

### Points
- For each pairing:
  - Player A gets `gamesWonA` points from game wins
  - Player B gets `gamesWonB` points from game wins
  - Winner gets +1 match win point (ties: none, unless you define)
- For each team matchup:
  - Sum all player points to get each team’s week points
  - Apply bonus:
    - win: +3
    - tie: +1
    - loss: +0

### MMR updates (v1)
The PDF doesn’t specify an exact formula. For v1:
- Add a season config JSON (or constants) for:
  - `matchWinDelta` (e.g., +10 / -10)
  - optional `gameWinDelta` (e.g., +2 / -2)
  - min/max clamp to [100, 500]
- Record all changes as `MMREvent` with before/after.

---

## Implementation Phases (Work Breakdown)

### Phase 0 — Decisions (before coding)
- Decide whether league participation requires site accounts (recommended for v1).
- Decide how admins are defined:
  - quick: env list (`PLAYHUB_ADMIN_EMAILS`)
  - robust: add `User.role` / per-league `LeagueMember.role` (recommended)
- Pick timezone handling strategy (store UTC instants per week vs local-time + tz).
- Pick MMR delta defaults for v1.

### Phase 1 — Database foundation
- Add Prisma models above (or a simplified subset)
- Run migration (`npm run db:migrate`) and generate client
- Add seed scripts (optional) to create League + Season + sample teams

### Phase 2 — Backend APIs (MVP)
- League/season read endpoints
- Team creation + roster submission + approval
- Week generation:
  - Generate weeks + matchups schedule (seeding based)
  - Create seeded pairings for week 1
- Pairing schedule + report + confirm endpoints
- Finalize week endpoint that writes ledgers + updates MMR

### Phase 3 — Frontend “PlayHub” modal (MVP)
- Entry point button in `App.jsx` (similar to `TeamHub`)
- Tabs:
  - Standings
  - This Week (my matches)
  - Teams/Rosters
  - Admin (if admin)
- Forms:
  - captain roster submit UI with cap validation + “remaining cap”
  - report result UI (2-0 / 2-1 etc) + opponent confirmation prompt

### Phase 4 — Substitutions + deadlines
- Sub request/approval flow
- Deadline banners + state changes:
  - lock schedule edits after Wed
  - lock reporting after Sun (unless admin)
- Add “dispute” flow for mismatched reports

### Phase 5 — Playoffs + offseason (v2)
- Playoff bracket generation (top X teams)
- Offseason free agency tooling (register each season, captains sign)
- “initial MMR” calculation for new players

---

## Edge Cases to explicitly handle

- A player is both captain and in roster (should be allowed)
- Captain tries to submit roster >1600 cap (block)
- Captain tries to substitute with higher MMR than replaced player (block)
- A pairing has no result by Sunday:
  - v1: admin resolves with forfeit result + ledger events
- Conflicting result submissions:
  - if playerA submits, require playerB confirm; otherwise “DISPUTED” after mismatch
- A user leaves team mid-season (decide: disallow vs allow with admin action)
- Team seeding changes week-to-week due to MMR changes

---

## Repo File/Folder Proposal

Backend:
- `api/leagues/index.js`
- `api/leagues/[leagueId].js`
- `api/leagues/[leagueId]/seasons.js`
- `api/leagues/[leagueId]/members.js`
- `api/seasons/[seasonId].js`
- `api/seasons/[seasonId]/teams/index.js`
- `api/seasons/[seasonId]/teams/[teamId]/roster/submit.js`
- `api/seasons/[seasonId]/teams/[teamId]/roster/approve.js`
- `api/seasons/[seasonId]/weeks/current.js`
- `api/seasons/[seasonId]/weeks/[weekIndex].js`
- `api/pairings/[pairingId]/schedule.js`
- `api/pairings/[pairingId]/report.js`
- `api/pairings/[pairingId]/confirm.js`
- `api/pairings/[pairingId]/dispute.js`
- `api/pairings/[pairingId]/sub-request.js`
- `api/pairings/[pairingId]/sub-approve.js`
- `api/weeks/[weekId]/finalize.js`

Frontend:
- `src/components/PlayHub.jsx` (main modal)
- `src/components/playhub/Standings.jsx`
- `src/components/playhub/ThisWeek.jsx`
- `src/components/playhub/Teams.jsx`
- `src/components/playhub/Admin.jsx`

Shared logic:
- `src/utils/playhub/points.ts` (or `.js`) – points computation
- `src/utils/playhub/mmr.ts` – mmr computation + clamping

---

## “Done” definition for MVP

- Can create a league + season (admin)
- Captains can create teams and submit 5-player rosters
- System enforces preseason cap ≤1600
- Admin can approve rosters (locks roster snapshots)
- System generates a week with seeded pairings
- Players can schedule and report results
- Admin can finalize the week:
  - standings update
  - team bonus applied
  - MMR events written and rating updated

