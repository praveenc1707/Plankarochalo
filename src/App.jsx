import { useState, useEffect, useRef, useCallback } from "react";
import { loadTrip, saveTrip, subscribeTripUpdates, isConfigured } from "./supabase.js";

const C = {
  green: "#1B4332", greenMid: "#2D6A4F", greenLight: "#40916C", greenAccent: "#52B788", greenPale: "#D8F3DC",
  amber: "#E76F51", amberLight: "#F4A261", amberPale: "#FFECD2",
  dark: "#0F1923", darkSec: "#1A2B3A", bg: "#F7F6F3", bgWarm: "#FAF9F6",
  card: "#FFFFFF", muted: "#7C8594", mutedLight: "#A0AAB8",
  border: "#E8E4DC", borderLight: "#F0EDE8",
};

const STAGE_META = [
  { key: "dates", label: "Dates", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", emoji: "📅" },
  { key: "destination", label: "Destination", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z", emoji: "📍" },
  { key: "budget", label: "Budget", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", emoji: "💰" },
  { key: "plan", label: "Plan", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4", emoji: "📋" },
  { key: "confirm", label: "Confirm", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", emoji: "✅" },
];

const DESTS = [
  { name: "Goa", vibe: "Beach & nightlife", cost: "8,000-15,000", weather: "Hot & sunny", color: "#F4A261", gradient: "linear-gradient(135deg, #F4A261, #E76F51)" },
  { name: "Manali", vibe: "Mountains & snow", cost: "6,000-12,000", weather: "Cool & crisp", color: "#52B788", gradient: "linear-gradient(135deg, #52B788, #2D6A4F)" },
  { name: "Pondicherry", vibe: "French quarter vibes", cost: "5,000-10,000", weather: "Warm & humid", color: "#E76F51", gradient: "linear-gradient(135deg, #E76F51, #BC4749)" },
  { name: "Jaipur", vibe: "Heritage & culture", cost: "5,000-10,000", weather: "Hot & dry", color: "#D4A373", gradient: "linear-gradient(135deg, #D4A373, #BC6C25)" },
  { name: "Coorg", vibe: "Coffee plantations", cost: "4,000-9,000", weather: "Pleasant mist", color: "#588157", gradient: "linear-gradient(135deg, #588157, #344E41)" },
  { name: "Udaipur", vibe: "Lakes & palaces", cost: "6,000-12,000", weather: "Warm", color: "#BC6C25", gradient: "linear-gradient(135deg, #BC6C25, #9A5518)" },
  { name: "Kodaikanal", vibe: "Hill station escape", cost: "4,000-8,000", weather: "Cool & foggy", color: "#386641", gradient: "linear-gradient(135deg, #386641, #1B4332)" },
  { name: "Rishikesh", vibe: "Adventure & spiritual", cost: "3,000-8,000", weather: "Pleasant", color: "#6A994E", gradient: "linear-gradient(135deg, #6A994E, #386641)" },
];

const ITIN = {
  Goa: [{d:1,items:["Arrive & check in","Lunch at beach shack","Evening at Baga Beach","Dinner at Thalassa"]},{d:2,items:["Old Goa churches morning","Lunch at Fontainhas","Dudhsagar Falls afternoon","Night market"]},{d:3,items:["Water sports at Calangute","Spice plantation visit","Sunset cruise","Farewell dinner"]}],
  Manali: [{d:1,items:["Arrive & settle in","Mall Road walk","Hadimba Temple visit","Cafe evening"]},{d:2,items:["Solang Valley morning","Paragliding or skiing","Lunch at Vashisht","Hot springs"]},{d:3,items:["Rohtang Pass day trip","Snow point activities","Return & pack","Farewell dinner"]}],
  default: [{d:1,items:["Arrive & check in","Explore local area","Group lunch","Evening sightseeing"]},{d:2,items:["Morning activity","Landmark visit","Local food crawl","Sunset viewpoint"]},{d:3,items:["Adventure activity","Shopping & souvenirs","Group lunch","Departure prep"]}],
};

function genId() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }
function getMonthDays(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y, m) { return new Date(y, m, 1).getDay(); }
function fmtDate(d) { return new Date(d).toLocaleDateString("en-IN", { month: "short", day: "numeric" }); }

function getTripIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("trip") || null;
}

function Icon({ d, size = 20, color = "currentColor", strokeWidth = 1.8 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
}

/* ── STEPPER ── */

function Stepper({ currentStage, lockedStages }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "20px 0 16px" }}>
      {STAGE_META.map((s, i) => {
        const locked = lockedStages.includes(s.key);
        const active = i === currentStage;
        const future = i > currentStage && !locked;
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: locked ? `linear-gradient(135deg, ${C.greenMid}, ${C.green})` : active ? `linear-gradient(135deg, ${C.amber}, ${C.amberLight})` : C.borderLight,
                boxShadow: locked ? "0 2px 8px rgba(27,67,50,0.25)" : active ? "0 2px 8px rgba(231,111,81,0.3)" : "none",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: active ? "scale(1.1)" : "scale(1)",
              }}>
                {locked ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M5 13l4 4L19 7"/></svg>
                ) : (
                  <span style={{ fontSize: 14, filter: future ? "grayscale(1) opacity(0.4)" : "none" }}>{s.emoji}</span>
                )}
              </div>
              <span style={{
                fontSize: 10, marginTop: 5, fontWeight: active ? 700 : 500,
                color: locked ? C.greenMid : active ? C.amber : C.mutedLight,
                transition: "all 0.3s",
                letterSpacing: active ? "0.3px" : "0",
              }}>{s.label}</span>
            </div>
            {i < 4 && (
              <div style={{
                height: 2, flex: "0 0 16px", borderRadius: 1,
                background: locked ? `linear-gradient(90deg, ${C.greenAccent}, ${C.greenMid})` : C.borderLight,
                transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
              }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── MEMBER AVATARS ── */

function MemberAvatars({ members, size = 32 }) {
  const gradients = [
    "linear-gradient(135deg, #2D6A4F, #52B788)",
    "linear-gradient(135deg, #E76F51, #F4A261)",
    "linear-gradient(135deg, #264653, #2A9D8F)",
    "linear-gradient(135deg, #E9C46A, #F4A261)",
    "linear-gradient(135deg, #606C38, #DDA15E)",
    "linear-gradient(135deg, #BC6C25, #DDA15E)",
    "linear-gradient(135deg, #6D597A, #B56576)",
  ];
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {members.slice(0, 5).map((m, i) => (
        <div key={m.id} title={m.name} style={{
          width: size, height: size, borderRadius: "50%",
          background: gradients[i % gradients.length],
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: size * 0.38, fontWeight: 700, color: "#fff",
          border: "2.5px solid #fff", marginLeft: i > 0 ? -8 : 0,
          zIndex: members.length - i,
          boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
          transition: "transform 0.2s",
        }}>{m.name.charAt(0).toUpperCase()}</div>
      ))}
      {members.length > 5 && (
        <div style={{
          width: size, height: size, borderRadius: "50%",
          background: C.border, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 700, color: C.muted,
          border: "2.5px solid #fff", marginLeft: -8,
          boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
        }}>+{members.length - 5}</div>
      )}
    </div>
  );
}

/* ── PROGRESS ILLUSTRATION ── */

function ProgressBanner({ stage, destination }) {
  const messages = [
    { text: "Let's start planning!", sub: "Pick your dates first" },
    { text: "Dates are set!", sub: "Now choose where to go" },
    { text: "Destination locked!", sub: "Let's talk budget" },
    { text: "Budget agreed!", sub: "Review the plan" },
    { text: "Almost there!", sub: "Confirm your attendance" },
    { text: "Trip confirmed!", sub: destination || "Let's go!" },
  ];
  const s = Math.min(stage, 5);
  const msg = messages[s];
  const progress = (s / 5) * 100;

  return (
    <div className="fade-in-scale" style={{
      margin: "0 0 16px",
      padding: "20px 24px",
      borderRadius: "var(--radius-lg)",
      background: s >= 5
        ? "linear-gradient(135deg, #1B4332 0%, #2D6A4F 50%, #40916C 100%)"
        : "linear-gradient(135deg, #1A2B3A 0%, #0F1923 100%)",
      color: "#fff",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Decorative circles */}
      <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }}/>
      <div style={{ position: "absolute", bottom: -30, right: 40, width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }}/>

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, letterSpacing: "-0.3px" }}>{msg.text}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 16, fontWeight: 500 }}>{msg.sub}</div>

        {/* Progress bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            flex: 1, height: 6, background: "rgba(255,255,255,0.12)",
            borderRadius: 3, overflow: "hidden",
          }}>
            <div style={{
              width: `${progress}%`, height: "100%",
              background: s >= 5
                ? "linear-gradient(90deg, #52B788, #D8F3DC)"
                : "linear-gradient(90deg, #F4A261, #E76F51)",
              borderRadius: 3,
              transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
            }}/>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)", minWidth: 36 }}>{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
}

/* ── STAGE COMPONENTS ── */

function DateStage({ trip, user, onUpdate }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [rangeStart, setRangeStart] = useState(null); // date string of first click
  const myDates = trip.stages.dates.availability?.[user.id] || [];
  const allAvail = trip.stages.dates.availability || {};
  const memberCount = trip.members.length;
  const days = getMonthDays(year, month);
  const firstDay = getFirstDay(year, month);

  function makeDateStr(y, m, d) {
    return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  }

  function getDatesInRange(startStr, endStr) {
    const dates = [];
    const start = new Date(startStr);
    const end = new Date(endStr);
    const lo = start <= end ? start : end;
    const hi = start <= end ? end : start;
    const cur = new Date(lo);
    while (cur <= hi) {
      dates.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }

  function handleDateClick(day) {
    const ds = makeDateStr(year, month, day);

    // If clicking a date that's already in the range, clear the entire range
    if (myDates.includes(ds) && !rangeStart) {
      // Clear all selected dates
      const updated = { ...trip, stages: { ...trip.stages, dates: { ...trip.stages.dates, availability: { ...allAvail, [user.id]: [] } } } };
      onUpdate(updated);
      return;
    }

    if (!rangeStart) {
      // First click — set range start
      setRangeStart(ds);
      // Immediately select just this one date as preview
      const updated = { ...trip, stages: { ...trip.stages, dates: { ...trip.stages.dates, availability: { ...allAvail, [user.id]: [ds] } } } };
      onUpdate(updated);
    } else {
      // Second click — fill entire range
      const rangeDates = getDatesInRange(rangeStart, ds);
      const updated = { ...trip, stages: { ...trip.stages, dates: { ...trip.stages.dates, availability: { ...allAvail, [user.id]: rangeDates } } } };
      onUpdate(updated);
      setRangeStart(null);
    }
  }

  function getOverlap(day) {
    const ds = makeDateStr(year, month, day);
    let count = 0;
    Object.values(allAvail).forEach(arr => { if (arr?.includes?.(ds)) count++; });
    return count;
  }

  // Sort myDates to find range endpoints
  const sortedMyDates = [...myDates].sort();
  const rangeFirst = sortedMyDates[0] || null;
  const rangeLast = sortedMyDates[sortedMyDates.length - 1] || null;

  const bestWindow = (() => {
    const all = {};
    Object.values(allAvail).forEach(arr => { if (Array.isArray(arr)) arr.forEach(d => { all[d] = (all[d] || 0) + 1; }); });
    return Object.entries(all).filter(([,c]) => c >= Math.ceil(memberCount * 0.5)).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([d]) => d);
  })();

  return (
    <div className="fade-in">
      {/* Range selection hint */}
      <div style={{
        marginBottom: 16, padding: "10px 14px",
        background: rangeStart ? `linear-gradient(135deg, ${C.amberPale}, rgba(244,162,97,0.15))` : C.borderLight,
        borderRadius: "var(--radius-sm)",
        border: rangeStart ? `1px solid ${C.amberLight}` : `1px solid ${C.border}`,
        fontSize: 12, fontWeight: 600,
        color: rangeStart ? C.amber : C.muted,
        textAlign: "center",
        transition: "all 0.3s",
      }}>
        {rangeStart
          ? `Start: ${fmtDate(rangeStart)} — now tap your end date`
          : myDates.length > 0
            ? `${fmtDate(rangeFirst)} – ${fmtDate(rangeLast)} (${myDates.length} day${myDates.length !== 1 ? "s" : ""}) · Tap any selected date to clear`
            : "Tap a start date, then tap an end date to select your range"
        }
      </div>

      {/* Month navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <button onClick={() => { if (month === 0) { setMonth(11); setYear(year-1); } else setMonth(month-1); }} style={{
          background: "none", border: `1.5px solid ${C.border}`, cursor: "pointer", fontSize: 16, padding: "8px 12px",
          color: C.dark, borderRadius: 10, display: "flex", alignItems: "center",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.2px" }}>
          {new Date(year, month).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </span>
        <button onClick={() => { if (month === 11) { setMonth(0); setYear(year+1); } else setMonth(month+1); }} style={{
          background: "none", border: `1.5px solid ${C.border}`, cursor: "pointer", fontSize: 16, padding: "8px 12px",
          color: C.dark, borderRadius: 10, display: "flex", alignItems: "center",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, textAlign: "center" }}>
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} style={{ fontSize: 11, color: C.mutedLight, fontWeight: 600, padding: "6px 0", letterSpacing: "0.5px" }}>{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={"e"+i} />)}
        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1;
          const ds = makeDateStr(year, month, day);
          const isMine = myDates.includes(ds);
          const overlap = getOverlap(day);
          const isPast = new Date(year, month, day) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const isBest = bestWindow.includes(ds);
          const isAllFree = overlap === memberCount && memberCount > 1;
          const isRangeStart = ds === rangeFirst && myDates.length > 1;
          const isRangeEnd = ds === rangeLast && myDates.length > 1;
          const isRangeMid = isMine && !isRangeStart && !isRangeEnd && myDates.length > 1;
          const isWaitingEnd = ds === rangeStart && !rangeLast;

          // Uniform color for the entire selected range
          const bg = isPast ? "#F5F4F2"
            : isAllFree ? C.greenMid
            : isMine ? C.greenAccent
            : overlap > 0 ? `rgba(82,183,136,${0.12 + overlap/memberCount*0.25})`
            : "#fff";
          const clr = isPast ? "#ccc" : isMine || isAllFree ? "#fff" : C.dark;

          // Connected range styling: reduce border-radius on inner edges
          const radius = isMine && myDates.length > 1
            ? isRangeStart ? "12px 4px 4px 12px"
              : isRangeEnd ? "4px 12px 12px 4px"
              : "4px"
            : "12px";

          return (
            <button key={day} onClick={() => !isPast && handleDateClick(day)} disabled={isPast} style={{
              width: "100%", aspectRatio: "1",
              borderRadius: radius,
              border: isBest ? `2px solid ${C.amber}` : isPast ? "1px solid transparent" : isMine ? `1px solid ${C.greenAccent}` : "1px solid #EDE9E3",
              background: bg, color: clr, fontSize: 13, fontWeight: isMine || isAllFree ? 700 : 500,
              cursor: isPast ? "default" : "pointer", position: "relative",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: isRangeStart || isRangeEnd ? "0 2px 8px rgba(82,183,136,0.25)" : "none",
              transition: "all 0.15s ease",
              outline: isWaitingEnd ? `2px solid ${C.amber}` : "none",
              outlineOffset: isWaitingEnd ? "-2px" : 0,
            }}>
              {day}
              {overlap > 0 && !isPast && (
                <span style={{
                  position: "absolute", bottom: 2, right: 4,
                  fontSize: 7, color: isAllFree || isMine ? "rgba(255,255,255,0.8)" : C.greenAccent,
                  fontWeight: 800,
                }}>{overlap}</span>
              )}
              {isBest && !isPast && !isMine && (
                <span style={{
                  position: "absolute", top: -1, left: -1,
                  width: 6, height: 6, borderRadius: "50%",
                  background: C.amber,
                }}/>
              )}
            </button>
          );
        })}
      </div>

      {/* Best window */}
      {bestWindow.length > 0 && (
        <div style={{
          marginTop: 20, padding: "14px 16px",
          background: "linear-gradient(135deg, rgba(216,243,220,0.6), rgba(82,183,136,0.12))",
          borderRadius: "var(--radius-md)", border: `1px solid ${C.greenPale}`,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.greenMid, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span>Best overlap</span>
          </div>
          <div style={{ fontSize: 14, color: C.dark, fontWeight: 600 }}>{bestWindow.map(d => fmtDate(d)).join("  ·  ")}</div>
        </div>
      )}

      {/* Legend */}
      <div style={{ marginTop: 14, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 5, color: C.muted }}>
          <span style={{ width: 10, height: 10, borderRadius: 4, background: C.greenAccent }}/>Your range
        </span>
        <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 5, color: C.muted }}>
          <span style={{ width: 10, height: 10, borderRadius: 4, background: C.greenMid }}/>Everyone
        </span>
        <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 5, color: C.muted }}>
          <span style={{ width: 10, height: 10, borderRadius: 4, border: `2px solid ${C.amber}` }}/>Best match
        </span>
      </div>
    </div>
  );
}

function DestinationStage({ trip, user, onUpdate }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newDest, setNewDest] = useState("");
  const options = trip.stages.destination.options || [];
  const votes = trip.stages.destination.votes || {};
  const myVote = votes[user.id];

  function vote(name) {
    const updated = { ...trip, stages: { ...trip.stages, destination: { ...trip.stages.destination, votes: { ...votes, [user.id]: name } } } };
    onUpdate(updated);
  }
  function addOption() {
    if (!newDest.trim()) return;
    const db = DESTS.find(d => d.name.toLowerCase() === newDest.trim().toLowerCase());
    const opt = db || { name: newDest.trim(), vibe: "Custom destination", cost: "Varies", weather: "-", color: "#8D99AE", gradient: "linear-gradient(135deg, #8D99AE, #6C757D)" };
    onUpdate({ ...trip, stages: { ...trip.stages, destination: { ...trip.stages.destination, options: [...options, opt] } } });
    setNewDest(""); setShowAdd(false);
  }
  const vc = {}; Object.values(votes).forEach(v => { vc[v] = (vc[v] || 0) + 1; });
  const total = Object.keys(votes).length;
  const maxVotes = Math.max(...Object.values(vc), 0);

  return (
    <div className="fade-in">
      <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {options.map(opt => {
          const cnt = vc[opt.name] || 0;
          const pct = total ? Math.round(cnt / total * 100) : 0;
          const mine = myVote === opt.name;
          const isLeading = cnt === maxVotes && cnt > 0;
          return (
            <button key={opt.name} onClick={() => vote(opt.name)} style={{
              display: "flex", flexDirection: "column",
              background: C.card,
              border: mine ? `2px solid ${C.greenAccent}` : `1.5px solid ${C.borderLight}`,
              borderRadius: "var(--radius-lg)", overflow: "hidden", cursor: "pointer", textAlign: "left",
              boxShadow: mine ? `0 4px 16px rgba(82,183,136,0.15)` : "var(--shadow-sm)",
              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            }}>
              <div style={{
                height: 56, background: opt.gradient || opt.color || "#ccc",
                display: "flex", alignItems: "center", padding: "0 20px",
                position: "relative", overflow: "hidden",
              }}>
                {/* Decorative wave */}
                <div style={{ position: "absolute", bottom: -1, left: 0, right: 0, height: 12, background: C.card, borderRadius: "14px 14px 0 0" }}/>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.2)", letterSpacing: "-0.3px", zIndex: 1 }}>{opt.name}</span>
                {mine && (
                  <span style={{
                    marginLeft: "auto", background: "rgba(255,255,255,0.95)", borderRadius: 20,
                    padding: "4px 12px", fontSize: 11, fontWeight: 700, color: C.greenMid, zIndex: 1,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}>Your pick</span>
                )}
                {isLeading && !mine && (
                  <span style={{
                    marginLeft: "auto", background: "rgba(255,255,255,0.9)", borderRadius: 20,
                    padding: "4px 10px", fontSize: 10, fontWeight: 700, color: C.amber, zIndex: 1,
                  }}>Leading</span>
                )}
              </div>
              <div style={{ padding: "14px 20px 16px" }}>
                <div style={{ display: "flex", gap: 8, fontSize: 12, color: C.muted, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ background: C.bgWarm, padding: "3px 10px", borderRadius: 6, fontWeight: 500 }}>{opt.vibe}</span>
                  <span style={{ background: C.bgWarm, padding: "3px 10px", borderRadius: 6, fontWeight: 500 }}>Rs {opt.cost}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: 6, background: C.borderLight, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      width: `${pct}%`, height: "100%",
                      background: mine ? `linear-gradient(90deg, ${C.greenAccent}, ${C.greenMid})` : `linear-gradient(90deg, ${C.greenPale}, ${C.greenAccent})`,
                      borderRadius: 3, transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}/>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.dark, minWidth: 40 }}>{cnt} vote{cnt !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {showAdd ? (
        <div className="fade-in" style={{ marginTop: 14, display: "flex", gap: 8 }}>
          <input value={newDest} onChange={e => setNewDest(e.target.value)} placeholder="Destination name..." style={{
            flex: 1, padding: "12px 16px", borderRadius: "var(--radius-md)",
            border: `1.5px solid ${C.border}`, fontSize: 14, outline: "none", background: "#fff",
          }} onKeyDown={e => e.key === "Enter" && addOption()} autoFocus />
          <button onClick={addOption} style={{
            padding: "12px 20px", borderRadius: "var(--radius-md)",
            background: `linear-gradient(135deg, ${C.greenMid}, ${C.green})`,
            color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 2px 8px rgba(27,67,50,0.25)",
          }}>Add</button>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)} style={{
          marginTop: 14, width: "100%", padding: 14,
          borderRadius: "var(--radius-md)",
          border: `2px dashed ${C.border}`, background: "transparent",
          fontSize: 13, color: C.muted, cursor: "pointer", fontWeight: 600,
          transition: "all 0.2s",
        }}>+ Suggest a destination</button>
      )}
    </div>
  );
}

