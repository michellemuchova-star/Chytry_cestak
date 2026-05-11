"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  startTrip, endTrip, getActiveTrip, getRecentTrips,
  getCurrentPosition, formatDuration, formatDate, formatCurrency,
} from "@/lib/trips";
import { getDefaultVehicle } from "@/lib/vehicles";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Trip, TripSummary, TransportMode, Vehicle, SubOrganization, Organization } from "@/lib/types";
import { SUB_ORG_CONFIG, ORG_CONFIG, ALLOWED_DOMAINS } from "@/lib/types";
import { DEMO_ACTIVE_TRIP, DEMO_RECENT_TRIPS, DEMO_TRIP_SUMMARY } from "@/lib/demoData";
import VehicleProfile from "./VehicleProfile";
import SubOrgSelect from "./SubOrgSelect";
import AppLogo from "./AppLogo";

export interface DemoData {
  organization?: "euroinstitut" | "eduservis" | "biotherapy";
  subOrganization?: SubOrganization | null;
  vehicle?: Vehicle | null;
  activeTrip?: Trip | null;
  recentTrips?: Trip[];
  summary?: TripSummary | null;
  /** Přeskočit logiku a zobrazit konkrétní obrazovku (pro demo) */
  initialScreen?: Screen;
}

// ─── Typy stavů obrazovky ─────────────────────────────────────────────────────

type Screen =
  | "loading"      // načítám
  | "suborg"       // onboarding – výběr kraje (jen Euroinstitut)
  | "vehicle"      // onboarding – nastavení vozidla
  | "idle"         // čeká na odjezd
  | "pre-depart"   // modal: výběr dopravy + účel cesty
  | "departing"    // GPS odjezd
  | "traveling"    // cesta probíhá
  | "arriving"     // GPS příjezd
  | "completed"    // souhrn
  | "profile";     // nastavení vozidla (edit)

interface Props { user: User; demoData?: DemoData; onSignOut?: () => void }

