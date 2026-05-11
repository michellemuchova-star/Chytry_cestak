"use client";

import { Timestamp } from "firebase/firestore";
import type { EmployeeGroup } from "@/lib/admin";
import { ORG_CONFIG, SUB_ORG_CONFIG } from "@/lib/types";
import type { Trip, TransportMode } from "@/lib/types";
import ExportPreviewSheet2 from "./ExportPreviewSheet2";

interface Props {
  group: EmployeeGroup;
  month: { year: number; month: number; label: string };
  onClose: () => void;
}

/** Zkratky dopravy jako na 1. straně šablony (docs/vzor-vyuctovani-PHA-9926031901.xlsx) */
function transportCode(mode: TransportMode): string {
  switch (mode) {
    case "car":
      return "AUV";
    case "train":
      return "O";
    case "bus":
      return "A";
    default:
      return "J";
  }
}

function fmt(ms: number | null | undefined, part: "date" | "time"): string {
  if (!ms) return "—";
  const d = new Date(ms);
  if (part === "date") return d.toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit", year: "numeric" });
  return d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
}

function fmtWeekday(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("cs-CZ", { weekday: "short" });
}

function czk(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  return n.toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function tripEndMs(trip: Trip): number | null {
  const e = trip.endTime;
  if (e == null) return null;
  if (e instanceof Timestamp) return e.toMillis();
  if (typeof e === "object" && e !== null && "seconds" in e) {
    return (e as { seconds: number }).seconds * 1000;
  }
  return null;
}

function dash(s: string | null | undefined): string {
  const t = (s ?? "").trim();
  return t || "—";
}

/** ISO RRRR-MM-DD → české datum */
function fmtBirth(iso: string | null | undefined): string {
  const raw = (iso ?? "").trim();
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function ExportPreview({ group, month, onClose }: Props) {
  const handlePrint = () => window.print();
  const org = ORG_CONFIG[group.organization] ?? ORG_CONFIG.euroinstitut;
  const subCfg = group.subOrganization ? SUB_ORG_CONFIG[group.subOrganization] : undefined;
  const zakazka = subCfg?.zakazka ?? org.zakazka;
  const pracoviste =
    group.organization === "euroinstitut" && subCfg
      ? `${subCfg.fullLabel} (${subCfg.label})`
      : group.organization === "euroinstitut"
        ? "— doplnit kraj v profilu zaměstnance"
        : "—";

  const totalKmCost = group.trips.reduce((s, t) => s + (t.kmCost ?? 0), 0);
  const totalPerDiem = group.trips.reduce((s, t) => s + (t.perDiemAmount ?? 0), 0);
  const totalTickets = group.trips.reduce((s, t) => s + (t.ticketPrice ?? 0), 0);
  const grandTotal = totalKmCost + totalPerDiem + totalTickets;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-root { background: white !important; }
          body { background: white !important; }
          @page { margin: 10mm; size: A4 landscape; }
          .print-sheet2 {
            page-break-before: always;
            break-before: page;
          }
        }
        @media screen {
          .print-root { background: #f8fafc; min-height: 100vh; }
          .print-sheet2 {
            margin-top: 28px;
            padding-top: 20px;
            border-top: 2px dashed #e2e8f0;
          }
        }
      `}</style>

      <div className="no-print" style={ctrl.bar}>
        <div style={ctrl.info}>
          <strong style={{ color: "#f1f5f9" }}>{group.displayName}</strong>
          <span style={{ color: "#64748b", marginLeft: 8 }}>{month.label}</span>
        </div>
        <div style={ctrl.buttons}>
          <button onClick={handlePrint} style={ctrl.printBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" />
            </svg>
            Tisk / Uložit jako PDF
          </button>
          <button onClick={onClose} style={ctrl.closeBtn}>
            ← Zpět
          </button>
        </div>
      </div>

      <div className="print-root" style={f.pageWrap}>
      <div style={f.page}>
        {/* Hlavička – jako list „1. strana vyúčtování“ */}
        <div style={f.formHeader}>
          <div style={f.formTitle}>VYÚČTOVÁNÍ PRACOVNÍ CESTY</div>
          <div style={f.formMetaRow}>
            <span style={f.formMetaItem}>
              <strong>Období (měsíc):</strong> {month.label}
            </span>
            <span style={f.formMetaItem}>
              <strong>Číslo listu:</strong> _______________
            </span>
          </div>
        </div>

        {/* Horní blok – popisky jako v Excelu (dodavatel vlevo, odběratel vpravo) */}
        <div style={f.topTwoCol}>
          <div style={f.topCol}>
            <TopField label="Dodavatel / Příjmení, jméno, titul:" value={group.displayName} />
            <TopField label="Bydliště:" value={dash(group.homeAddress)} />
            <TopField label="Datum narození dod.:" value={fmtBirth(group.birthDate)} />
            <TopField label="Osobní číslo dod.:" value={dash(group.personalNumber)} />
            <TopField label="Telefon dod.:" value={dash(group.phone)} />
            <TopField label="Útvar:" value={subCfg?.label ?? "—"} />
            <TopField label="Organizace (společnost)" value={org.label} />
            <TopField label="Pracoviště / kraj" value={pracoviste} />
          </div>
          <div style={f.topCol}>
            <TopField label="Odběratel / Organizace:" value={org.fullName} />
            <TopField label="Adresa organizace:" value={[org.address, org.city].filter(Boolean).join(", ") || "—"} />
            {org.ic && <TopField label="IČ:" value={org.ic} />}
            {zakazka && <TopField label="Zakázka:" value={zakazka} />}
          </div>
        </div>

        {/* Tabulka – sloupce podle 1. strany šablony */}
        <table style={f.table}>
          <thead>
            <tr>
              <th style={{ ...f.th, width: "6%" }} rowSpan={2}>
                Datum
              </th>
              <th style={{ ...f.th, width: "4%" }} rowSpan={2}>
                Den
              </th>
              <th style={{ ...f.th, width: "4%" }} rowSpan={2}>
                Ve dni
                <br />
                <span style={f.thSub}>(hod.)</span>
              </th>
              <th style={{ ...f.th, width: "5%" }} colSpan={2}>
                Odjezd – příjezd<sup style={f.sup}>1)</sup>
              </th>
              <th style={{ ...f.th, width: "18%" }} rowSpan={2}>
                Místo jednání
                <br />
                <span style={f.thSub}>podtrhněte</span>
              </th>
              <th style={{ ...f.th, width: "4%" }} rowSpan={2}>
                Použitý dopr.
                <br />
                prostředek<sup style={f.sup}>2)</sup>
              </th>
              <th style={{ ...f.th, width: "4%" }} rowSpan={2}>
                Vzdálenost
                <br />
                v km<sup style={f.sup}>3)</sup>
              </th>
              <th style={f.th} colSpan={6}>
                Náhrady (Kč)
              </th>
            </tr>
            <tr>
              <th style={f.th}>Odj.</th>
              <th style={f.th}>Přij.</th>
              <th style={f.th}>Jízdné a místní přeprava</th>
              <th style={f.th}>Km náhr.</th>
              <th style={f.th}>Stravné</th>
              <th style={f.th}>Nocležné</th>
              <th style={f.th}>Nutné vedl. výdaje</th>
              <th style={{ ...f.th, fontWeight: 700 }}>Celkem</th>
              <th style={f.th}>Upraveno</th>
            </tr>
          </thead>
          <tbody>
            {group.trips.map((trip, i) => {
              const rowTotal = (trip.kmCost ?? 0) + (trip.perDiemAmount ?? 0) + (trip.ticketPrice ?? 0);
              const endMs =
                tripEndMs(trip) ??
                (trip.startTimeMs && trip.perDiemHours != null
                  ? trip.startTimeMs + trip.perDiemHours * 3_600_000
                  : null);
              return (
                <tr key={trip.id} style={i % 2 === 0 ? f.trEven : {}}>
                  <td style={f.td}>{fmt(trip.startTimeMs, "date")}</td>
                  <td style={f.td}>{fmtWeekday(trip.startTimeMs)}</td>
                  <td style={f.td}>{trip.perDiemHours != null ? String(trip.perDiemHours) : ""}</td>
                  <td style={{ ...f.td, fontSize: 8 }}>{fmt(trip.startTimeMs, "time")}</td>
                  <td style={{ ...f.td, fontSize: 8 }}>{endMs != null ? fmt(endMs, "time") : "—"}</td>
                  <td style={{ ...f.td, textAlign: "left", fontSize: 8 }}>{trip.purpose || "—"}</td>
                  <td style={{ ...f.td, fontWeight: 700 }}>{transportCode(trip.transportMode)}</td>
                  <td style={f.td}>{trip.distanceKm ?? ""}</td>
                  <td style={f.td}>{czk(trip.ticketPrice)}</td>
                  <td style={f.td}>{czk(trip.kmCost)}</td>
                  <td style={f.td}>{czk(trip.perDiemAmount)}</td>
                  <td style={f.td}></td>
                  <td style={f.td}></td>
                  <td style={{ ...f.td, fontWeight: 700 }}>{czk(rowTotal)}</td>
                  <td style={f.td}></td>
                </tr>
              );
            })}

            {Array.from({ length: Math.max(0, 12 - group.trips.length) }).map((_, i) => (
              <tr key={`empty-${i}`} style={i % 2 === 0 ? f.trEven : {}}>
                {Array.from({ length: 15 }).map((_, j) => (
                  <td key={j} style={{ ...f.td, height: 18 }} />
                ))}
              </tr>
            ))}

            <tr style={f.totalRow}>
              <td style={{ ...f.td, ...f.totalCell }} colSpan={7}>
                CELKEM
              </td>
              <td style={{ ...f.td, ...f.totalCell }}>{group.totalKm}</td>
              <td style={{ ...f.td, ...f.totalCell }}>{czk(totalTickets)}</td>
              <td style={{ ...f.td, ...f.totalCell }}>{czk(totalKmCost)}</td>
              <td style={{ ...f.td, ...f.totalCell }}>{czk(totalPerDiem)}</td>
              <td style={{ ...f.td, ...f.totalCell }}></td>
              <td style={{ ...f.td, ...f.totalCell }}></td>
              <td style={{ ...f.td, ...f.totalCell, fontSize: 10 }}>{czk(grandTotal)}</td>
              <td style={{ ...f.td, ...f.totalCell }}></td>
            </tr>
          </tbody>
        </table>

        <div style={f.legendBlock}>
          <div style={f.legendTitle}>Použitý dopravní prostředek (zkratky)</div>
          <div style={f.legend}>
            <strong>O</strong> – osobní vlak &nbsp;|&nbsp; <strong>R</strong> – rychlík &nbsp;|&nbsp; <strong>A</strong> – autobus
            &nbsp;|&nbsp; <strong>AUV</strong> – auto vlastní &nbsp;|&nbsp; <strong>AUS</strong> – auto služební &nbsp;|&nbsp;{" "}
            <strong>AUP</strong> – auto z půjčovny &nbsp;|&nbsp; <strong>L</strong> – letadlo &nbsp;|&nbsp; <strong>MOS</strong>{" "}
            – motocykl služební &nbsp;|&nbsp; <strong>J</strong> – jiné
          </div>
          <div style={f.footnotes}>
            <p style={f.fn}>
              <sup>1)</sup> Dobu odjezdu a příjezdu u veřejného dopravního prostředku vyplňte podle jízdního řádu.
            </p>
            <p style={f.fn}>
              <sup>2)</sup> Uvádějte ve zkratce.
            </p>
            <p style={f.fn}>
              <sup>3)</sup> Počet km uvádějte jen při použití jiného než veřejného hromadného dopravního prostředku.
            </p>
          </div>
        </div>

        <div style={f.resultBox}>
          <div style={f.resultTitle}>VÝSLEDEK VYÚČTOVÁNÍ PRACOVNÍ CESTY</div>
          <div style={f.resultGrid}>
            <ResultRow label="Kilometrovné" value={czk(totalKmCost)} />
            <ResultRow label="Jízdné" value={czk(totalTickets)} />
            <ResultRow label="Stravné" value={czk(totalPerDiem)} />
            <ResultRow label="Nocležné" value="0,00" />
            <ResultRow label="Vedlejší výdaje" value="0,00" />
            <ResultRow label="CELKEM K PROPLACENÍ" value={czk(grandTotal)} bold />
          </div>
        </div>

        <div style={f.signatures}>
          <SignatureBox label="Datum a podpis pracovníka" />
          <SignatureBox label="Datum a podpis přímého nadřízeného" />
          <SignatureBox label="Schválil (datum a podpis)" />
        </div>

        <div style={f.footerNote}>
          Listy odpovídají souboru <code style={f.code}>docs/vzor-vyuctovani-PHA-9926031901.xlsx</code> (1. a 2. strana). Údaje o osobě
          vyplňte v <strong>Moje vozidlo</strong>; údaje o vozidle na 2. straně se berou z prvního aktivního vozidla v evidenci.
        </div>
        <div style={f.footer}>Chytrý Cesťák · {new Date().toLocaleDateString("cs-CZ")}</div>
      </div>

      <div className="print-sheet2" style={f.page}>
        <ExportPreviewSheet2 group={group} month={month} zakazka={zakazka} />
      </div>
      </div>
    </>
  );
}

function TopField({ label, value }: { label: string; value: string }) {
  return (
    <div style={f.topField}>
      <span style={f.topLabel}>{label}</span>
      <span style={f.topValue}>{value}</span>
    </div>
  );
}

function ResultRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      style={{
        ...f.resultRow,
        ...(bold ? { borderTop: "2px solid #000", marginTop: 4, paddingTop: 4 } : {}),
      }}
    >
      <span style={{ fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 400 }}>{value} Kč</span>
    </div>
  );
}

function SignatureBox({ label }: { label: string }) {
  return (
    <div style={f.sigBox}>
      <div style={f.sigLine} />
      <div style={f.sigLabel}>{label}</div>
    </div>
  );
}

const ctrl: Record<string, React.CSSProperties> = {
  bar: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    background: "#0d1426",
    borderBottom: "1px solid rgba(148,163,184,0.1)",
    padding: "12px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  info: { display: "flex", alignItems: "center", fontSize: 14 },
  buttons: { display: "flex", gap: 10 },
  printBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "9px 18px",
    borderRadius: 999,
    border: "none",
    background: "linear-gradient(135deg, #1d4ed8, #1e40af)",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  closeBtn: {
    padding: "9px 16px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.2)",
    background: "transparent",
    color: "#94a3b8",
    fontSize: 14,
    cursor: "pointer",
  },
};

const f: Record<string, React.CSSProperties> = {
  pageWrap: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "72px 0 32px",
    background: "#fff",
    minHeight: "100vh",
  },
  page: {
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: 9,
    color: "#000",
    padding: "0 28px 24px",
    background: "#fff",
  },
  formHeader: { marginBottom: 10, border: "2px solid #000", padding: "8px 10px" },
  formTitle: { fontSize: 14, fontWeight: 700, letterSpacing: "0.06em", textAlign: "center" },
  formMetaRow: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap" as const,
    gap: 6,
    marginTop: 6,
    paddingTop: 6,
    borderTop: "1px solid #000",
    fontSize: 9,
  },
  formMetaItem: { flex: "1 1 auto" },

  topTwoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: 10,
    border: "1px solid #000",
    padding: "8px 10px",
    background: "#fafafa",
  },
  topCol: { display: "flex", flexDirection: "column", gap: 3 },
  topField: { display: "flex", gap: 6, alignItems: "baseline", borderBottom: "1px dotted #bbb", paddingBottom: 2 },
  topLabel: { fontSize: 8, color: "#333", flex: "0 0 42%", minWidth: 0 },
  topValue: { fontSize: 9, fontWeight: 500, flex: 1, textAlign: "left" },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    border: "2px solid #000",
    marginBottom: 6,
    fontSize: 8,
    tableLayout: "fixed" as const,
  },
  th: {
    border: "1px solid #000",
    padding: "3px 2px",
    textAlign: "center",
    background: "#ececec",
    fontWeight: 700,
    fontSize: 7,
    lineHeight: 1.25,
    verticalAlign: "middle",
  },
  thSub: { fontWeight: 400, fontSize: 6 },
  sup: { fontSize: 6, lineHeight: 0 },
  td: {
    border: "1px solid #999",
    padding: "2px 2px",
    textAlign: "center",
    verticalAlign: "middle",
    wordBreak: "break-word" as const,
  },
  trEven: { background: "#f9fafb" },
  totalRow: { background: "#e8e8e8" },
  totalCell: { fontWeight: 700, border: "1px solid #000" },

  legendBlock: { marginBottom: 10 },
  legendTitle: { fontSize: 8, fontWeight: 700, marginBottom: 3 },
  legend: { fontSize: 7, color: "#222", lineHeight: 1.35, marginBottom: 4 },
  footnotes: { fontSize: 6.5, color: "#444", lineHeight: 1.35 },
  fn: { margin: "0 0 2px" },

  resultBox: {
    border: "2px solid #000",
    padding: "8px 12px",
    marginBottom: 12,
    maxWidth: 340,
  },
  resultTitle: {
    fontWeight: 700,
    fontSize: 10,
    marginBottom: 6,
    textAlign: "center",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },
  resultGrid: { display: "flex", flexDirection: "column", gap: 2 },
  resultRow: { display: "flex", justifyContent: "space-between", fontSize: 9, padding: "1px 0" },

  signatures: { display: "flex", gap: 16, marginTop: 16 },
  sigBox: { flex: 1, display: "flex", flexDirection: "column", gap: 3 },
  sigLine: { height: 32, borderBottom: "1px solid #000" },
  sigLabel: { fontSize: 7, color: "#555", textAlign: "center" },

  footerNote: {
    marginTop: 8,
    fontSize: 7,
    color: "#555",
    lineHeight: 1.35,
    padding: "0 4px",
  },
  code: { fontSize: 7, background: "#f1f5f9", padding: "0 4px" },
  footer: { marginTop: 6, fontSize: 7, color: "#999", textAlign: "center", borderTop: "1px solid #eee", paddingTop: 6 },
};
