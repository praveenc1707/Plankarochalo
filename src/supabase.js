// ============================================================
// Supabase Configuration — Plan Karo Chalo
// ============================================================
// SETUP (one-time, takes 3 minutes):
//
// 1. Go to https://supabase.com → Sign in with GitHub
// 2. Click "New Project" → name it "plankarochalo" → set a DB password → Create
// 3. Wait ~2 min for project to provision
// 4. Go to "SQL Editor" in the sidebar and run this query:
//
//    create table trips (
//      id text primary key,
//      data jsonb not null default '{}'::jsonb,
//      updated_at timestamptz default now()
//    );
//
//    alter table trips enable row level security;
//    create policy "Allow all" on trips for all using (true) with check (true);
//
//    -- Enable real-time for this table
//    alter publication supabase_realtime add table trips;
//
// 5. Go to Project Settings → API
// 6. Copy "Project URL" and "anon/public" key
// 7. Add them as env vars (see .env.example)
// ============================================================

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

let supabase = null;

function isConfigured() {
  return !!supabaseUrl && !!supabaseKey;
}

if (isConfigured()) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: { params: { eventsPerSecond: 10 } },
  });
}

// ── CRUD Operations ──

export async function loadTrip(id) {
  if (!supabase) return loadTripLocal(id);
  try {
    const { data, error } = await supabase
      .from("trips")
      .select("data")
      .eq("id", id)
      .single();
    if (error || !data) return loadTripLocal(id);
    return data.data;
  } catch (e) {
    console.error("Supabase read failed:", e);
    return loadTripLocal(id);
  }
}

export async function saveTrip(trip) {
  if (!supabase) return saveTripLocal(trip);
  try {
    const { error } = await supabase
      .from("trips")
      .upsert(
        { id: trip.id, data: trip, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
    if (error) {
      console.error("Supabase write failed:", error);
    }
    saveTripLocal(trip);
  } catch (e) {
    console.error("Supabase write failed:", e);
    saveTripLocal(trip);
  }
}

// ── Real-time Subscription ──

export function subscribeTripUpdates(id, callback) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`trip-${id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "trips",
        filter: `id=eq.${id}`,
      },
      (payload) => {
        if (payload.new && payload.new.data) {
          callback(payload.new.data);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ── localStorage fallback (works without Supabase for single-device testing) ──

function loadTripLocal(id) {
  try {
    const raw = localStorage.getItem("pkc-" + id);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveTripLocal(trip) {
  try {
    localStorage.setItem("pkc-" + trip.id, JSON.stringify(trip));
  } catch (e) {
    console.error(e);
  }
}

export { isConfigured };