export default function Dashboard({ user, demoData, onSignOut }: Props) {
  const [screen,        setScreen]        = useState<Screen>("loading");
  const [vehicle,       setVehicle]       = useState<Vehicle | null>(null);
  const [organization,  setOrganization]  = useState<Organization | null>(null);
  const [subOrg,        setSubOrg]        = useState<SubOrganization | null>(null);
  const [activeTrip,  setActiveTrip]  = useState<Trip | null>(null);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [summary,     setSummary]     = useState<TripSummary | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [elapsed,     setElapsed]     = useState("");

  // Pre-depart form state
  const [purpose,       setPurpose]       = useState("");
  const [transportMode, setTransportMode] = useState<TransportMode>("car");
  const [ticketPrice,   setTicketPrice]   = useState("");
  const [purposeError,  setPurposeError]  = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Načtení dat ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (demoData) {
      setVehicle(demoData.vehicle ?? null);
      setOrganization(demoData.organization ?? null);
      setSubOrg(demoData.subOrganization ?? null);
      setActiveTrip(demoData.activeTrip ?? null);
      setRecentTrips(demoData.recentTrips ?? []);
      setSummary(demoData.summary ?? null);
      if (demoData.initialScreen) {
        setScreen(demoData.initialScreen);
      } else if (demoData.activeTrip) {
        setScreen("traveling");
      } else if (demoData.summary) {
        setScreen("completed");
      } else if (demoData.organization === "euroinstitut" && !demoData.subOrganization) {
        setScreen("suborg");
      } else if (!demoData.vehicle) {
        setScreen("vehicle");
      } else {
        setScreen("idle");
      }
      return;
    }
    try {
      const [userSnap, v, active, recent] = await Promise.all([
        getDoc(doc(db, "users", user.uid)),
        getDefaultVehicle(user.uid),
        getActiveTrip(user.uid),
        getRecentTrips(user.uid),
      ]);

      const userData   = userSnap.data();
      const orgRaw     = userData?.organization ?? null;
      const domain     = (user.email ?? "").split("@")[1]?.toLowerCase() ?? "";
      const fromEmail  = domain && ALLOWED_DOMAINS[domain] ? ALLOWED_DOMAINS[domain] : null;
      const org        = (orgRaw ?? fromEmail) as Organization | null;
      const storedSub  = (userData?.subOrganization ?? null) as SubOrganization | null;

      setVehicle(v);
      setRecentTrips(recent);
      setOrganization(org);
      setSubOrg(storedSub);

      if (active) {
        setActiveTrip(active);
        setScreen("traveling");
      } else if (org === "euroinstitut" && !storedSub) {
        setScreen("suborg");   // onboarding krok 1: výběr kraje
      } else if (!v) {
        setScreen("vehicle");  // onboarding krok 2: nastavení vozidla
      } else {
        setScreen("idle");
      }
    } catch (e) {
      console.error(e);
      setOrganization(null);
      setScreen("idle");
    }
  }, [user.uid, demoData]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Časovač ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (screen === "traveling" && activeTrip?.startTimeMs) {
      const tick = () => setElapsed(formatDuration(Date.now() - activeTrip.startTimeMs));
      tick();
      timerRef.current = setInterval(tick, 30_000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [screen, activeTrip]);

  // ─── Akce ────────────────────────────────────────────────────────────────────

  const openPreDepart = () => {
    setPurpose("");
    setPurposeError(false);
    setTransportMode("car");
    setTicketPrice("");
    setError(null);
    setScreen("pre-depart");
  };

  const handleDepart = async () => {
    if (!purpose.trim()) { setPurposeError(true); return; }
    setError(null);
    setScreen("departing");
    if (demoData) {
      setTimeout(() => {
        setActiveTrip({ ...DEMO_ACTIVE_TRIP, purpose: purpose.trim() } as Trip);
        setScreen("traveling");
      }, 800);
      return;
    }
    try {
      const location = await getCurrentPosition();
      await startTrip(
        user.uid, location, purpose.trim(),
        transportMode,
        transportMode === "car" ? (vehicle?.id ?? null) : null,
        transportMode === "car" ? (vehicle?.kmRatePerKm ?? null) : null,
      );
      const active = await getActiveTrip(user.uid);
      setActiveTrip(active);
      setScreen("traveling");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba GPS. Zkus znovu.");
      setScreen("pre-depart");
    }
  };

  const handleArrive = async () => {
    if (!activeTrip) return;
    setError(null);
    setScreen("arriving");
    if (demoData) {
      setTimeout(() => {
        setSummary(DEMO_TRIP_SUMMARY);
        setActiveTrip(null);
        setRecentTrips([...DEMO_RECENT_TRIPS]);
        setScreen("completed");
      }, 1000);
      return;
    }
    try {
      const location = await getCurrentPosition();
      const result = await endTrip(activeTrip, location);
      setSummary(result);
      setActiveTrip(null);
      setScreen("completed");
      const recent = await getRecentTrips(user.uid);
      setRecentTrips(recent);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba GPS. Zkus znovu.");
      setScreen("traveling");
    }
  };

  const handleAddStop = () => {
    // Začne novou cestu hned po dokončené – předvyplní účel
    setSummary(null);
    openPreDepart();
  };

  const handleDoneForToday = () => {
    setSummary(null);
    setScreen("idle");
  };

  const handleSignOut = () => (onSignOut ?? (() => signOut(auth)))();

  // ─── Render ─────────────────────────────────────────────────────────────────

  // Onboarding krok 1 – výběr kraje (jen Euroinstitut)
  if (screen === "suborg") {
    return (
      <SubOrgSelect
        user={user}
        onSelect={(s) => { setSubOrg(s); setScreen("vehicle"); }}
        demoMode={!!demoData}
      />
    );
  }

  // Onboarding krok 2 / edit – nastavení vozidla
  if (screen === "vehicle" || screen === "profile") {
    return (
      <VehicleProfile
        user={user}
        existing={screen === "profile" ? vehicle : null}
        onSave={(v) => { setVehicle(v); setScreen("idle"); }}
        onBack={screen === "profile" ? () => setScreen("idle") : undefined}
        demoMode={!!demoData}
      />
    );
  }

  return (
    <div style={s.root}>
      <div style={s.container}>

        {/* ── Header ── */}
        <header style={s.header}>
          <div style={s.headerLeft}>
            <AppLogo />
            <div>
              <div style={s.headerTitle}>Cestovní příkazy</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                <span style={s.headerSub}>{user.displayName ?? user.email}</span>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                  {organization && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                      background: `${ORG_CONFIG[organization].color}22`,
                      color: ORG_CONFIG[organization].color,
                      border: `1px solid ${ORG_CONFIG[organization].color}55`,
                    }}>
                      {ORG_CONFIG[organization].label}
                    </span>
                  )}
                  {organization === "euroinstitut" && subOrg && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                      background: `${SUB_ORG_CONFIG[subOrg].color}18`,
                      color: SUB_ORG_CONFIG[subOrg].color,
                      border: `1px solid ${SUB_ORG_CONFIG[subOrg].color}45`,
                    }}>
                      {SUB_ORG_CONFIG[subOrg].label} · {SUB_ORG_CONFIG[subOrg].fullLabel}
                    </span>
                  )}
                  {organization === "euroinstitut" && !subOrg && (
                    <span style={{ fontSize: 10, color: "#fbbf24", fontWeight: 500 }}>
                      Vyberte kraj / pracoviště (úvodní nastavení)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div style={s.headerActions}>
            <button onClick={() => setScreen("profile")} style={s.iconBtn} title="Moje vozidlo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
              </svg>
            </button>
            <button onClick={handleSignOut} style={s.signOutBtn}>Odhlásit</button>
          </div>
        </header>

        {/* ── Souhrn měsíce ── */}
        {(screen === "idle" || screen === "completed") && <MonthStrip trips={recentTrips} />}

        {/* ── Stavy ── */}
        <main>

          {screen === "loading" && (
            <div style={s.centered}><Spinner /><p style={s.hint}>Načítám…</p></div>
          )}

          {/* Výběr dopravy + účel cesty */}
          {screen === "pre-depart" && (
            <div style={s.card}>
              <div style={s.cardTitle}>Nová cesta</div>

              {/* Dopravní prostředek */}
              <div style={s.fieldLabel}>Doprava</div>
              <div style={s.transportRow}>
                {(["car","train","bus"] as TransportMode[]).map(mode => (
                  <button
                    key={mode}
                    style={{...s.transportChip, ...(transportMode === mode ? s.transportChipActive : {})}}
                    onClick={() => setTransportMode(mode)}
                  >
                    {TRANSPORT_ICONS[mode]}
                    {TRANSPORT_LABELS[mode]}
                  </button>
                ))}
              </div>

              {/* Varování – auto bez vozidla */}
              {transportMode === "car" && !vehicle && (
                <div style={s.warnBox}>
                  Nemáš nastavené vozidlo.{" "}
                  <button style={s.warnLink} onClick={() => setScreen("vehicle")}>Nastavit teď →</button>
                </div>
              )}

              {/* Cena jízdenky pro vlak/bus */}
              {(transportMode === "train" || transportMode === "bus") && (
                <>
                  <div style={s.fieldLabel}>Cena jízdenky (Kč)</div>
                  <input
                    style={s.input}
                    type="number"
                    placeholder="např. 180"
                    value={ticketPrice}
                    onChange={e => setTicketPrice(e.target.value)}
                  />
                </>
              )}

              {/* Účel cesty */}
              <div style={s.fieldLabel}>
                Účel cesty / místo jednání <span style={{color:"#f87171"}}>*</span>
              </div>
              <input
                style={{...s.input, ...(purposeError ? s.inputError : {})}}
                placeholder="např. Školení zaměstnanců – Brno"
                value={purpose}
                onChange={e => { setPurpose(e.target.value); setPurposeError(false); }}
              />
              {purposeError && <div style={s.errorMsg}>Vyplň účel cesty</div>}

              {error && <div style={s.errorBox}>{error}</div>}

              <button onClick={handleDepart} style={s.primaryBtn}>
                {transportMode === "car" ? "Zaznamenat GPS a vyjíždět" : "Začít cestu"}
              </button>
              <button onClick={() => setScreen("idle")} style={s.ghostBtn}>Zrušit</button>
            </div>
          )}

          {/* GPS načítání */}
          {(screen === "departing" || screen === "arriving") && (
            <div style={s.centered}>
              <PulsingDot color={screen === "departing" ? "#22c55e" : "#3b82f6"} />
              <p style={s.hint}>
                {screen === "departing" ? "Zjišťuji polohu odjezdu…" : "Zjišťuji polohu cíle a počítám trasu…"}
              </p>
            </div>
          )}

          {/* Idle – velké tlačítko */}
          {screen === "idle" && (
            <div style={s.idleWrap}>
              <button onClick={openPreDepart} style={s.bigGreenBtn}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z"/>
                </svg>
                Vyjíždím
              </button>
              <p style={s.hint}>Stiskni při odjezdu – zaznamená GPS</p>
              {vehicle && (
                <div style={s.vehiclePill}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}>
                    <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z"/>
                  </svg>
                  {vehicle.vehicleName} · {vehicle.plateNumber} · {vehicle.kmRatePerKm} Kč/km
                </div>
              )}
            </div>
          )}

          {/* Probíhající cesta */}
          {screen === "traveling" && activeTrip && (
            <div style={s.travelCard}>
              <span style={s.liveBadge}><span style={s.liveDot} />CESTA PROBÍHÁ</span>
              <div style={s.elapsed}>{elapsed || "…"}</div>
              <div style={s.travelMeta}>
                Odjezd{" "}
                {activeTrip.startTimeMs
                  ? new Date(activeTrip.startTimeMs).toLocaleTimeString("cs-CZ", {hour:"2-digit",minute:"2-digit"})
                  : "—"}
              </div>
              {activeTrip.purpose && (
                <div style={s.purposeTag}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z"/></svg>
                  {activeTrip.purpose}
                </div>
              )}
              {error && <div style={s.errorBox}>{error}</div>}
              <button onClick={handleArrive} style={s.arriveBtn}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
                </svg>
                V cíli
              </button>
            </div>
          )}

          {/* Souhrn */}
          {screen === "completed" && summary && (
            <div style={s.summaryCard}>
              <div style={s.summaryCheck}>✓</div>
              <div style={s.summaryTitle}>Cesta zaznamenána</div>

              <div style={s.summaryRows}>
                {summary.transportMode === "car" && (
                  <>
                    <SumRow label="Vzdálenost"   value={summary.distanceKm !== null ? `${summary.distanceKm} km` : "—"} />
                    <SumRow label="Kilometrovné" value={summary.kmCost !== null ? formatCurrency(summary.kmCost) : "—"} highlight />
                  </>
                )}
                {(summary.transportMode === "train" || summary.transportMode === "bus") && (
                  <SumRow label="Jízdné" value={summary.ticketPrice ? formatCurrency(summary.ticketPrice) : "—"} highlight />
                )}
                <SumRow label="Délka cesty" value={`${summary.perDiemHours} h`} />
                <SumRow
                  label="Stravné"
                  value={summary.perDiemAmount > 0 ? formatCurrency(summary.perDiemAmount) : "Nevzniká nárok"}
                  highlight={summary.perDiemAmount > 0}
                />
              </div>

              <button onClick={handleAddStop}   style={s.primaryBtn}>+ Přidat další zastávku</button>
              <button onClick={handleDoneForToday} style={s.ghostBtn}>Hotovo na dnes</button>
            </div>
          )}

        </main>

        {/* ── Historie ── */}
        {(screen === "idle" || screen === "completed") && recentTrips.length > 0 && (
          <section style={s.historySection}>
            <div style={s.sectionTitle}>Poslední cesty</div>
            {recentTrips.map(trip => <TripCard key={trip.id} trip={trip} />)}
          </section>
        )}

      </div>
    </div>
  );
}

