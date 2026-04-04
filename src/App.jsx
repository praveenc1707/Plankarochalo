import { useState, useEffect, useRef, useCallback } from "react";
import { loadTrip, saveTrip, subscribeTripUpdates, isConfigured } from "./supabase.js";

const C = { green: "#2D6A4F", greenLight: "#52B788", greenPale: "#D8F3DC", amber: "#E76F51", amberLight: "#F4A261", amberPale: "#FFECD2", dark: "#1A1A2E", bg: "#FAFAF7", card: "#FFFFFF", muted: "#8D99AE", border: "#E8E4DC" };

const STAGE_META = [
  { key: "dates", label: "Dates", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { key: "destination", label: "Destination", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" },
  { key: "budget", label: "Budget", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { key: "plan", label: "Plan", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { key: "confirm", label: "Confirm", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
];

const DESTS = [
  { name: "Goa", vibe: "Beach & nightlife", cost: "8,000-15,000", weather: "Hot & sunny", color: "#F4A261" },
  { name: "Manali", vibe: "Mountains & snow", cost: "6,000-12,000", weather: "Cool & crisp", color: "#52B788" },
  { name: "Pondicherry", vibe: "French quarter vibes", cost: "5,000-10,000", weather: "Warm & humid", color: "#E76F51" },
  { name: "Jaipur", vibe: "Heritage & culture", cost: "5,000-10,000", weather: "Hot & dry", color: "#D4A373" },
  { name: "Coorg", vibe: "Coffee plantations", cost: "4,000-9,000", weather: "Pleasant mist", color: "#588157" },
  { name: "Udaipur", vibe: "Lakes & palaces", cost: "6,000-12,000", weather: "Warm", color: "#BC6C25" },
  { name: "Kodaikanal", vibe: "Hill station escape", cost: "4,000-8,000", weather: "Cool & foggy", color: "#386641" },
  { name: "Rishikesh", vibe: "Adventure & spiritual", cost: "3,000-8,000", weather: "Pleasant", color: "#6A994E" },
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

function Icon({ d, size = 20, color = "currentColor" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
}

function ScenicAvatar({ stage, size = 100 }) {
  const s = Math.min(stage, 5);
  const w = Math.round(size * 2.6);
  const h = size;
  const scenes = {
    0: <svg width={w} height={h} viewBox="0 0 260 100"><rect width="260" height="100" fill="#D5D0C8"/><rect y="58" width="260" height="42" fill="#B8B2A6"/><ellipse cx="60" cy="58" rx="50" ry="18" fill="#C4BEB2"/><ellipse cx="190" cy="62" rx="40" ry="14" fill="#C4BEB2"/><path d="M100 100 Q115 66 130 64 Q145 66 160 100" fill="#968E7E" opacity="0.5"/><circle cx="130" cy="44" r="16" fill="#C4BEB2" opacity="0.5"/><circle cx="100" cy="38" r="10" fill="#D5D0C8" opacity="0.6"/><circle cx="160" cy="40" r="12" fill="#D5D0C8" opacity="0.5"/><text x="130" y="92" textAnchor="middle" fontSize="9" fill="#8B8578" fontWeight="600" fontFamily="system-ui">Where to?</text></svg>,
    1: <svg width={w} height={h} viewBox="0 0 260 100"><rect width="260" height="56" fill="#FDE8C9"/><rect y="56" width="260" height="44" fill="#8FAE7B"/><circle cx="130" cy="28" r="18" fill="#F4A261" opacity="0.9"/><circle cx="130" cy="28" r="13" fill="#FCDE5A" opacity="0.7"/><path d="M0 56 Q30 42 65 48 Q100 38 130 44 Q160 36 195 46 Q230 40 260 52 L260 56Z" fill="#6A994E"/><path d="M0 60 Q40 52 80 56 Q120 50 160 54 Q200 48 260 58 L260 66 L0 66Z" fill="#588157"/><path d="M100 100 L115 56 L145 56 L160 100Z" fill="#A68B6E" opacity="0.5"/>{[20,55,200,235].map((x,i)=><circle key={i} cx={x} cy={28+i*3} r={1.5+i*0.4} fill="#FCDE5A" opacity={0.3+i*0.1}/>)}<text x="130" y="92" textAnchor="middle" fontSize="9" fill="#4A6741" fontWeight="600" fontFamily="system-ui">Dates locked</text></svg>,
    2: <svg width={w} height={h} viewBox="0 0 260 100"><rect width="260" height="100" fill="#87CEEB"/><rect y="62" width="260" height="38" fill="#F5E6CA"/><path d="M0 44 Q20 22 50 34 Q70 14 100 28 Q115 18 130 12 Q145 18 160 28 Q190 14 210 34 Q240 22 260 40 L260 62 L0 62Z" fill="#6B8F71"/><path d="M90 34 Q110 6 130 2 Q150 6 170 34" fill="#52796F" opacity="0.7"/><path d="M105 34 Q120 12 130 8 Q140 12 155 34" fill="#3E6B5A" opacity="0.5"/><circle cx="135" cy="6" r="2.5" fill="#fff" opacity="0.9"/>{[45,85,175,215].map((x,i)=><ellipse key={i} cx={x} cy={64} rx="3" ry="1.5" fill="#52B788" opacity="0.5"/>)}<text x="130" y="92" textAnchor="middle" fontSize="9" fill="#3E6B5A" fontWeight="600" fontFamily="system-ui">Destination chosen</text></svg>,
    3: <svg width={w} height={h} viewBox="0 0 260 100"><rect width="260" height="100" fill="#2C3E6B"/><rect y="56" width="260" height="44" fill="#3A5A40"/>{[30,70,120,170,210,250].map((x,i)=><circle key={i} cx={x} cy={8+i*3} r={1+i*0.2} fill="#fff" opacity={0.4+i*0.08}/>)}<circle cx="210" cy="16" r="8" fill="#F5E6CA" opacity="0.8"/><path d="M0 56 Q50 48 100 52 Q150 46 200 52 Q240 48 260 54 L260 60 L0 60Z" fill="#344E41"/><polygon points="125,56 130,40 135,56" fill="#E76F51" opacity="0.9"/><polygon points="120,58 130,42 140,58" fill="#F4A261" opacity="0.7"/><rect x="128" y="58" width="4" height="10" fill="#8B5E3C"/><circle cx="130" cy="66" r="5" fill="#E76F51" opacity="0.5"/><circle cx="130" cy="66" r="2.5" fill="#FCDE5A" opacity="0.7"/><text x="130" y="92" textAnchor="middle" fontSize="9" fill="#A8D5A2" fontWeight="600" fontFamily="system-ui">Budget settled</text></svg>,
    4: <svg width={w} height={h} viewBox="0 0 260 100"><rect width="260" height="100" fill="#87CEEB"/><circle cx="40" cy="18" r="12" fill="#FCDE5A" opacity="0.9"/><rect y="52" width="260" height="48" fill="#588157"/><path d="M0 52 Q30 38 70 46 Q110 34 150 40 Q190 30 230 42 Q250 38 260 46 L260 56 L0 56Z" fill="#6A994E"/><path d="M40 52 L50 30 L55 52" fill="#344E41"/><path d="M42 46 L50 34 L58 46" fill="#52B788"/><path d="M200 52 L212 26 L218 52" fill="#344E41"/><path d="M203 44 L212 30 L221 44" fill="#52B788"/><rect x="125" y="46" width="10" height="14" rx="1" fill="#E76F51"/><polygon points="130,36 122,48 138,48" fill="#F4A261"/>{[90,110,130,150,170].map((x,i)=><line key={i} x1={x} y1={100-i*4} x2={x} y2={96-i*4} stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>)}<text x="130" y="92" textAnchor="middle" fontSize="9" fill="#2D6A4F" fontWeight="600" fontFamily="system-ui">Plan ready</text></svg>,
    5: <svg width={w} height={h} viewBox="0 0 260 100"><rect width="260" height="40" fill="#FF8C42"/><rect y="40" width="260" height="16" fill="#FFB067"/><rect y="56" width="260" height="44" fill="#2D6A4F"/><circle cx="130" cy="24" r="16" fill="#FCDE5A" opacity="0.8"/><circle cx="130" cy="24" r="11" fill="#FFE066" opacity="0.6"/>{[0,1,2,3,4,5,6,7].map(i=><line key={i} x1={130+Math.cos(i*0.785)*20} y1={24+Math.sin(i*0.785)*20} x2={130+Math.cos(i*0.785)*25} y2={24+Math.sin(i*0.785)*25} stroke="#FCDE5A" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>)}<path d="M0 44 Q40 32 80 38 Q120 28 160 34 Q200 26 240 36 L260 40 L260 56 L0 56Z" fill="#40916C"/>{[105,118,130,142,155].map((x,i)=>{const y=50+Math.sin(i*1.2)*2;return <g key={i}><circle cx={x} cy={y} r="3" fill="#FFE066"/><rect x={x-1} y={y} width="2" height="5" fill="#8B5E3C"/></g>})}{[80,100,160,180].map((x,i)=><polygon key={i} points={`${x},56 ${x-3},48 ${x+3},48`} fill={i%2?"#F4A261":"#E76F51"} opacity="0.7"/>)}<text x="130" y="90" textAnchor="middle" fontSize="10" fill="#D8F3DC" fontWeight="700" fontFamily="system-ui">Let's go!</text></svg>,
  };
  return <div style={{ display: "flex", justifyContent: "center" }}>{scenes[s] || scenes[0]}</div>;
}

function Stepper({ currentStage, lockedStages }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "16px 0" }}>
      {STAGE_META.map((s, i) => {
        const locked = lockedStages.includes(s.key);
        const active = i === currentStage;
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: locked ? C.green : active ? C.amber : "#E8E4DC", transition: "all 0.3s" }}>
                {locked ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M5 13l4 4L19 7"/></svg> : <Icon d={s.icon} size={14} color={active ? "#fff" : C.muted} />}
              </div>
              <span style={{ fontSize: 10, marginTop: 4, color: locked ? C.green : active ? C.amber : C.muted, fontWeight: active ? 600 : 400 }}>{s.label}</span>
            </div>
            {i < 4 && <div style={{ height: 2, flex: "0 0 16px", background: locked ? C.green : "#E8E4DC", borderRadius: 1, transition: "all 0.3s" }}/>}
          </div>
        );
      })}
    </div>
  );
}

function MemberAvatars({ members, size = 28 }) {
  const pal = ["#2D6A4F","#E76F51","#264653","#E9C46A","#F4A261","#606C38","#BC6C25"];
  return (
    <div style={{ display: "flex" }}>
      {members.map((m, i) => (
        <div key={m.id} title={m.name} style={{ width: size, height: size, borderRadius: "50%", background: pal[i % pal.length], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#fff", border: "2px solid #fff", marginLeft: i > 0 ? -6 : 0, zIndex: members.length - i }}>{m.name.charAt(0).toUpperCase()}</div>
      ))}
    </div>
  );
}

/* ── STAGE COMPONENTS ── */

function DateStage({ trip, user, onUpdate }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const myDates = trip.stages.dates.availability?.[user.id] || [];
  const allAvail = trip.stages.dates.availability || {};
  const memberCount = trip.members.length;
  const days = getMonthDays(year, month);
  const firstDay = getFirstDay(year, month);

  function toggleDate(day) {
    const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const current = [...myDates];
    const idx = current.indexOf(ds);
    idx >= 0 ? current.splice(idx, 1) : current.push(ds);
    const updated = { ...trip, stages: { ...trip.stages, dates: { ...trip.stages.dates, availability: { ...allAvail, [user.id]: current } } } };
    onUpdate(updated);
  }

  function getOverlap(day) {
    const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    let count = 0;
    Object.values(allAvail).forEach(arr => { if (arr?.includes?.(ds)) count++; });
    return count;
  }

  const bestWindow = (() => {
    const all = {};
    Object.values(allAvail).forEach(arr => { if (Array.isArray(arr)) arr.forEach(d => { all[d] = (all[d] || 0) + 1; }); });
    return Object.entries(all).filter(([,c]) => c >= Math.ceil(memberCount * 0.5)).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([d]) => d);
  })();

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button onClick={() => { if (month === 0) { setMonth(11); setYear(year-1); } else setMonth(month-1); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: 8, color: C.dark }}>&#8249;</button>
        <span style={{ fontWeight: 600, fontSize: 15 }}>{new Date(year, month).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span>
        <button onClick={() => { if (month === 11) { setMonth(0); setYear(year+1); } else setMonth(month+1); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: 8, color: C.dark }}>&#8250;</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, textAlign: "center" }}>
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <div key={d} style={{ fontSize: 11, color: C.muted, fontWeight: 600, padding: "4px 0" }}>{d}</div>)}
        {Array.from({ length: firstDay }).map((_, i) => <div key={"e"+i} />)}
        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1;
          const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const isMine = myDates.includes(ds);
          const overlap = getOverlap(day);
          const isPast = new Date(year, month, day) < new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const isBest = bestWindow.includes(ds);
          const bg = isPast ? "#f5f5f5" : isMine && overlap === memberCount ? C.green : isMine ? C.greenLight : overlap > 0 ? `rgba(45,106,79,${0.1 + overlap/memberCount*0.3})` : "#fff";
          const clr = isPast ? "#ccc" : (isMine && overlap >= memberCount * 0.5) ? "#fff" : C.dark;
          return (
            <button key={day} onClick={() => !isPast && toggleDate(day)} disabled={isPast} style={{ width: "100%", aspectRatio: "1", borderRadius: 8, border: isBest ? `2px solid ${C.amber}` : "1px solid #eee", background: bg, color: clr, fontSize: 13, fontWeight: isMine ? 700 : 400, cursor: isPast ? "default" : "pointer", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {day}
              {overlap > 0 && !isPast && <span style={{ position: "absolute", bottom: 1, right: 3, fontSize: 7, color: overlap === memberCount ? "#fff" : C.green, fontWeight: 700 }}>{overlap}</span>}
            </button>
          );
        })}
      </div>
      {bestWindow.length > 0 && <div style={{ marginTop: 16, padding: 12, background: C.greenPale, borderRadius: 10 }}><div style={{ fontSize: 12, fontWeight: 600, color: C.green, marginBottom: 4 }}>Best overlap</div><div style={{ fontSize: 13, color: C.dark }}>{bestWindow.map(d => fmtDate(d)).join(", ")}</div></div>}
      <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: C.greenLight }}/> Your pick</span>
        <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: C.green }}/> Everyone free</span>
        <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, border: `2px solid ${C.amber}` }}/> Best match</span>
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
    const opt = db || { name: newDest.trim(), vibe: "Custom destination", cost: "Varies", weather: "-", color: "#8D99AE" };
    onUpdate({ ...trip, stages: { ...trip.stages, destination: { ...trip.stages.destination, options: [...options, opt] } } });
    setNewDest(""); setShowAdd(false);
  }
  const vc = {}; Object.values(votes).forEach(v => { vc[v] = (vc[v] || 0) + 1; });
  const total = Object.keys(votes).length;

  return (
    <div className="fade-in">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {options.map(opt => {
          const cnt = vc[opt.name] || 0;
          const pct = total ? Math.round(cnt / total * 100) : 0;
          const mine = myVote === opt.name;
          return (
            <button key={opt.name} onClick={() => vote(opt.name)} style={{ display: "flex", flexDirection: "column", background: C.card, border: mine ? `2px solid ${C.green}` : `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", textAlign: "left" }}>
              <div style={{ height: 48, background: opt.color || "#ccc", display: "flex", alignItems: "center", padding: "0 16px" }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>{opt.name}</span>
                {mine && <span style={{ marginLeft: "auto", background: "#fff", borderRadius: 12, padding: "2px 10px", fontSize: 11, fontWeight: 600, color: C.green }}>Your pick</span>}
              </div>
              <div style={{ padding: "10px 16px" }}>
                <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.muted, marginBottom: 8, flexWrap: "wrap" }}><span>{opt.vibe}</span><span>Rs {opt.cost}</span><span>{opt.weather}</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 5, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: mine ? C.green : C.greenLight, borderRadius: 3, transition: "width 0.3s" }}/></div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.dark, minWidth: 36 }}>{cnt} vote{cnt !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {showAdd ? (
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <input value={newDest} onChange={e => setNewDest(e.target.value)} placeholder="Destination name..." style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, outline: "none" }} onKeyDown={e => e.key === "Enter" && addOption()} />
          <button onClick={addOption} style={{ padding: "10px 16px", borderRadius: 10, background: C.green, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Add</button>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)} style={{ marginTop: 12, width: "100%", padding: 12, borderRadius: 10, border: `1px dashed ${C.border}`, background: "transparent", fontSize: 13, color: C.muted, cursor: "pointer" }}>+ Suggest a destination</button>
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
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: C.dark, display: "block", marginBottom: 10 }}>Your comfortable range (per person)</label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: C.muted, minWidth: 24 }}>Min</span>
          <input type="range" min={1000} max={50000} step={1000} value={min} onChange={e => { const v = +e.target.value; setMin(Math.min(v, max - 1000)); }} style={{ flex: 1 }} />
          <span style={{ fontSize: 14, fontWeight: 600, minWidth: 70, textAlign: "right" }}>&#x20B9;{min.toLocaleString("en-IN")}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
          <span style={{ fontSize: 12, color: C.muted, minWidth: 24 }}>Max</span>
          <input type="range" min={1000} max={50000} step={1000} value={max} onChange={e => { const v = +e.target.value; setMax(Math.max(v, min + 1000)); }} style={{ flex: 1 }} />
          <span style={{ fontSize: 14, fontWeight: 600, minWidth: 70, textAlign: "right" }}>&#x20B9;{max.toLocaleString("en-IN")}</span>
        </div>
      </div>
      <div style={{ padding: 16, background: responded > 1 ? (hasOverlap ? C.greenPale : "#FFF0F0") : "#F8F8F8", borderRadius: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: hasOverlap ? C.green : responded > 1 ? "#C62828" : C.muted, marginBottom: 4 }}>{responded <= 1 ? "Waiting for others..." : hasOverlap ? "Group overlap found" : "No overlap yet"}</div>
        {responded > 1 && hasOverlap && <div style={{ fontSize: 18, fontWeight: 700, color: C.green }}>&#x20B9;{oMin.toLocaleString("en-IN")} – &#x20B9;{oMax.toLocaleString("en-IN")}</div>}
        <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{responded} of {trip.members.length} responded</div>
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

  return (
    <div className="fade-in">
      {plan.map(day => (
        <div key={day.d} style={{ marginBottom: 12, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", background: "#F8F6F3", borderBottom: `1px solid ${C.border}`, fontWeight: 600, fontSize: 13 }}>Day {day.d}</div>
          <div style={{ padding: "10px 14px" }}>
            {day.items.map((item, j) => (
              <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: j < day.items.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.greenLight, flexShrink: 0 }}/><span style={{ fontSize: 13 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{ padding: 16, background: "#F8F6F3", borderRadius: 12, marginTop: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: C.dark }}>Are you in?</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => confirm("in")} style={{ flex: 1, padding: 12, borderRadius: 10, border: myStatus === "in" ? `2px solid ${C.green}` : `1px solid ${C.border}`, background: myStatus === "in" ? C.greenPale : "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", color: C.green }}>I'm in!</button>
          <button onClick={() => confirm("out")} style={{ flex: 1, padding: 12, borderRadius: 10, border: myStatus === "out" ? "2px solid #E24B4A" : `1px solid ${C.border}`, background: myStatus === "out" ? "#FFEBEB" : "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#E24B4A" }}>Can't make it</button>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>{inCount} of {trip.members.length} confirmed</div>
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
      if (vals.length) { const oMin = Math.max(...vals.map(r => r.min)); const oMax = Math.min(...vals.map(r => r.max)); lockedValue = `\u20B9${oMin.toLocaleString("en-IN")} – \u20B9${oMax.toLocaleString("en-IN")}`; }
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
      <div style={{ background: C.dark, padding: "16px 20px", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 22, padding: "4px 8px" }}>&#8249;</button>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{trip.name}</div>
            <button onClick={copyCode} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 11, padding: "2px 10px", borderRadius: 6, marginTop: 2 }}>Code: {trip.id} (tap to copy)</button>
          </div>
          <button onClick={shareWA} style={{ background: "#25D366", border: "none", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: 8 }}>Share</button>
        </div>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <MemberAvatars members={trip.members} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{trip.members.length} members</span>
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>
        <Stepper currentStage={currentIdx} lockedStages={lockedStages} />
      </div>

      <div style={{ padding: "4px 20px 12px", borderRadius: 14, overflow: "hidden" }}>
        <ScenicAvatar stage={lockedStages.length + (allDone ? 1 : 0)} size={90} />
      </div>

      {allDone && (
        <div style={{ margin: "0 20px 16px", padding: 20, background: C.greenPale, borderRadius: 14, textAlign: "center" }} className="fade-in">
          <div style={{ fontSize: 20, fontWeight: 700, color: C.green }}>Trip confirmed!</div>
          <div style={{ fontSize: 14, color: C.dark, marginTop: 4 }}>{trip.stages.destination?.locked} &middot; {trip.stages.dates?.locked}</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{trip.stages.budget?.locked}/person &middot; {inCount} going</div>
          <button onClick={shareWA} style={{ marginTop: 12, padding: "10px 24px", borderRadius: 10, background: "#25D366", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Share on WhatsApp</button>
        </div>
      )}

      <div style={{ padding: "0 20px 32px" }}>
        {lockedStages.map(key => (
          <div key={key} style={{ marginBottom: 8, padding: "12px 16px", background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, color: C.green, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{STAGE_META.find(m => m.key === key)?.label} — locked</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.dark, marginTop: 2 }}>{trip.stages[key].locked}</div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2"><path d="M5 13l4 4L19 7"/></svg>
          </div>
        ))}

        {currentKey && !allDone && (
          <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden", marginTop: 8 }}>
            <div style={{ padding: "14px 16px", background: "#F8F6F3", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>{STAGE_META[currentIdx].label}</span>
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 8, background: C.amberPale, color: C.amber, fontWeight: 600 }}>Active</span>
            </div>
            <div style={{ padding: 16 }}>
              {currentKey === "dates" && <DateStage trip={trip} user={user} onUpdate={onUpdate} />}
              {currentKey === "destination" && <DestinationStage trip={trip} user={user} onUpdate={onUpdate} />}
              {currentKey === "budget" && <BudgetStage trip={trip} user={user} onUpdate={onUpdate} />}
              {(currentKey === "plan" || currentKey === "confirm") && <PlanStage trip={trip} user={user} onUpdate={onUpdate} />}
            </div>
            {isPlanner && (
              <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
                <button onClick={() => lockStage(currentKey)} style={{ width: "100%", padding: 13, borderRadius: 10, background: C.green, color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  Lock {STAGE_META[currentIdx].label} & proceed
                </button>
              </div>
            )}
          </div>
        )}

        {!isConfigured() && (
          <div style={{ marginTop: 20, padding: 14, background: "#FFFBE6", borderRadius: 10, border: "1px solid #FFE082" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#F57F17", marginBottom: 4 }}>Single-device mode</div>
            <div style={{ fontSize: 11, color: "#9E9D24" }}>Multi-user sync requires Supabase. See README for 3-minute setup.</div>
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

  // Check URL for trip code on load
  useEffect(() => {
    const urlTrip = getTripIdFromURL();
    if (urlTrip) setJoinCode(urlTrip);
  }, []);

  // Subscribe to trip updates (Supabase real-time or polling fallback)
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
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ marginBottom: 8, borderRadius: 12, overflow: "hidden" }}><ScenicAvatar stage={3} size={64} /></div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.dark, marginBottom: 2, letterSpacing: -0.5 }}>Plan Karo Chalo</h1>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 28, textAlign: "center", lineHeight: 1.6 }}>Group trips, decided together.<br/>No app download. No chaos.</p>

        <div style={{ width: "100%", maxWidth: 360 }}>
          <input value={userName} onChange={e => { setUserName(e.target.value); setError(""); }} placeholder="Your name" style={{ width: "100%", padding: "12px 16px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 15, outline: "none", marginBottom: 10, background: "#fff", boxSizing: "border-box" }} />

          <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: C.dark }}>Start a new trip</div>
            <input value={tripName} onChange={e => { setTripName(e.target.value); setError(""); }} placeholder='Trip name (e.g. "Goa June")' style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, outline: "none", marginBottom: 10, boxSizing: "border-box" }} />
            <button onClick={createTrip} disabled={loading} style={{ width: "100%", padding: 13, borderRadius: 10, background: C.green, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>{loading ? "Creating..." : "Create trip"}</button>
          </div>

          <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: C.dark }}>Join a trip</div>
            <input value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError(""); }} placeholder="Enter 6-letter code" maxLength={6} style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, outline: "none", marginBottom: 10, letterSpacing: 3, textTransform: "uppercase", textAlign: "center", fontWeight: 700, boxSizing: "border-box" }} />
            <button onClick={joinTrip} disabled={loading} style={{ width: "100%", padding: 13, borderRadius: 10, background: C.amber, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>{loading ? "Joining..." : "Join trip"}</button>
          </div>

          {error && <div style={{ marginTop: 12, padding: 10, background: "#FFEBEB", borderRadius: 8, fontSize: 13, color: "#C62828", textAlign: "center" }}>{error}</div>}
        </div>
      </div>
      <div style={{ textAlign: "center", padding: "16px 0 24px", fontSize: 11, color: C.muted }}>Built for Indian friend groups &middot; Zero downloads &middot; Share via WhatsApp</div>
    </div>
  );
}
