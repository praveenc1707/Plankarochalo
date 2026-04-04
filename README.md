# Plan Karo Chalo

Group trip planning for Indian friend groups. No app download. No chaos.

## Deploy to Vercel (3 steps, ~10 minutes)

### Step 1: Set up Supabase (3 min — needed for multi-user)

1. Go to [supabase.com](https://supabase.com) → Sign in with GitHub
2. Click **New Project** → name it `plankarochalo` → set a DB password → **Create Project**
3. Wait ~2 min for provisioning
4. In the left sidebar, click **SQL Editor**
5. Paste and run this query:

```sql
create table trips (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table trips enable row level security;
create policy "Allow all" on trips for all using (true) with check (true);

-- Enable real-time for this table
alter publication supabase_realtime add table trips;
```

6. Go to **Project Settings** → **API**
7. Copy **Project URL** and the **anon / public** key — you'll need them in Step 3

### Step 2: Deploy to Vercel (3 min)

**Option A — GitHub (recommended):**

```bash
git init
git add .
git commit -m "Plan Karo Chalo MVP"
git remote add origin https://github.com/YOUR_USERNAME/plankarochalo.git
git push -u origin main
```

Then go to [vercel.com/new](https://vercel.com/new), import the repo, and deploy.

**Option B — Vercel CLI (fastest):**

```bash
npm install -g vercel
cd plankarochalo
npm install
vercel
```

### Step 3: Add Supabase env variables in Vercel (1 min)

In Vercel dashboard → your project → **Settings** → **Environment Variables**

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` (from Step 1) |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` (from Step 1) |

Click **Redeploy** to apply. Done!

## Local Development

```bash
cp .env.example .env    # fill in your Supabase values
npm install
npm run dev
```

Open http://localhost:5173

## How It Works

- **Without Supabase:** Works in single-device mode using localStorage. Good for testing.
- **With Supabase:** Full multi-user real-time sync. Multiple people join the same trip and see updates instantly.

## Architecture

```
src/
├── main.jsx          # React entry point
├── App.jsx           # Full app — all screens, stages, components
├── supabase.js       # Supabase config + storage abstraction
└── index.css         # Global styles
```

**Storage layer:** `supabase.js` exports `loadTrip()`, `saveTrip()`, and `subscribeTripUpdates()`. With Supabase configured, it uses PostgreSQL with real-time subscriptions (Postgres Changes). Without Supabase, it falls back to localStorage.

**Database schema:** One table, one row per trip. The `data` column stores the full trip object as JSONB. Simple, zero migrations, no ORM.

```
trips
├── id          text (primary key) — 6-char trip code
├── data        jsonb              — full trip state
└── updated_at  timestamptz        — last modified
```

**No backend needed.** Supabase handles all data persistence and real-time sync. Vercel serves the static frontend.

## Tech Stack

- **React 19** — UI
- **Vite 6** — Build
- **Supabase** — PostgreSQL + real-time subscriptions
- **Vercel** — Static hosting
- **PWA** — Installable on mobile