// ─── Sub-komponenty ────────────────────────────────────────────────────────────

const TRANSPORT_LABELS: Record<TransportMode, string> = {
  car: "Auto", train: "Vlak", bus: "Autobus", other: "Jiné",
};
const TRANSPORT_ICONS: Record<TransportMode, React.ReactNode> = {
  car:   <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z"/></svg>,
  train: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm9 0H11v-2h2v2zM12 4c2.55 0 5.12.5 5.95 2H6.05C6.88 4.5 9.45 4 12 4z"/></svg>,
  bus:   <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM4 11V6h16v5H4z"/></svg>,
  other: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>,
};

function MonthStrip({ trips }: { trips: Trip[] }) {
  const totalKm  = trips.reduce((s, t) => s + (t.distanceKm ?? 0), 0);
  const totalCzk = trips.reduce((s, t) => s + (t.kmCost ?? 0) + (t.perDiemAmount ?? 0) + (t.ticketPrice ?? 0), 0);
  return (
    <div style={s.monthStrip}>
      <div style={s.stripItem}><div style={s.stripVal}>{trips.length}</div><div style={s.stripLbl}>CESTY</div></div>
      <div style={s.stripSep} />
      <div style={s.stripItem}><div style={s.stripVal}>{Math.round(totalKm)}</div><div style={s.stripLbl}>KM</div></div>
      <div style={s.stripSep} />
      <div style={s.stripItem}><div style={s.stripVal}>{Math.round(totalCzk).toLocaleString("cs-CZ")}</div><div style={s.stripLbl}>KČ</div></div>
    </div>
  );
}

function SumRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={s.sumRow}>
      <span style={s.sumLbl}>{label}</span>
      <span style={{...s.sumVal, ...(highlight ? {color:"#3b82f6"} : {})}}>{value}</span>
    </div>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  const colors: Record<string, string> = { draft:"#94a3b8", submitted:"#38bdf8", approved:"#4ade80", rejected:"#f87171" };
  const labels: Record<string, string> = { draft:"Návrh", submitted:"Odesláno", approved:"Schváleno", rejected:"Zamítnuto" };
  const c = colors[trip.status] ?? "#94a3b8";
  const isCar = trip.transportMode === "car";
  return (
    <div style={s.tripCard}>
      <div style={{...s.tripIcon, color: isCar ? "#3b82f6" : "#a78bfa"}}>
        {TRANSPORT_ICONS[trip.transportMode]}
      </div>
      <div style={s.tripInfo}>
        <div style={s.tripDest}>{trip.purpose || "—"}</div>
        <div style={s.tripMeta}>
          {trip.startTimeMs ? formatDate(trip.startTimeMs) : "—"}
          {trip.perDiemHours ? ` · ${trip.perDiemHours} h` : ""}
        </div>
      </div>
      <div style={s.tripRight}>
        <div style={s.tripKm}>
          {isCar && trip.distanceKm ? `${trip.distanceKm} km` : trip.ticketPrice ? formatCurrency(trip.ticketPrice) : "—"}
        </div>
        <span style={{...s.badge, color:c, borderColor:c, backgroundColor:`${c}14`}}>{labels[trip.status] ?? trip.status}</span>
      </div>
    </div>
  );
}

