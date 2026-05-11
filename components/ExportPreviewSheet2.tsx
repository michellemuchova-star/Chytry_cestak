"use client";

import type { EmployeeGroup } from "@/lib/admin";

interface Props {
  group: EmployeeGroup;
  month: { year: number; month: number; label: string };
  zakazka: string;
}

function dash(s: string | null | undefined): string {
  const t = (s ?? "").trim();
  return t || "—";
}

function fmtIsoDate(iso: string | null | undefined): string {
  const raw = (iso ?? "").trim();
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const DECLARATION =
  "Prohlašuji, že všechny údaje uvedené v tomto vyúčtování cestovních náhrad jsou pravdivé a úplné. Dále potvrzuji, že vozidlo použité pro služební cestu: " +
  "• je řádně pojištěno dle zákona (má platné povinné ručení), " +
  "• má platnou technickou prohlídku (STK), " +
  "• a v případě, že nejsem vlastníkem vozidla, disponuji souhlasem jeho majitele s použitím pro služební účely " +
  "• je vybaveno pneumatikami v souladu s platnými právními předpisy – včetně zimních pneumatik, pokud je to v období od 1. listopadu do 31. března vyžadováno, a s minimální hloubkou dezénu 4 mm.";

export default function ExportPreviewSheet2({ group, month, zakazka }: Props) {
  const ev = group.exportVehicle;

  return (
    <div style={p.wrap}>
      <div style={p.banner}>
        <div style={p.bannerTitle}>2. STRANA VYÚČTOVÁNÍ</div>
        <div style={p.bannerSub}>
          {group.displayName} · {month.label}
        </div>
      </div>

      <table style={p.grid}>
        <tbody>
          <NumRow
            n={1}
            label="Určený dopravní prostředek dodavatele (druh vozidla, obsah válců, registrační značka)"
            value={ev?.vehicleLine ?? "—"}
          />
          <NumRow n={2} label="Průměrná spotřeba dle osvědčení o registraci vozidla" value={ev?.consumptionLine ?? "—"} />
          <NumRow n={3} label="Druh pohonné hmoty" value={ev?.fuelTypeLabel ?? "—"} />
          <NumRow n={4} label="Cena pohonné hmoty" value={ev?.fuelPriceLine ?? "—"} />
          <NumRow n={5} label="Náhrada za 1 km jízdy" value={ev?.kmRateLine ?? "—"} />
          <NumRow n={6} label="Bankovní účet dodavatele" value={dash(group.bankAccount)} />
          <NumRow n={7} label="Variabilní symbol" value={dash(group.variableSymbol)} />
          <NumRow n={8} label="Rok a měsíc" value={month.label} />
          <NumRow n={9} label="Pořadové číslo cestovního příkazu v měsíci" value={dash(group.travelOrderInMonth)} />
          <NumRow n={10} label="Osobní číslo" value={dash(group.personalNumber)} />
          <NumRow n={11} label="Datum splatnosti" value={fmtIsoDate(group.payoutDueDate)} />
          <NumRow n={12} label="Zakázka" value={dash(zakazka)} />
          <NumRow n={13} label="Pojišťovna" value={dash(group.insuranceCompany)} />
          <NumRow n={14} label="Číslo pojistné smlouvy" value={dash(ev?.insurancePolicyNumber)} />
          <NumRow n={15} label="Platnost pojištění" value={ev?.insuranceValidDisplay ?? "—"} />
          <NumRow n={16} label="Platnost technické prohlídky" value={ev?.stkValidDisplay ?? "—"} />
        </tbody>
      </table>

      <div style={p.section}>
        <div style={p.sectionTitle}>Běžná pracovní doba</div>
        <div style={p.workHours}>
          <span>
            <strong>od</strong> ______________________
          </span>
          <span>
            <strong>do</strong> ______________________
          </span>
        </div>
      </div>

      <div style={p.stampBox}>
        <div style={p.stampLine}>Razítko, datum a podpis pracovníka oprávněného k povolení cesty</div>
      </div>

      <div style={p.section}>
        <div style={p.fieldRow}>
          <span style={p.fieldLabel}>7. Zpráva o výsledku pracovní cesty byla podána dne</span>
          <span style={p.fieldBlank}>______________________________</span>
        </div>
        <div style={{ ...p.fieldRow, marginTop: 8 }}>
          <span style={p.fieldLabel}>Se způsobem provedení souhlasí:</span>
        </div>
        <div style={p.sigSingle}>Datum a podpis odpovědného pracovníka</div>
      </div>

      <div style={p.section}>
        <div style={p.fieldRow}>
          <span style={p.fieldLabel}>8. VÝDAJOVÝ A PŘÍJMOVÝ DOKLAD číslo</span>
          <span style={p.fieldBlank}>______________________________</span>
        </div>
        <div style={{ ...p.fieldRow, marginTop: 6 }}>
          <span style={p.fieldLabel}>Účtovací předpis</span>
          <span style={p.fieldBlank}>______________________________</span>
        </div>
      </div>

      <div style={p.section}>
        <div style={p.accountTitle}>Účtovaná náhrada byla přezkoušena a upravena na</div>
        <table style={p.accountTable}>
          <thead>
            <tr>
              <th style={p.ath}>Účet</th>
              <th style={p.ath}>Částka</th>
              <th style={p.ath}>Náhrada (Kč)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={p.atd}></td>
              <td style={p.atd}>Vyplacená záloha</td>
              <td style={p.atd}></td>
            </tr>
            <tr>
              <td style={p.atd}></td>
              <td style={p.atd}>Doplatek – Přeplatek</td>
              <td style={p.atd}></td>
            </tr>
          </tbody>
        </table>
        <div style={{ ...p.fieldRow, marginTop: 8 }}>
          <span style={p.fieldLabel}>Pořadové číslo cestovního příkazu v měsíci:</span>
          <span style={p.fieldBlank}>______________</span>
        </div>
      </div>

      <div style={p.checkRow}>
        <span style={p.checkLabel}>Stravování bylo poskytnuto bezplatně:</span>
        <span style={p.checkOpts}>ano ☐ &nbsp; ne ☐</span>
      </div>
      <div style={p.checkRow}>
        <span style={p.checkLabel}>Ubytování bylo poskytnuto bezplatně:</span>
        <span style={p.checkOpts}>ano ☐ &nbsp; ne ☐</span>
      </div>

      <div style={p.declaration}>{DECLARATION}</div>

      <div style={p.sigGrid}>
        <div style={p.sigCell}>
          <div style={p.sigLine} />
          <div style={p.sigCap}>Datum a podpis pracovníka, který upravil vyúčtování</div>
        </div>
        <div style={p.sigCell}>
          <div style={p.sigLine} />
          <div style={p.sigCap}>Datum a podpis pokladníka</div>
        </div>
        <div style={p.sigCell}>
          <div style={p.sigLine} />
          <div style={p.sigCap}>Datum a podpis příjemce (průkaz totožnosti)</div>
        </div>
        <div style={p.sigCell}>
          <div style={p.sigLine} />
          <div style={p.sigCap}>Schválil (datum a podpis)</div>
        </div>
      </div>

      <div style={p.footer2}>
        Položky 1–16 a bloky odpovídají listu „2.strana vyúčtování“ v souboru šablony.
      </div>
    </div>
  );
}

function NumRow({ n, label, value }: { n: number; label: string; value: string }) {
  return (
    <tr>
      <td style={p.numCell}>{n}.</td>
      <td style={p.lblCell}>{label}</td>
      <td style={p.valCell}>{value}</td>
    </tr>
  );
}

const p: Record<string, React.CSSProperties> = {
  wrap: { fontFamily: "Arial, Helvetica, sans-serif", fontSize: 8, color: "#000" },
  banner: {
    border: "2px solid #000",
    padding: "8px 10px",
    marginBottom: 10,
    textAlign: "center",
  },
  bannerTitle: { fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" },
  bannerSub: { fontSize: 8, color: "#444", marginTop: 4 },
  grid: {
    width: "100%",
    borderCollapse: "collapse",
    border: "2px solid #000",
    marginBottom: 10,
    tableLayout: "fixed" as const,
  },
  numCell: {
    width: "4%",
    border: "1px solid #000",
    padding: "3px 4px",
    verticalAlign: "top",
    fontWeight: 700,
    textAlign: "center",
    background: "#f3f4f6",
  },
  lblCell: {
    width: "44%",
    border: "1px solid #000",
    padding: "3px 6px",
    verticalAlign: "top",
    fontSize: 7,
    lineHeight: 1.25,
    background: "#fafafa",
  },
  valCell: {
    border: "1px solid #000",
    padding: "3px 6px",
    verticalAlign: "top",
    fontSize: 8,
    wordBreak: "break-word" as const,
  },
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 8, fontWeight: 700, marginBottom: 4 },
  workHours: { display: "flex", gap: 32, fontSize: 8 },
  stampBox: {
    border: "1px dashed #666",
    minHeight: 52,
    padding: "8px 10px",
    marginBottom: 10,
    display: "flex",
    alignItems: "flex-end",
  },
  stampLine: { fontSize: 7, color: "#555", width: "100%", textAlign: "center" },
  fieldRow: { display: "flex", flexWrap: "wrap" as const, alignItems: "baseline", gap: 8, fontSize: 8 },
  fieldLabel: { fontWeight: 600 },
  fieldBlank: { flex: 1, minWidth: 120, borderBottom: "1px solid #000", fontSize: 8 },
  sigSingle: {
    marginTop: 28,
    borderBottom: "1px solid #000",
    paddingBottom: 2,
    fontSize: 7,
    color: "#555",
    textAlign: "center",
    maxWidth: 280,
  },
  accountTitle: { fontSize: 8, fontWeight: 700, marginBottom: 4 },
  accountTable: {
    width: "100%",
    borderCollapse: "collapse",
    border: "1px solid #000",
    fontSize: 7,
  },
  ath: {
    border: "1px solid #000",
    padding: "3px 4px",
    background: "#ececec",
    textAlign: "left",
    fontWeight: 700,
  },
  atd: { border: "1px solid #999", padding: "4px 6px", height: 18 },
  checkRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 8, marginBottom: 4 },
  checkLabel: { fontWeight: 600 },
  checkOpts: { color: "#333" },
  declaration: {
    border: "1px solid #000",
    padding: "8px 10px",
    fontSize: 6.5,
    lineHeight: 1.35,
    marginBottom: 12,
    textAlign: "justify",
  },
  sigGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  sigCell: { display: "flex", flexDirection: "column", gap: 3 },
  sigLine: { height: 28, borderBottom: "1px solid #000" },
  sigCap: { fontSize: 6.5, color: "#555", textAlign: "center", lineHeight: 1.2 },
  footer2: { fontSize: 6.5, color: "#777", textAlign: "center", marginTop: 8 },
};
