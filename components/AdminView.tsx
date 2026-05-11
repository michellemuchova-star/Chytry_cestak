"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { signOut } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  getAllTripsByMonth, getAllUsers, markTripProcessed,
  groupTripsByEmployee, enrichEmployeeGroupsWithVehicles, getLastMonths,
  type EmployeeGroup,
} from "@/lib/admin";
import { formatCurrency, formatDate } from "@/lib/trips";
import { ORG_CONFIG, SUB_ORG_CONFIG, type Organization, type SubOrganization } from "@/lib/types";
import type { Trip } from "@/lib/types";
import ExportPreview from "./ExportPreview";
import AppLogo from "./AppLogo";

export interface AdminDemoData {
  groups: EmployeeGroup[];
}

interface Props { user: User; demoData?: AdminDemoData; onSignOut?: () => void }

export default function AdminView({ user, demoData, onSignOut }: Props) {
  const months = getLastMonths(6);

  const [selectedMonth,  setSelectedMonth]  = useState(months[0]);
  const [selectedOrg,    setSelectedOrg]    = useState<Organization | null>(null);
  const [selectedSubOrg, setSelectedSubOrg] = useState<SubOrganization | null>(null);
  const [allGroups,      setAllGroups]      = useState<EmployeeGroup[]>(demoData?.groups ?? []);
  const [loading,        setLoading]        = useState(!demoData);
  const [expanded,       setExpanded]       = useState<string | null>(null);
  const [exportGroup,    setExportGroup]    = useState<EmployeeGroup | null>(null);

  // Resetuj sub-org filtr při změně organizace
  const handleSetOrg = (org: Organization | null) => {
    setSelectedOrg(org);
    setSelectedSubOrg(null);
  };

  // Filtrované skupiny
  const groups = allGroups.filter(g => {
    if (selectedOrg    && g.organization    !== selectedOrg)    return false;
    if (selectedSubOrg && g.subOrganization !== selectedSubOrg) return false;
    return true;
  });

  // Zobraz sub-org filtry jen když je vybraný Euroinstitut
  const showSubOrgFilter = selectedOrg === "euroinstitut";

  // ─── Načtení dat ────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (demoData) {
      setAllGroups(demoData.groups);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [trips, users] = await Promise.all([
        getAllTripsByMonth(selectedMonth.year, selectedMonth.month),
        getAllUsers(),
      ]);
      const grouped = groupTripsByEmployee(trips, users);
      setAllGroups(await enrichEmployeeGroupsWithVehicles(grouped));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, demoData]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Součty za celý měsíc ────────────────────────────────────────────────────

  const totals = groups.reduce(
    (acc, g) => ({
      trips:    acc.trips    + g.trips.length,
      km:       acc.km       + g.totalKm,
      kmCost:   acc.kmCost   + g.totalKmCost,
      perDiem:  acc.perDiem  + g.totalPerDiem,
      tickets:  acc.tickets  + g.totalTickets,
      total:    acc.total    + g.totalAll,
    }),
    { trips: 0, km: 0, kmCost: 0, perDiem: 0, tickets: 0, total: 0 }
  );

  const handleMarkProcessed = async (tripId: string) => {
    if (demoData) {
      setAllGroups(prev =>
        prev.map(g => ({
          ...g,
          trips: g.trips.map(t =>
            t.id === tripId ? { ...t, status: "approved" as const } : t
          ),
        }))
      );
      return;
    }
    await markTripProcessed(tripId);
    loadData();
  };

  const handleEmployeeSubOrgSet = useCallback(
    async (uid: string, sub: SubOrganization) => {
      if (demoData) {
        setAllGroups(prev => prev.map(g => (g.uid === uid ? { ...g, subOrganization: sub } : g)));
        return;
      }
      await updateDoc(doc(db, "users", uid), { subOrganization: sub });
      await loadData();
    },
    [demoData, loadData]
  );

  // ─── Export overlay ──────────────────────────────────────────────────────────

  if (exportGroup) {
    return (
      <ExportPreview
        group={exportGroup}
        month={selectedMonth}
        onClose={() => setExportGroup(null)}
      />
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={s.root}>
      <div style={s.container}>

        {/* Header */}
        <header style={s.header}>
          <div style={s.headerLeft}>
            <AppLogo />
            <div>
              <div style={s.headerTitle}>Přehled cest</div>
              <div style={s.headerSub}>Správce · {user.displayName ?? user.email}</div>
            </div>
          </div>
          <button onClick={() => (onSignOut ?? (() => signOut(auth)))()} style={s.signOutBtn}>Odhlásit</button>
        </header>

        {/* Výběr měsíce */}
        <div style={s.monthRow}>
          {months.map(m => (
            <button
              key={`${m.year}-${m.month}`}
              style={{
                ...s.monthChip,
                ...(m.year === selectedMonth.year && m.month === selectedMonth.month
                  ? s.monthChipActive : {}),
              }}
              onClick={() => setSelectedMonth(m)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Filtr organizace */}
        <div style={s.orgRow}>
          <button
            style={{ ...s.orgChip, ...(selectedOrg === null ? s.orgChipActive : {}) }}
            onClick={() => handleSetOrg(null)}
          >
            Všechny
          </button>
          {(Object.entries(ORG_CONFIG) as [Organization, typeof ORG_CONFIG[Organization]][]).map(([key, cfg]) => (
            <button
              key={key}
              style={{
                ...s.orgChip,
                ...(selectedOrg === key ? {
                  background: `${cfg.color}20`,
                  borderColor: cfg.color,
                  color: cfg.color,
                  fontWeight: 600,
                } : {}),
              }}
              onClick={() => handleSetOrg(key)}
            >
              <span style={{
                display: "inline-block", width: 8, height: 8,
                borderRadius: "50%", background: cfg.color, marginRight: 6,
              }} />
              {cfg.label}
            </button>
          ))}
        </div>

        {/* Filtr podorganizace – zobrazí se jen pro Euroinstitut */}
        {showSubOrgFilter && (
          <div style={s.subOrgRow}>
            <button
              style={{ ...s.subOrgChip, ...(selectedSubOrg === null ? s.subOrgChipActive : {}) }}
              onClick={() => setSelectedSubOrg(null)}
            >
              Všechny kraje
            </button>
            {(Object.entries(SUB_ORG_CONFIG) as [SubOrganization, typeof SUB_ORG_CONFIG[SubOrganization]][]).map(([key, cfg]) => (
              <button
                key={key}
                style={{
                  ...s.subOrgChip,
                  ...(selectedSubOrg === key ? {
                    background:  `${cfg.color}20`,
                    borderColor: cfg.color,
                    color:       cfg.color,
                    fontWeight:  700,
                  } : {}),
                }}
                onClick={() => setSelectedSubOrg(key)}
              >
                <span style={{
                  display: "inline-block", width: 8, height: 8,
                  borderRadius: "50%", background: cfg.color, marginRight: 5, flexShrink: 0,
                }} />
                {cfg.label}
              </button>
            ))}
          </div>
        )}

        {/* Souhrn měsíce */}
        {!loading && (
          <div style={s.summaryStrip}>
            <SummaryTile label="Zaměstnanců"  value={String(groups.length)} />
            <div style={s.sep} />
            <SummaryTile label="Cest"         value={String(totals.trips)} />
            <div style={s.sep} />
            <SummaryTile label="Km celkem"    value={`${Math.round(totals.km)}`} />
            <div style={s.sep} />
            <SummaryTile label="K proplacení" value={Math.round(totals.total).toLocaleString("cs-CZ") + " Kč"} highlight />
          </div>
        )}

        {/* Obsah */}
        {loading ? (
          <div style={s.centered}>
            <Spinner />
            <p style={s.hint}>Načítám…</p>
          </div>
        ) : groups.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}>📭</div>
            <div style={s.emptyText}>Žádné cesty v {selectedMonth.label}</div>
          </div>
        ) : (
          <div style={s.groupList}>
            {groups.map(group => (
              <EmployeeCard
                key={group.uid}
                group={group}
                expanded={expanded === group.uid}
                onToggle={() => setExpanded(expanded === group.uid ? null : group.uid)}
                onExport={() => setExportGroup(group)}
                onMarkProcessed={handleMarkProcessed}
                demoMode={!!demoData}
                onSubOrgSet={handleEmployeeSubOrgSet}
              />
            ))}
          </div>
        )}

        {/* Pata – exportovat vše / vybranou organizaci */}
        {!loading && groups.length > 0 && (
          <button
            style={s.exportAllBtn}
            onClick={() => setExportGroup(groups[0])}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
            {selectedSubOrg
              ? `Exportovat PDF – ${SUB_ORG_CONFIG[selectedSubOrg].label}`
              : selectedOrg
                ? `Exportovat PDF – ${ORG_CONFIG[selectedOrg].label}`
                : "Exportovat celý měsíc jako PDF"}
          </button>
        )}

      </div>
    </div>
  );
}

// ─── Výběr kraje u Euroinstitut bez subOrganization (správce doplní do profilu) ─

function SubOrgQuickPick({
  userId,
  demoMode,
  onDone,
}: {
  userId: string;
  demoMode: boolean;
  onDone: (sub: SubOrganization) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const pick = async (sub: SubOrganization) => {
    await onDone(sub);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} onClick={e => e.stopPropagation()} style={{ marginTop: 6, position: "relative" }}>
      <button type="button" style={s.krajBtn} onClick={() => setOpen(o => !o)}>
        Kraj nevyplněn — zvolit
      </button>
      {open && (
        <div style={s.krajMenu} role="listbox">
          {(Object.keys(SUB_ORG_CONFIG) as SubOrganization[]).map(k => {
            const cfg = SUB_ORG_CONFIG[k];
            return (
              <button key={k} type="button" style={s.krajItem} onClick={() => pick(k)}>
                <span style={{ fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                <span style={{ color: "#94a3b8", fontSize: 10, display: "block", marginTop: 2 }}>{cfg.fullLabel}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Karta zaměstnance ────────────────────────────────────────────────────────

function EmployeeCard({
  group,
  expanded,
  onToggle,
  onExport,
  onMarkProcessed,
  demoMode,
  onSubOrgSet,
}: {
  group: EmployeeGroup;
  expanded: boolean;
  onToggle: () => void;
  onExport: () => void;
  onMarkProcessed: (id: string) => void;
  demoMode: boolean;
  onSubOrgSet: (uid: string, sub: SubOrganization) => void;
}) {
  const pendingCount = group.trips.filter(t => t.status === "draft").length;

  return (
    <div style={s.empCard}>
      <div style={s.empHeader}>
        <div
          style={s.empHeaderMain}
          onClick={onToggle}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle();
            }
          }}
        >
          <div
            style={{
              ...s.empAvatar,
              background: `linear-gradient(135deg, ${ORG_CONFIG[group.organization].color}44, ${ORG_CONFIG[group.organization].color}88)`,
              color: ORG_CONFIG[group.organization].color,
            }}
          >
            {group.displayName
              .split(" ")
              .map(w => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div style={s.empInfo}>
            <div style={s.empName}>{group.displayName}</div>
            <div style={s.empOrgLine}>
              <span style={{ color: "#94a3b8" }}>{ORG_CONFIG[group.organization].label}</span>
              {group.organization === "euroinstitut" && group.subOrganization && (
                <>
                  <span style={{ color: "#475569" }}> · </span>
                  <span style={{ color: "#cbd5e1" }}>
                    {SUB_ORG_CONFIG[group.subOrganization].fullLabel} ({SUB_ORG_CONFIG[group.subOrganization].label})
                  </span>
                </>
              )}
            </div>
            {group.organization === "euroinstitut" && !group.subOrganization && (
              <SubOrgQuickPick
                userId={group.uid}
                demoMode={demoMode}
                onDone={sub => onSubOrgSet(group.uid, sub)}
              />
            )}
            <div style={s.empMeta}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "1px 6px",
                  borderRadius: 999,
                  background: `${ORG_CONFIG[group.organization].color}18`,
                  color: ORG_CONFIG[group.organization].color,
                  border: `1px solid ${ORG_CONFIG[group.organization].color}40`,
                }}
              >
                {ORG_CONFIG[group.organization].label}
              </span>
              {group.trips.length} {group.trips.length === 1 ? "cesta" : group.trips.length < 5 ? "cesty" : "cest"}
              {pendingCount > 0 && <span style={s.pendingBadge}>{pendingCount} ke zprac.</span>}
            </div>
          </div>
        </div>
        <div style={s.empRight} onClick={onToggle} role="presentation">
          <div style={s.empTotal}>{group.totalAll.toLocaleString("cs-CZ")} Kč</div>
          <div style={s.empKm}>{group.totalKm} km</div>
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? "Sbalit kartu" : "Rozbalit kartu"}
          style={s.chevronBtn}
          onClick={e => {
            e.stopPropagation();
            onToggle();
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="#475569"
            style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .2s", display: "block" }}
          >
            <path d="M7 10l5 5 5-5z" />
          </svg>
        </button>
      </div>

      {/* Rozbalený seznam cest */}
      {expanded && (
        <div style={s.tripsList}>
          {/* Mini součty */}
          <div style={s.miniTotals}>
            <MiniTile label="Km" value={`${group.totalKm}`} />
            <MiniTile label="Km Kč" value={formatCurrency(group.totalKmCost)} />
            <MiniTile label="Stravné" value={formatCurrency(group.totalPerDiem)} />
            <MiniTile label="Jízdné" value={formatCurrency(group.totalTickets)} />
          </div>

          {group.trips.map(trip => (
            <TripRow key={trip.id} trip={trip} onMarkProcessed={onMarkProcessed} />
          ))}

          {/* Tlačítka */}
          <div style={s.empActions}>
            <button style={s.exportBtn} onClick={onExport}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
              Exportovat PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Řádek cesty ─────────────────────────────────────────────────────────────

function TripRow({ trip, onMarkProcessed }: { trip: Trip; onMarkProcessed: (id: string) => void }) {
  const TRANSPORT: Record<string, string> = { car:"Auto", train:"Vlak", bus:"Bus", other:"Jiné" };
  const isDraft = trip.status === "draft";

  return (
    <div style={s.tripRow}>
      <div style={s.tripRowLeft}>
        <div style={s.tripDate}>{trip.startTimeMs ? formatDate(trip.startTimeMs) : "—"}</div>
        <div style={s.tripPurpose}>{trip.purpose || "—"}</div>
        <div style={s.tripDetail}>
          {TRANSPORT[trip.transportMode] ?? "—"}
          {trip.distanceKm ? ` · ${trip.distanceKm} km` : ""}
          {trip.perDiemHours ? ` · ${trip.perDiemHours} h` : ""}
        </div>
      </div>
      <div style={s.tripRowRight}>
        <div style={s.tripAmount}>
          {formatCurrency((trip.kmCost ?? 0) + (trip.perDiemAmount ?? 0) + (trip.ticketPrice ?? 0))}
        </div>
        {isDraft ? (
          <button style={s.processBtn} onClick={() => onMarkProcessed(trip.id)}>
            ✓ Zpracovat
          </button>
        ) : (
          <span style={s.processedBadge}>Zpracováno</span>
        )}
      </div>
    </div>
  );
}

// ─── Malé sub-komponenty ──────────────────────────────────────────────────────

function SummaryTile({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={s.summaryTile}>
      <div style={{ ...s.tileVal, ...(highlight ? { color: "#3b82f6", fontSize: 18 } : {}) }}>{value}</div>
      <div style={s.tileLbl}>{label}</div>
    </div>
  );
}

function MiniTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={s.miniTile}>
      <div style={s.miniVal}>{value}</div>
      <div style={s.miniLbl}>{label}</div>
    </div>
  );
}

function Spinner() {
  return <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(148,163,184,0.15)", borderTop: "3px solid #38bdf8" }} />;
}

// ─── Styly ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "radial-gradient(ellipse at top, #0f172a 0%, #020617 70%)", paddingBottom: 60, color: "#f1f5f9" },
  container: { maxWidth: 640, margin: "0 auto", padding: "0 16px" },

  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0 14px", borderBottom: "1px solid rgba(148,163,184,0.08)", marginBottom: 18 },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  headerTitle: { fontSize: 16, fontWeight: 700, color: "#f1f5f9" },
  headerSub:   { fontSize: 11, color: "#475569", marginTop: 1 },
  signOutBtn:  { fontSize: 12, padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(148,163,184,0.15)", background: "transparent", color: "#64748b", cursor: "pointer" },

  monthRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  monthChip: { padding: "7px 14px", borderRadius: 999, border: "1px solid rgba(148,163,184,0.15)", background: "transparent", color: "#475569", fontSize: 12, cursor: "pointer" },
  monthChipActive: { background: "#1d4ed8", borderColor: "#1d4ed8", color: "#fff", fontWeight: 600 },

  orgRow:  { display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: 10 },
  orgChip: { display: "flex", alignItems: "center", padding: "7px 14px", borderRadius: 999, border: "1px solid rgba(148,163,184,0.15)", background: "transparent", color: "#475569", fontSize: 12, cursor: "pointer" },
  orgChipActive: { background: "rgba(29,78,216,0.15)", borderColor: "#3b82f6", color: "#93c5fd", fontWeight: 600 },

  subOrgRow:  { display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 16, paddingBottom: 16, paddingTop: 4, borderBottom: "1px solid rgba(148,163,184,0.08)", borderTop: "1px solid rgba(148,163,184,0.06)", paddingLeft: 8 },
  subOrgChip: { display: "flex", alignItems: "center", padding: "5px 12px", borderRadius: 999, border: "1px solid rgba(148,163,184,0.12)", background: "rgba(15,23,42,0.6)", color: "#475569", fontSize: 11, cursor: "pointer" },
  subOrgChipActive: {},

  summaryStrip: { display: "flex", background: "linear-gradient(135deg, #0f1f3d, #0d1a30)", border: "1px solid #1e3060", borderRadius: 14, padding: "14px 8px", marginBottom: 20, justifyContent: "space-between" },
  summaryTile:  { flex: 1, textAlign: "center" },
  tileVal:      { fontSize: 16, fontWeight: 700, color: "#f1f5f9" },
  tileLbl:      { fontSize: 10, color: "#475569", marginTop: 2, letterSpacing: "0.05em" },
  sep:          { width: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" },

  centered: { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "52px 0" },
  hint: { fontSize: 13, color: "#64748b" },

  empty: { textAlign: "center", padding: "52px 0" },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 14, color: "#475569" },

  groupList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 },

  empCard:   { background: "#0d1426", border: "1px solid rgba(148,163,184,0.1)", borderRadius: 14, overflow: "visible" },
  empHeader: { width: "100%", display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", background: "transparent", border: "none", color: "#f1f5f9", textAlign: "left" },
  empHeaderMain: { flex: 1, minWidth: 0, display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" },
  chevronBtn: { flexShrink: 0, alignSelf: "center", padding: 4, margin: "-4px -4px -4px 0", border: "none", background: "transparent", cursor: "pointer", borderRadius: 8, color: "#f1f5f9" },
  krajBtn: { fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(251,191,36,0.45)", background: "rgba(251,191,36,0.1)", color: "#fbbf24", cursor: "pointer", textAlign: "left" },
  krajMenu: { position: "absolute", zIndex: 50, marginTop: 4, minWidth: 220, maxHeight: 280, overflowY: "auto" as const, borderRadius: 10, border: "1px solid rgba(148,163,184,0.2)", background: "#0f172a", boxShadow: "0 12px 40px rgba(0,0,0,0.45)", padding: 4 },
  krajItem: { display: "block", width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 8, border: "none", background: "transparent", color: "#e2e8f0", cursor: "pointer", fontSize: 12 },
  empAvatar: { width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg, #1d3c72, #2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#bfdbfe", flexShrink: 0 },
  empInfo:   { flex: 1, minWidth: 0 },
  empName:   { fontSize: 14, fontWeight: 600, color: "#f1f5f9" },
  empOrgLine: { fontSize: 12, lineHeight: 1.35, marginTop: 4, marginBottom: 4 },
  empMeta:   { fontSize: 11, color: "#475569", marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" as const },
  empRight:  { textAlign: "right", flexShrink: 0, cursor: "pointer", paddingTop: 2 },
  empTotal:  { fontSize: 15, fontWeight: 700, color: "#f1f5f9" },
  empKm:     { fontSize: 11, color: "#475569", marginTop: 2 },
  pendingBadge: { background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 999, padding: "1px 7px", fontSize: 10, color: "#fbbf24", fontWeight: 600 },

  tripsList: { borderTop: "1px solid rgba(148,163,184,0.08)", padding: "0 16px 16px" },

  miniTotals: { display: "flex", gap: 0, marginTop: 12, marginBottom: 12, background: "rgba(15,23,42,0.5)", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(148,163,184,0.08)" },
  miniTile:   { flex: 1, textAlign: "center", padding: "8px 4px", borderRight: "1px solid rgba(148,163,184,0.06)" },
  miniVal:    { fontSize: 13, fontWeight: 600, color: "#f1f5f9" },
  miniLbl:    { fontSize: 10, color: "#475569", marginTop: 1 },

  tripRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid rgba(148,163,184,0.06)" },
  tripRowLeft:  { flex: 1 },
  tripRowRight: { textAlign: "right", flexShrink: 0, marginLeft: 12 },
  tripDate:    { fontSize: 12, color: "#64748b", marginBottom: 2 },
  tripPurpose: { fontSize: 13, fontWeight: 500, color: "#e2e8f0" },
  tripDetail:  { fontSize: 11, color: "#475569", marginTop: 2 },
  tripAmount:  { fontSize: 14, fontWeight: 600, color: "#f1f5f9", marginBottom: 4 },
  processBtn:  { fontSize: 11, padding: "4px 10px", borderRadius: 999, border: "1px solid rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.06)", color: "#4ade80", cursor: "pointer", fontWeight: 600 },
  processedBadge: { fontSize: 10, padding: "3px 8px", borderRadius: 999, border: "1px solid rgba(148,163,184,0.2)", color: "#475569" },

  empActions:   { display: "flex", gap: 8, marginTop: 14 },
  exportBtn:    { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", borderRadius: 10, border: "1px dashed rgba(59,130,246,0.3)", background: "rgba(29,78,216,0.05)", color: "#3b82f6", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  exportAllBtn: { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px", borderRadius: 12, border: "1px solid rgba(29,78,216,0.3)", background: "rgba(29,78,216,0.08)", color: "#3b82f6", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 4 },
};