function Spinner() {
  return <div style={{width:32,height:32,borderRadius:"50%",border:"3px solid rgba(148,163,184,0.15)",borderTop:"3px solid #38bdf8"}} />;
}
function PulsingDot({ color }: { color: string }) {
  return <div style={{width:40,height:40,borderRadius:"50%",backgroundColor:color,boxShadow:`0 0 0 0 ${color}`,animation:"pulse 1.4s ease-out infinite"}} />;
}

// ─── Styly ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  root: { minHeight:"100vh", background:"radial-gradient(ellipse at top, #0f172a 0%, #020617 70%)", paddingBottom:40 },
  container: { maxWidth:520, margin:"0 auto", padding:"0 16px" },

  header: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 0 14px", borderBottom:"1px solid rgba(148,163,184,0.08)", marginBottom:18 },
  headerLeft: { display:"flex", alignItems:"center", gap:10 },
  headerTitle: { fontSize:15, fontWeight:600, color:"#f1f5f9", lineHeight:1.2 },
  headerSub:   { fontSize:11, color:"#475569", lineHeight:1.2, marginTop:1 },
  headerActions: { display:"flex", alignItems:"center", gap:8 },
  iconBtn:  { width:32,height:32, borderRadius:10, border:"1px solid rgba(148,163,184,0.15)", background:"#0d1426", color:"#64748b", display:"flex",alignItems:"center",justifyContent:"center", cursor:"pointer" },
  signOutBtn: { fontSize:12, padding:"6px 10px", borderRadius:999, border:"1px solid rgba(148,163,184,0.15)", background:"transparent", color:"#64748b", cursor:"pointer" },

  monthStrip: { background:"linear-gradient(135deg,#0f1f3d,#0d1a30)", border:"1px solid #1e3060", borderRadius:14, padding:"14px 16px", display:"flex", justifyContent:"space-between", marginBottom:20 },
  stripItem: { textAlign:"center", flex:1 },
  stripVal:  { fontSize:20, fontWeight:700, color:"#f1f5f9" },
  stripLbl:  { fontSize:10, color:"#475569", marginTop:2, letterSpacing:"0.05em" },
  stripSep:  { width:1, background:"rgba(255,255,255,0.06)" },

  centered: { display:"flex", flexDirection:"column", alignItems:"center", gap:12, padding:"52px 0" },
  hint: { fontSize:13, color:"#64748b", textAlign:"center", marginTop:4 },

  // Pre-depart card
  card: { background:"#0d1426", border:"1px solid rgba(148,163,184,0.1)", borderRadius:18, padding:"22px 18px", display:"flex", flexDirection:"column", gap:0, marginBottom:20 },
  cardTitle: { fontSize:18, fontWeight:700, color:"#f1f5f9", marginBottom:16 },
  fieldLabel: { fontSize:11, fontWeight:700, color:"#475569", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8, marginTop:14 },
  transportRow: { display:"flex", gap:8, flexWrap:"wrap" },
  transportChip: { display:"flex",alignItems:"center",gap:6, padding:"8px 14px", borderRadius:999, border:"1px solid rgba(148,163,184,0.15)", background:"transparent", color:"#64748b", fontSize:13, cursor:"pointer" },
  transportChipActive: { background:"#1d4ed8", borderColor:"#1d4ed8", color:"#fff", fontWeight:600 },
  warnBox: { background:"rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:10, padding:"10px 12px", fontSize:12, color:"#fbbf24", marginTop:8 },
  warnLink: { background:"none", border:"none", color:"#fbbf24", fontWeight:600, cursor:"pointer", textDecoration:"underline", padding:0 },
  input: { width:"100%", background:"#060e1f", border:"1px solid rgba(148,163,184,0.15)", borderRadius:10, padding:"10px 12px", fontSize:14, color:"#f1f5f9", outline:"none", marginBottom:0 },
  inputError: { borderColor:"rgba(239,68,68,0.5)" },
  errorMsg: { fontSize:11, color:"#fca5a5", marginTop:4 },
  errorBox: { background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:10, padding:"10px 12px", fontSize:13, color:"#fca5a5", marginTop:8 },
  primaryBtn: { width:"100%", padding:"13px", borderRadius:999, border:"none", background:"linear-gradient(135deg,#1d4ed8,#1e40af)", color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", marginTop:16, boxShadow:"0 4px 20px rgba(29,78,216,0.3)" },
  ghostBtn:   { width:"100%", padding:"12px", borderRadius:999, border:"1px solid rgba(148,163,184,0.15)", background:"transparent", color:"#475569", fontSize:14, cursor:"pointer", marginTop:8 },

  // Idle
  idleWrap: { display:"flex", flexDirection:"column", alignItems:"center", gap:12, padding:"32px 0 24px" },
  bigGreenBtn: { width:148,height:148, borderRadius:"50%", border:"none", background:"linear-gradient(160deg,#16a34a,#15803d)", color:"#f0fdf4", display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center", gap:6, fontWeight:700,fontSize:18, cursor:"pointer", boxShadow:"0 0 0 14px rgba(22,163,74,0.07), 0 0 0 28px rgba(22,163,74,0.03)" },
  vehiclePill: { display:"flex", alignItems:"center", gap:6, background:"rgba(29,78,216,0.08)", border:"1px solid rgba(29,78,216,0.2)", borderRadius:999, padding:"6px 14px", fontSize:12, color:"#93c5fd", marginTop:4 },

  // Traveling
  travelCard: { background:"#0d1426", border:"1px solid rgba(34,197,94,0.2)", borderRadius:18, padding:"24px 18px", display:"flex",flexDirection:"column",alignItems:"center", gap:8, marginBottom:20 },
  liveBadge: { display:"flex",alignItems:"center",gap:6, fontSize:10,fontWeight:700,letterSpacing:"0.08em",color:"#4ade80", padding:"4px 12px",borderRadius:999, border:"1px solid rgba(74,222,128,0.3)", background:"rgba(74,222,128,0.06)" },
  liveDot: { width:6,height:6,borderRadius:"50%",background:"#4ade80" },
  elapsed: { fontSize:52, fontWeight:800, color:"#f1f5f9", letterSpacing:"-3px", lineHeight:1 },
  travelMeta: { fontSize:12, color:"#475569" },
  purposeTag: { display:"flex",alignItems:"center",gap:6, background:"rgba(29,78,216,0.1)", border:"1px solid rgba(29,78,216,0.2)", borderRadius:8, padding:"7px 12px", fontSize:12,color:"#93c5fd", maxWidth:"100%", textAlign:"center" },
  arriveBtn: { marginTop:8, display:"flex",alignItems:"center",gap:8, padding:"14px 36px", borderRadius:999, border:"1px solid rgba(59,130,246,0.4)", background:"rgba(59,130,246,0.08)", color:"#3b82f6", fontWeight:700, fontSize:18, cursor:"pointer" },

  // Summary
  summaryCard: { background:"#0d1426", border:"1px solid rgba(59,130,246,0.2)", borderRadius:18, padding:"24px 18px", display:"flex",flexDirection:"column",alignItems:"center",gap:6, marginBottom:20 },
  summaryCheck: { width:60,height:60,borderRadius:"50%",background:"linear-gradient(135deg,#1d4ed8,#2563eb)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:26,boxShadow:"0 0 24px rgba(37,99,235,0.3)" },
  summaryTitle: { fontSize:20,fontWeight:700,color:"#f1f5f9",marginBottom:8 },
  summaryRows: { width:"100%",background:"rgba(15,23,42,0.5)",borderRadius:12,overflow:"hidden",border:"1px solid rgba(148,163,184,0.08)",marginBottom:8 },
  sumRow: { display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.04)" },
  sumLbl: { fontSize:13,color:"#64748b" },
  sumVal: { fontSize:14,fontWeight:600,color:"#f1f5f9" },

  // History
  historySection: { marginTop:8 },
  sectionTitle: { fontSize:11,fontWeight:700,color:"#334155",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:10 },
  tripCard: { display:"flex",alignItems:"center",gap:12, background:"#0d1426", border:"1px solid rgba(148,163,184,0.08)", borderRadius:12, padding:"12px 14px", marginBottom:8 },
  tripIcon: { width:36,height:36,borderRadius:10, background:"#0a1628", border:"1px solid #1a2b46", display:"flex",alignItems:"center",justifyContent:"center", flexShrink:0 },
  tripInfo: { flex:1, minWidth:0 },
  tripDest: { fontSize:13,fontWeight:500,color:"#e2e8f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" },
  tripMeta: { fontSize:11,color:"#475569",marginTop:2 },
  tripRight: { textAlign:"right",flexShrink:0 },
  tripKm: { fontSize:13,fontWeight:600,color:"#f1f5f9",marginBottom:4 },
  badge: { fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:999,border:"1px solid" },
};