function BudgetStage({ trip, user, onUpdate }) {
  const ranges = trip.stages.budget.ranges || {};
  const myRange = ranges[user.id] || { min: 5000, max: 15000 };
  const [min, setMin] = useState(myRange.min);
  const [max, setMax] = useState(myRange.max);
  const debounce = useRef(null);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      onUpdate({ ...trip, stages: { ...trip.stages, budget: { ...trip.stages.budget, ranges: { ...ranges, [user.id]: { min, max } } } } });
    }, 400);
  }, [min, max]);

  const allR = Object.values(ranges);
  const oMin = allR.length > 0 ? Math.max(...allR.map(r => r.min)) : 0;
  const oMax = allR.length > 0 ? Math.min(...allR.map(r => r.max)) : 0;
  const hasOverlap = oMax >= oMin && allR.length > 1;
  const responded = Object.keys(ranges).length;

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 14, fontWeight: 700, color: C.dark, display: "block", marginBottom: 16, letterSpacing: "-0.2px" }}>
          Your comfortable range <span style={{ fontWeight: 500, color: C.muted, fontSize: 12 }}>(per person)</span>
        </label>

        {/* Min slider */}
        <div style={{
          padding: "16px 20px", background: C.card, borderRadius: "var(--radius-md)",
          border: `1px solid ${C.borderLight}`, marginBottom: 10,
          boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Minimum</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: C.greenMid, letterSpacing: "-0.5px" }}>&#x20B9;{min.toLocaleString("en-IN")}</span>
          </div>
          <input type="range" min={1000} max={50000} step={1000} value={min} onChange={e => { const v = +e.target.value; setMin(Math.min(v, max - 1000)); }} style={{ width: "100%" }} />
        </div>

        {/* Max slider */}
        <div style={{
          padding: "16px 20px", background: C.card, borderRadius: "var(--radius-md)",
          border: `1px solid ${C.borderLight}`, boxShadow: "var(--shadow-sm)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Maximum</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: C.amber, letterSpacing: "-0.5px" }}>&#x20B9;{max.toLocaleString("en-IN")}</span>
          </div>
          <input type="range" min={1000} max={50000} step={1000} value={max} onChange={e => { const v = +e.target.value; setMax(Math.max(v, min + 1000)); }} style={{ width: "100%" }} />
        </div>
      </div>

      {/* Overlap result */}
      <div style={{
        padding: "20px", borderRadius: "var(--radius-lg)",
        background: responded > 1
          ? (hasOverlap ? "linear-gradient(135deg, rgba(216,243,220,0.5), rgba(82,183,136,0.1))" : "linear-gradient(135deg, #FFF0F0, #FFE0E0)")
          : C.borderLight,
        border: hasOverlap ? `1px solid ${C.greenPale}` : responded > 1 ? "1px solid #FFCDD2" : `1px solid ${C.border}`,
        textAlign: "center",
      }}>
        {responded <= 1 ? (
          <>
            <div style={{ fontSize: 24, marginBottom: 8, animation: "pulse 2s infinite" }}>...</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>Waiting for others to respond</div>
          </>
        ) : hasOverlap ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.greenMid, marginBottom: 6, textTransform: "uppercase", letterSpacing: "1px" }}>Group overlap found</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: C.green, letterSpacing: "-0.5px" }}>
              &#x20B9;{oMin.toLocaleString("en-IN")} – &#x20B9;{oMax.toLocaleString("en-IN")}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#C62828", marginBottom: 4 }}>No overlap yet</div>
            <div style={{ fontSize: 12, color: "#E57373" }}>Adjust your range to find common ground</div>
          </>
        )}
        <div style={{ fontSize: 11, color: C.muted, marginTop: 10, fontWeight: 500 }}>
          {responded} of {trip.members.length} responded
        </div>
      </div>
    </div>
  );
}

