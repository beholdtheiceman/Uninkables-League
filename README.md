# Uninkables League Hub

Vite + React frontend with Vercel serverless APIs in `api/` and Postgres/Prisma in `prisma/`.

## Branching
- **main**: production
- **develop**: integration/testing

## Local Setup

### 1) Install

```bash
npm install
```

### 2) Environment
Create a `.env` file (see `env.example`):

- `DATABASE_URL` (Postgres)
- `JWT_SECRET`
- `BCRYPT_COST` (optional)
- `PLAYHUB_ADMIN_EMAILS` (comma-separated emails)

### 3) Prisma

```bash
npx prisma generate
npx prisma migrate dev
```

### 4) Run
Frontend (Vite):

```bash
npm run dev
```

API routes are proxied under `/api` to `http://localhost:3000` via `vite.config.js`.

## Vercel Deploy
- This repo includes a `vercel.json` configured for Vite + SPA rewrites.
- Ensure your Vercel project is deploying the **main** branch for production.

## Key Admin Flows (MVP)
- Create League/Season (Admin tab)
- Create teams + submit rosters (Teams tab)
- Approve rosters + generate full schedule + open a week (Admin tab)
- Players schedule/report/confirm in "This Week"
- Admin can resolve disputes/force results, approve subs, then finalize the week