function PlanStage({ trip, user, onUpdate }) {
  const dest = trip.stages.destination.locked;
  const plan = trip.stages.plan.days?.length > 0 ? trip.stages.plan.days : (ITIN[dest] || ITIN.default);
  const confirmations = trip.stages.confirm?.responses || {};
  const myStatus = confirmations[user.id];

  function confirm(status) {
    onUpdate({ ...trip, stages: { ...trip.stages, plan: { ...trip.stages.plan, days: plan }, confirm: { ...trip.stages.confirm, responses: { ...confirmations, [user.id]: status } } } });
  }
  const inCount = Object.values(confirmations).filter(v => v === "in").length;

  const dayColors = ["#2D6A4F", "#E76F51", "#264653"];

  return (
    <div className="fade-in">
      <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {plan.map((day, dayIdx) => (
          <div key={day.d} style={{
            background: C.card, border: `1px solid ${C.borderLight}`,
            borderRadius: "var(--radius-lg)", overflow: "hidden",
            boxShadow: "var(--shadow-sm)",
          }}>
            <div style={{
              padding: "12px 18px",
              background: dayColors[dayIdx % 3],
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff" }}>{day.d}</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>Day {day.d}</span>
            </div>
            <div style={{ padding: "12px 18px" }}>
              {day.items.map((item, j) => (
                <div key={j} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 0",
                  borderBottom: j < day.items.length - 1 ? `1px solid ${C.borderLight}` : "none",
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: `linear-gradient(135deg, ${C.greenAccent}, ${C.greenMid})`,
                    flexShrink: 0,
                    boxShadow: `0 0 0 3px rgba(82,183,136,0.15)`,
                  }}/>
                  <span style={{ fontSize: 14, fontWeight: 500, color: C.dark }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Confirm section */}
      <div style={{
        padding: 20, background: C.bgWarm,
        borderRadius: "var(--radius-lg)", marginTop: 16,
        border: `1px solid ${C.borderLight}`,
      }}>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 14, color: C.dark, letterSpacing: "-0.3px" }}>Are you in?</div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => confirm("in")} style={{
            flex: 1, padding: 14, borderRadius: "var(--radius-md)",
            border: myStatus === "in" ? `2px solid ${C.greenAccent}` : `1.5px solid ${C.border}`,
            background: myStatus === "in" ? `linear-gradient(135deg, ${C.greenPale}, rgba(82,183,136,0.15))` : "#fff",
            fontSize: 15, fontWeight: 700, cursor: "pointer", color: C.greenMid,
            boxShadow: myStatus === "in" ? "0 4px 12px rgba(82,183,136,0.2)" : "none",
            transition: "all 0.2s",
          }}>
            {myStatus === "in" ? "I'm in!" : "I'm in!"}
          </button>
          <button onClick={() => confirm("out")} style={{
            flex: 1, padding: 14, borderRadius: "var(--radius-md)",
            border: myStatus === "out" ? "2px solid #EF5350" : `1.5px solid ${C.border}`,
            background: myStatus === "out" ? "linear-gradient(135deg, #FFEBEE, rgba(239,83,80,0.1))" : "#fff",
            fontSize: 15, fontWeight: 700, cursor: "pointer", color: "#EF5350",
            boxShadow: myStatus === "out" ? "0 4px 12px rgba(239,83,80,0.15)" : "none",
            transition: "all 0.2s",
          }}>
            Can't make it
          </button>
        </div>
        <div style={{
          marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          fontSize: 13, color: C.muted, fontWeight: 500,
        }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: C.greenMid }}>{inCount}</span>
          <span>of {trip.members.length} confirmed</span>
        </div>
      </div>
    </div>
  );
}

/* ── TRIP DASHBOARD ── */

function TripDashboard({ trip, user, onUpdate, onBack }) {
  const isPlanner = trip.creator === user.id;
  const lockedStages = STAGE_META.filter(s => trip.stages[s.key]?.locked).map(s => s.key);
  const cs = STAGE_META.findIndex(s => !trip.stages[s.key]?.locked);
  const currentIdx = cs >= 0 ? cs : 5;
  const allDone = currentIdx >= 5;
  const inCount = Object.values(trip.stages.confirm?.responses || {}).filter(v => v === "in").length;
  const currentKey = currentIdx < 5 ? STAGE_META[currentIdx].key : null;
  const tripUrl = `${window.location.origin}?trip=${trip.id}`;

  function lockStage(key) {
    let lockedValue = null;
    if (key === "dates") {
      const avail = trip.stages.dates.availability || {};
      const all = {};
      Object.values(avail).forEach(arr => { if (Array.isArray(arr)) arr.forEach(d => { all[d] = (all[d] || 0) + 1; }); });
      const best = Object.entries(all).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => d);
      lockedValue = best.length ? best.map(d => fmtDate(d)).join(", ") : "Flexible";
    } else if (key === "destination") {
      const votes = trip.stages.destination.votes || {};
      const counts = {}; Object.values(votes).forEach(v => { counts[v] = (counts[v] || 0) + 1; });
      lockedValue = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "TBD";
    } else if (key === "budget") {
      const vals = Object.values(trip.stages.budget.ranges || {});
      if (vals.length) { const oMin = Math.max(...vals.map(r => r.min)); const oMax = Math.min(...vals.map(r => r.max)); lockedValue = `\u20B9${oMin.toLocaleString("en-IN")} \u2013 \u20B9${oMax.toLocaleString("en-IN")}`; }
    } else if (key === "plan" || key === "confirm") {
      lockedValue = `${inCount} of ${trip.members.length} confirmed`;
    }
    onUpdate({ ...trip, stages: { ...trip.stages, [key]: { ...trip.stages[key], locked: lockedValue || "Confirmed" } } });
  }

  function shareWA() {
    const dest = trip.stages.destination?.locked || "TBD";
    const dates = trip.stages.dates?.locked || "TBD";
    const budget = trip.stages.budget?.locked || "";
    const pct = Math.round(lockedStages.length / 5 * 100);
    const text = allDone
      ? `We're going to ${dest}! ${dates}${budget ? ", " + budget + "/person" : ""}. ${inCount} of ${trip.members.length} confirmed.\n\nPlan Karo Chalo!\n${tripUrl}`
      : `Our trip is ${pct}% planned! ${lockedStages.length}/5 decisions made.\n\nJoin and help decide:\n${tripUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function copyCode() {
    navigator.clipboard?.writeText(trip.id).then(() => alert("Trip code copied: " + trip.id));
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      {/* Header */}
      <div className="glass-dark" style={{
        padding: "16px 20px 20px",
        background: "linear-gradient(135deg, #0F1923 0%, #1A2B3A 100%)",
        borderRadius: "0 0 24px 24px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={onBack} style={{
            background: "rgba(255,255,255,0.08)", border: "none", color: "#fff",
            cursor: "pointer", width: 36, height: 36, borderRadius: 10,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>{trip.name}</div>
            <button onClick={copyCode} style={{
              background: "rgba(255,255,255,0.08)", border: "none",
              color: "rgba(255,255,255,0.5)", cursor: "pointer",
              fontSize: 11, padding: "3px 12px", borderRadius: 8, marginTop: 4,
              fontWeight: 500,
            }}>Code: {trip.id} · tap to copy</button>
          </div>
          <button onClick={shareWA} style={{
            background: "linear-gradient(135deg, #25D366, #128C7E)", border: "none",
            color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700,
            padding: "8px 14px", borderRadius: 10,
            boxShadow: "0 2px 8px rgba(37,211,102,0.3)",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
            Share
          </button>
        </div>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <MemberAvatars members={trip.members} />
          <span style={{
            fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 500,
            background: "rgba(255,255,255,0.06)", padding: "4px 10px", borderRadius: 6,
          }}>{trip.members.length} member{trip.members.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>
        <Stepper currentStage={currentIdx} lockedStages={lockedStages} />
      </div>

      <div style={{ padding: "0 20px" }}>
        <ProgressBanner stage={lockedStages.length + (allDone ? 1 : 0)} destination={trip.stages.destination?.locked} />
      </div>

      {/* All done celebration */}
      {allDone && (
        <div className="fade-in-scale" style={{
          margin: "0 20px 16px", padding: 24,
          background: "linear-gradient(135deg, #1B4332, #2D6A4F, #40916C)",
          borderRadius: "var(--radius-xl)", textAlign: "center",
          boxShadow: "0 8px 32px rgba(27,67,50,0.3)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -20, left: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }}/>
          <div style={{ position: "absolute", bottom: -10, right: -10, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }}/>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>Trip confirmed!</div>
            <div style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", marginTop: 6, fontWeight: 500 }}>
              {trip.stages.destination?.locked} · {trip.stages.dates?.locked}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
              {trip.stages.budget?.locked}/person · {inCount} going
            </div>
            <button onClick={shareWA} style={{
              marginTop: 16, padding: "12px 28px", borderRadius: 14,
              background: "linear-gradient(135deg, #25D366, #128C7E)",
              color: "#fff", border: "none", fontSize: 14, fontWeight: 700,
              cursor: "pointer", boxShadow: "0 4px 16px rgba(37,211,102,0.3)",
              display: "inline-flex", alignItems: "center", gap: 8,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
              Share on WhatsApp
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: "0 20px 40px" }}>
        {/* Locked stages */}
        <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {lockedStages.map(key => (
            <div key={key} style={{
              padding: "14px 18px", background: C.card,
              borderRadius: "var(--radius-md)",
              border: `1px solid ${C.borderLight}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              boxShadow: "var(--shadow-sm)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: `linear-gradient(135deg, ${C.greenPale}, rgba(82,183,136,0.15))`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.greenMid} strokeWidth="2.5" strokeLinecap="round"><path d="M5 13l4 4L19 7"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.greenMid, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px" }}>
                    {STAGE_META.find(m => m.key === key)?.label}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginTop: 1 }}>{trip.stages[key].locked}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Active stage */}
        {currentKey && !allDone && (
          <div className="fade-in-scale" style={{
            background: C.card,
            borderRadius: "var(--radius-xl)",
            border: `1.5px solid ${C.borderLight}`,
            overflow: "hidden", marginTop: lockedStages.length > 0 ? 12 : 0,
            boxShadow: "var(--shadow-md)",
          }}>
            <div style={{
              padding: "16px 20px",
              background: C.bgWarm,
              borderBottom: `1px solid ${C.borderLight}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{STAGE_META[currentIdx].emoji}</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: C.dark, letterSpacing: "-0.3px" }}>{STAGE_META[currentIdx].label}</span>
              </div>
              <span style={{
                fontSize: 11, padding: "4px 12px", borderRadius: 20,
                background: "linear-gradient(135deg, #FFECD2, #FFE0B2)",
                color: C.amber, fontWeight: 700,
                boxShadow: "0 1px 4px rgba(231,111,81,0.15)",
              }}>Active</span>
            </div>
            <div style={{ padding: 20 }}>
              {currentKey === "dates" && <DateStage trip={trip} user={user} onUpdate={onUpdate} />}
              {currentKey === "destination" && <DestinationStage trip={trip} user={user} onUpdate={onUpdate} />}
              {currentKey === "budget" && <BudgetStage trip={trip} user={user} onUpdate={onUpdate} />}
              {(currentKey === "plan" || currentKey === "confirm") && <PlanStage trip={trip} user={user} onUpdate={onUpdate} />}
            </div>
            {isPlanner && (
              <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.borderLight}` }}>
                <button onClick={() => lockStage(currentKey)} style={{
                  width: "100%", padding: 15,
                  borderRadius: "var(--radius-md)",
                  background: `linear-gradient(135deg, ${C.greenMid}, ${C.green})`,
                  color: "#fff", border: "none", fontSize: 15, fontWeight: 700,
                  cursor: "pointer", letterSpacing: "-0.2px",
                  boxShadow: "0 4px 16px rgba(27,67,50,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  Lock {STAGE_META[currentIdx].label} & proceed
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
            )}
          </div>
        )}

        {!isConfigured() && (
          <div style={{
            marginTop: 20, padding: 16,
            background: "linear-gradient(135deg, #FFFDE7, #FFF9C4)",
            borderRadius: "var(--radius-md)", border: "1px solid #FFE082",
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#F57F17", marginBottom: 4 }}>Single-device mode</div>
            <div style={{ fontSize: 11, color: "#9E9D24", lineHeight: 1.5 }}>Multi-user sync requires Supabase. See README for 3-minute setup.</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── MAIN APP ── */

export default function App() {
  const [screen, setScreen] = useState("home");
  const [user, setUser] = useState(null);
  const [trip, setTrip] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [tripName, setTripName] = useState("");
  const [userName, setUserName] = useState(() => localStorage.getItem("pkc-username") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const unsubRef = useRef(null);

  useEffect(() => {
    const urlTrip = getTripIdFromURL();
    if (urlTrip) setJoinCode(urlTrip);
  }, []);

  useEffect(() => {
    if (!trip?.id) return;
    if (unsubRef.current) unsubRef.current();
    if (isConfigured()) {
      unsubRef.current = subscribeTripUpdates(trip.id, (fresh) => {
        if (JSON.stringify(fresh) !== JSON.stringify(trip)) setTrip(fresh);
      });
    } else {
      const interval = setInterval(async () => {
        const fresh = await loadTrip(trip.id);
        if (fresh && JSON.stringify(fresh) !== JSON.stringify(trip)) setTrip(fresh);
      }, 2000);
      unsubRef.current = () => clearInterval(interval);
    }
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [trip]);

  async function createTrip() {
    if (!userName.trim() || !tripName.trim()) { setError("Enter your name and trip name"); return; }
    setLoading(true);
    const uid = genId(); const tid = genId();
    const u = { id: uid, name: userName.trim() };
    localStorage.setItem("pkc-username", userName.trim());
    const defaultDests = [...DESTS].sort(() => Math.random() - 0.5).slice(0, 3);
    const t = {
      id: tid, name: tripName.trim(), creator: uid, createdAt: Date.now(),
      members: [{ ...u, role: "planner" }],
      stages: {
        dates: { locked: null, availability: {} },
        destination: { locked: null, options: defaultDests, votes: {} },
        budget: { locked: null, ranges: {}, mode: "anonymous" },
        plan: { locked: null, days: [] },
        confirm: { locked: null, responses: {} },
      },
    };
    await saveTrip(t);
    setUser(u); setTrip(t); setScreen("dashboard"); setLoading(false);
    window.history.replaceState({}, "", `?trip=${tid}`);
    const tripUrl = `${window.location.origin}?trip=${tid}`;
    const waText = `Hey! I'm planning a trip — *${tripName.trim()}*\n\nJoin and help decide dates, destination & budget:\n${tripUrl}\n\nTrip code: *${tid}*\n\nPlan Karo Chalo!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, "_blank");
  }

  async function joinTrip() {
    if (!userName.trim() || !joinCode.trim()) { setError("Enter your name and trip code"); return; }
    setLoading(true);
    const t = await loadTrip(joinCode.trim().toUpperCase());
    if (!t) { setError("Trip not found. Check the code."); setLoading(false); return; }
    const uid = genId();
    const u = { id: uid, name: userName.trim() };
    localStorage.setItem("pkc-username", userName.trim());
    if (!t.members.find(m => m.name === u.name)) {
      t.members.push({ ...u, role: "contributor" });
      await saveTrip(t);
    } else {
      const existing = t.members.find(m => m.name === u.name);
      u.id = existing.id;
    }
    setUser(u); setTrip(t); setScreen("dashboard"); setLoading(false);
    window.history.replaceState({}, "", `?trip=${t.id}`);
  }

  async function handleUpdate(updated) {
    setTrip(updated);
    await saveTrip(updated);
  }

  if (screen === "dashboard" && trip && user) {
    return <TripDashboard trip={trip} user={user} onUpdate={handleUpdate} onBack={() => { setScreen("home"); window.history.replaceState({}, "", "/"); }} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
        {/* Hero */}
        <div className="fade-in-up" style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: "linear-gradient(135deg, #1B4332, #2D6A4F, #40916C)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 8px 32px rgba(27,67,50,0.25)",
          }}>
            <span style={{ fontSize: 36 }}>🗺</span>
          </div>
          <h1 style={{
            fontSize: 30, fontWeight: 900, color: C.dark,
            marginBottom: 6, letterSpacing: "-1px",
            lineHeight: 1.1,
          }}>
            Plan Karo<br/>
            <span className="gradient-text">Chalo</span>
          </h1>
          <p style={{
            fontSize: 14, color: C.muted, marginBottom: 0,
            textAlign: "center", lineHeight: 1.6, fontWeight: 500,
            maxWidth: 260, margin: "0 auto",
          }}>
            Group trips, decided together.<br/>No app download. No chaos.
          </p>
        </div>

        <div className="fade-in-up" style={{ width: "100%", maxWidth: 380, animationDelay: "100ms" }}>
          {/* Name input */}
          <div style={{
            marginBottom: 14, position: "relative",
          }}>
            <input value={userName} onChange={e => { setUserName(e.target.value); setError(""); }} placeholder="Your name" style={{
              width: "100%", padding: "14px 18px 14px 46px",
              borderRadius: "var(--radius-md)",
              border: `1.5px solid ${C.border}`,
              fontSize: 15, outline: "none", background: "#fff",
              boxSizing: "border-box", fontWeight: 500,
              boxShadow: "var(--shadow-sm)",
            }} />
            <div style={{
              position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
              color: C.mutedLight,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
          </div>

          {/* Create trip card */}
          <div style={{
            background: C.card, borderRadius: "var(--radius-xl)",
            border: `1px solid ${C.borderLight}`,
            padding: 24, marginBottom: 14,
            boxShadow: "var(--shadow-md)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `linear-gradient(135deg, ${C.greenPale}, rgba(82,183,136,0.2))`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 18 }}>✈</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: 16, color: C.dark, letterSpacing: "-0.3px" }}>Start a new trip</span>
            </div>
            <input value={tripName} onChange={e => { setTripName(e.target.value); setError(""); }} placeholder='Trip name (e.g. "Goa June")' style={{
              width: "100%", padding: "13px 16px",
              borderRadius: "var(--radius-sm)",
              border: `1.5px solid ${C.border}`,
              fontSize: 14, outline: "none", marginBottom: 12,
              boxSizing: "border-box", fontWeight: 500,
            }} />
            <button onClick={createTrip} disabled={loading} style={{
              width: "100%", padding: 15,
              borderRadius: "var(--radius-md)",
              background: `linear-gradient(135deg, ${C.greenMid}, ${C.green})`,
              color: "#fff", border: "none", fontSize: 15, fontWeight: 700,
              cursor: "pointer", opacity: loading ? 0.6 : 1,
              boxShadow: "0 4px 16px rgba(27,67,50,0.25)",
              letterSpacing: "-0.2px",
            }}>
              {loading ? "Creating..." : "Create trip"}
            </button>
          </div>

          {/* Join trip card */}
          <div style={{
            background: C.card, borderRadius: "var(--radius-xl)",
            border: `1px solid ${C.borderLight}`,
            padding: 24,
            boxShadow: "var(--shadow-md)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `linear-gradient(135deg, ${C.amberPale}, rgba(244,162,97,0.2))`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 18 }}>🤝</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: 16, color: C.dark, letterSpacing: "-0.3px" }}>Join a trip</span>
            </div>
            <input value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError(""); }} placeholder="Enter 6-letter code" maxLength={6} style={{
              width: "100%", padding: "13px 16px",
              borderRadius: "var(--radius-sm)",
              border: `1.5px solid ${C.border}`,
              fontSize: 16, outline: "none", marginBottom: 12,
              letterSpacing: 6, textTransform: "uppercase",
              textAlign: "center", fontWeight: 800,
              boxSizing: "border-box",
            }} />
            <button onClick={joinTrip} disabled={loading} style={{
              width: "100%", padding: 15,
              borderRadius: "var(--radius-md)",
              background: `linear-gradient(135deg, ${C.amber}, ${C.amberLight})`,
              color: "#fff", border: "none", fontSize: 15, fontWeight: 700,
              cursor: "pointer", opacity: loading ? 0.6 : 1,
              boxShadow: "0 4px 16px rgba(231,111,81,0.25)",
              letterSpacing: "-0.2px",
            }}>
              {loading ? "Joining..." : "Join trip"}
            </button>
          </div>

          {error && (
            <div className="fade-in" style={{
              marginTop: 14, padding: "12px 16px",
              background: "linear-gradient(135deg, #FFEBEE, #FCE4EC)",
              borderRadius: "var(--radius-sm)",
              fontSize: 13, color: "#C62828", textAlign: "center",
              fontWeight: 600, border: "1px solid #FFCDD2",
            }}>{error}</div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        textAlign: "center", padding: "16px 20px 28px",
        fontSize: 11, color: C.mutedLight, fontWeight: 500,
        lineHeight: 1.6,
      }}>
        Built for Indian friend groups · Zero downloads · Share via WhatsApp
      </div>
    </div>
  );
}
