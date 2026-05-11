"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  saveVehicle,
  updateVehicle,
  calculateKmRate,
  averageConsumption,
  FUEL_TYPE_LABELS,
  expiryColor,
  formatPlate,
} from "@/lib/vehicles";
import {
  DEFAULT_FUEL_PRICES,
  type Vehicle,
  type FuelType,
} from "@/lib/types";

const FUEL_TYPES: FuelType[] = ["diesel", "petrol95", "petrol98", "electric", "other"];

interface Props {
  user: User;
  existing: Vehicle | null;  // null = nové vozidlo (onboarding)
  onSave: (vehicle: Vehicle) => void;
  onBack?: () => void;
  demoMode?: boolean;  // při true neukládá do Firestore (pro demo)
}

export default function VehicleProfile({ user, existing, onSave, onBack, demoMode }: Props) {
  const isOnboarding = !existing;

  const [vehicleName,            setVehicleName]            = useState(existing?.vehicleName            ?? "");
  const [plateNumber,            setPlateNumber]            = useState(existing?.plateNumber            ?? "");
  const [engineVolumeCcm,        setEngineVolumeCcm]        = useState(existing?.engineVolumeCcm?.toString() ?? "");
  const [fuelType,               setFuelType]               = useState<FuelType>(existing?.fuelType     ?? "diesel");
  const [consumption1,           setConsumption1]           = useState(existing?.consumption1?.toString() ?? "");
  const [consumption2,           setConsumption2]           = useState(existing?.consumption2?.toString() ?? "");
  const [consumption3,           setConsumption3]           = useState(existing?.consumption3?.toString() ?? "");
  const [insurancePolicyNumber,  setInsurancePolicyNumber]  = useState(existing?.insurancePolicyNumber  ?? "");
  const [insuranceValidUntil,    setInsuranceValidUntil]    = useState(existing?.insuranceValidUntil    ?? "");
  const [stkValidUntil,          setStkValidUntil]          = useState(existing?.stkValidUntil          ?? "");
  const [homeAddress,     setHomeAddress]     = useState("");
  const [birthDate,       setBirthDate]       = useState("");
  const [personalNumber,  setPersonalNumber]  = useState("");
  const [phone,           setPhone]           = useState("");
  const [bankAccount,         setBankAccount]         = useState("");
  const [variableSymbol,      setVariableSymbol]      = useState("");
  const [insuranceCompany,    setInsuranceCompany]    = useState("");
  const [travelOrderInMonth,  setTravelOrderInMonth]  = useState("");
  const [payoutDueDate,       setPayoutDueDate]       = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (demoMode) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) return;
        const u = snap.data() as {
          homeAddress?: string | null;
          birthDate?: string | null;
          personalNumber?: string | null;
          phone?: string | null;
          bankAccount?: string | null;
          variableSymbol?: string | null;
          insuranceCompany?: string | null;
          travelOrderInMonth?: string | null;
          payoutDueDate?: string | null;
        };
        setHomeAddress(u.homeAddress?.trim() ?? "");
        setBirthDate((u.birthDate ?? "").trim());
        setPersonalNumber((u.personalNumber ?? "").trim());
        setPhone((u.phone ?? "").trim());
        setBankAccount((u.bankAccount ?? "").trim());
        setVariableSymbol((u.variableSymbol ?? "").trim());
        setInsuranceCompany((u.insuranceCompany ?? "").trim());
        setTravelOrderInMonth((u.travelOrderInMonth ?? "").trim());
        setPayoutDueDate((u.payoutDueDate ?? "").trim());
      } catch (e) {
        console.error(e);
      }
    })();
  }, [user.uid, demoMode]);

  // ─── Živý výpočet sazby ────────────────────────────────────────────────────

  const avgConsumption = averageConsumption(
    consumption1 ? parseFloat(consumption1) : null,
    consumption2 ? parseFloat(consumption2) : null,
    consumption3 ? parseFloat(consumption3) : null
  );
  const previewKmRate = calculateKmRate(avgConsumption, fuelType);
  const fuelPrice     = DEFAULT_FUEL_PRICES[fuelType];

  // ─── Validace ─────────────────────────────────────────────────────────────

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!vehicleName.trim())  e.vehicleName  = "Zadej typ vozidla";
    if (!plateNumber.trim())  e.plateNumber  = "Zadej SPZ";
    if (!consumption3.trim() && !consumption1.trim())
      e.consumption = "Zadej alespoň jednu hodnotu spotřeby";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ─── Uložení ───────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const data = {
        vehicleName:           vehicleName.trim(),
        plateNumber:           plateNumber.trim().toUpperCase(),
        engineVolumeCcm:       engineVolumeCcm ? parseInt(engineVolumeCcm) : null,
        fuelType,
        consumption1:          consumption1 ? parseFloat(consumption1) : null,
        consumption2:          consumption2 ? parseFloat(consumption2) : null,
        consumption3:          consumption3 ? parseFloat(consumption3) : null,
        insurancePolicyNumber: insurancePolicyNumber.trim() || null,
        insuranceValidUntil:   insuranceValidUntil || null,
        stkValidUntil:         stkValidUntil       || null,
        kmRatePerKm:           previewKmRate,
        isActive:              true,
      };

      if (demoMode) {
        const id = existing?.id ?? "demo-v1";
        onSave({ id, userId: user.uid, createdAt: null, updatedAt: null, ...data });
        setSaving(false);
        return;
      }

      let savedId: string;
      if (existing) {
        await updateVehicle(existing.id, data);
        savedId = existing.id;
      } else {
        savedId = await saveVehicle(user.uid, data);
        await updateDoc(doc(db, "users", user.uid), { defaultVehicleId: savedId });
      }

      const profilePatch = {
        homeAddress:        homeAddress.trim()        || null,
        birthDate:          birthDate.trim()          || null,
        personalNumber:     personalNumber.trim()     || null,
        phone:              phone.trim()              || null,
        bankAccount:        bankAccount.trim()        || null,
        variableSymbol:     variableSymbol.trim()     || null,
        insuranceCompany:   insuranceCompany.trim()   || null,
        travelOrderInMonth: travelOrderInMonth.trim() || null,
        payoutDueDate:      payoutDueDate.trim()      || null,
      };
      await updateDoc(doc(db, "users", user.uid), profilePatch);

      onSave({ id: savedId, userId: user.uid, createdAt: null, updatedAt: null, ...data });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={s.root}>
      <div style={s.container}>

        {/* Header */}
        <header style={s.header}>
          {onBack && (
            <button onClick={onBack} style={s.backBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
            </button>
          )}
          <div>
            <div style={s.headerTitle}>
              {isOnboarding ? "Nastav své vozidlo" : "Moje vozidlo"}
            </div>
            <div style={s.headerSub}>
              {isOnboarding
                ? "Stačí jednou – aplikace si vše zapamatuje"
                : "Vozidlo, sazba za km a údaje pro tisk vyúčtování"}
            </div>
          </div>
        </header>

        {isOnboarding && (
          <div style={s.onboardingNote}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            Bez vyplněného vozidla nelze zaznamenat cestu autem.
          </div>
        )}

        {/* ── Údaje pro tisk vyúčtování (PDF) ── */}
        <div style={s.sectionTitle}>Údaje pro tisk vyúčtování (PDF)</div>
        <div style={s.sectionHint}>
          Vyplň jednou – použijí se v administrátorském exportu za měsíc (1. i 2. strana vyúčtování).
        </div>

        <Field label="Bydliště (ulice, číslo, PSČ, obec)">
          <input
            style={s.input}
            placeholder="např. Noutonice 104, 252 64 Lichoceves"
            value={homeAddress}
            onChange={e => setHomeAddress(e.target.value)}
            disabled={demoMode}
          />
        </Field>

        <div style={s.row}>
          <Field label="Datum narození" style={{ flex: 1 }}>
            <input
              style={s.input}
              type="date"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              disabled={demoMode}
            />
          </Field>
          <Field label="Osobní číslo" style={{ flex: 1 }}>
            <input
              style={s.input}
              placeholder="např. Z0190"
              value={personalNumber}
              onChange={e => setPersonalNumber(e.target.value)}
              disabled={demoMode}
            />
          </Field>
        </div>

        <Field label="Telefon">
          <input
            style={s.input}
            type="tel"
            placeholder="+420 …"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            disabled={demoMode}
          />
        </Field>

        <div style={s.subSectionHint}>Doplňky k 2. straně (platba, pojistka v textu šablony)</div>

        <div style={s.privacyBox}>
          <strong style={s.privacyTitle}>Osobní údaje a účel</strong>
          <p style={s.privacyText}>
            Údaje v této sekci (včetně účtu, VS a kontaktů výše) slouží výhradně k vedení cestovních náhrad,
            tisku vyúčtování a komunikaci s účetnictvím vaší organizace. Zpracování probíhá v souladu s obecným
            nařízením o ochraně osobních údajů (GDPR) v rozsahu nezbytném pro plnění pracovněprávních vztahů.
            Přístup k nim mají v aplikaci jen oprávnění pracovníci (např. účetní, HR) dle nastavení organizace.
            Nepovinná pole můžeš kdykoli vyprázdnit a uložit — údaje se v databázi přepíšou nebo odstraní.
          </p>
        </div>

        <Field label="Bankovní účet (číslo účtu / IBAN)">
          <input
            style={s.input}
            placeholder="např. 123456789/0100"
            value={bankAccount}
            onChange={e => setBankAccount(e.target.value)}
            disabled={demoMode}
          />
        </Field>

        <Field label="Variabilní symbol (VS)">
          <input
            style={s.input}
            placeholder="např. 9926031901"
            value={variableSymbol}
            onChange={e => setVariableSymbol(e.target.value)}
            disabled={demoMode}
          />
        </Field>

        <Field label="Pojišťovna (název, např. u povinného ručení)">
          <input
            style={s.input}
            placeholder="např. Kooperativa"
            value={insuranceCompany}
            onChange={e => setInsuranceCompany(e.target.value)}
            disabled={demoMode}
          />
        </Field>

        <div style={s.row}>
          <Field label="Pořadové číslo CP v měsíci" style={{ flex: 1 }}>
            <input
              style={s.input}
              placeholder="např. 1"
              value={travelOrderInMonth}
              onChange={e => setTravelOrderInMonth(e.target.value)}
              disabled={demoMode}
            />
          </Field>
          <Field label="Datum splatnosti proplacení" style={{ flex: 1 }}>
            <input
              style={s.input}
              type="date"
              value={payoutDueDate}
              onChange={e => setPayoutDueDate(e.target.value)}
              disabled={demoMode}
            />
          </Field>
        </div>

        {/* ── Sekce: Základní údaje ── */}
        <div style={s.sectionTitle}>Základní údaje</div>

        <Field label="Typ vozidla (značka, model)" error={errors.vehicleName}>
          <input
            style={{...s.input, ...(errors.vehicleName ? s.inputError : {})}}
            placeholder="např. Škoda Octavia Combi 1.6 TDI"
            value={vehicleName}
            onChange={e => setVehicleName(e.target.value)}
          />
        </Field>

        <div style={s.row}>
          <Field label="SPZ" error={errors.plateNumber} style={{flex:1}}>
            <input
              style={{...s.input, ...(errors.plateNumber ? s.inputError : {}), textTransform:"uppercase"}}
              placeholder="1AB 2345"
              value={plateNumber}
              onChange={e => setPlateNumber(e.target.value)}
            />
          </Field>
          <Field label="Objem válců (cm³)" style={{flex:1}}>
            <input
              style={s.input}
              type="number"
              placeholder="1598"
              value={engineVolumeCcm}
              onChange={e => setEngineVolumeCcm(e.target.value)}
            />
          </Field>
        </div>

        {/* Typ paliva */}
        <Field label="Pohonná hmota">
          <div style={s.fuelRow}>
            {FUEL_TYPES.map(ft => (
              <button
                key={ft}
                style={{
                  ...s.fuelChip,
                  ...(fuelType === ft ? s.fuelChipActive : {}),
                }}
                onClick={() => setFuelType(ft)}
              >
                {FUEL_TYPE_LABELS[ft]}
              </button>
            ))}
          </div>
        </Field>

        {/* ── Sekce: Spotřeba ── */}
        <div style={s.sectionTitle}>Spotřeba dle technického průkazu</div>
        <div style={s.sectionHint}>Najdeš v technickém průkazu vozidla</div>

        <div style={s.row}>
          <Field label="Hodnota 1 – město" error={errors.consumption} style={{flex:1}}>
            <input
              style={{...s.input, ...(errors.consumption ? s.inputError : {})}}
              type="number"
              step="0.1"
              placeholder="5.8"
              value={consumption1}
              onChange={e => setConsumption1(e.target.value)}
            />
          </Field>
          <Field label="Hodnota 2 – mimo město" style={{flex:1}}>
            <input
              style={s.input}
              type="number"
              step="0.1"
              placeholder="4.2"
              value={consumption2}
              onChange={e => setConsumption2(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Hodnota 3 – kombinovaná" style={{maxWidth: "50%"}}>
          <input
            style={s.input}
            type="number"
            step="0.1"
            placeholder="4.9"
            value={consumption3}
            onChange={e => setConsumption3(e.target.value)}
          />
        </Field>

        {/* ── Výsledná sazba – live preview ── */}
        <div style={s.ratePreview}>
          <div style={s.ratePreviewLeft}>
            <div style={s.rateLabel}>Automaticky vypočtená sazba</div>
            <div style={s.rateFormula}>
              {avgConsumption
                ? `${avgConsumption.toFixed(1)} l × ${fuelPrice} Kč + 5,00 Kč (zákon)`
                : "Vyplň spotřebu pro výpočet"}
            </div>
          </div>
          <div style={s.rateValue}>{previewKmRate.toFixed(2)} Kč<span style={s.rateUnit}>/km</span></div>
        </div>

        {/* ── Sekce: Doklady ── */}
        <div style={s.sectionTitle}>Platnosti dokladů</div>
        <div style={s.sectionHint}>Aplikace tě upozorní, až se blíží konec platnosti</div>

        <div style={s.row}>
          <Field label="Číslo pojistné smlouvy" style={{flex:1}}>
            <input
              style={s.input}
              placeholder="8800123456"
              value={insurancePolicyNumber}
              onChange={e => setInsurancePolicyNumber(e.target.value)}
            />
          </Field>
        </div>

        <div style={s.row}>
          <Field label="Pojistka – platnost do" style={{flex:1}}>
            <input
              style={{
                ...s.input,
                color: insuranceValidUntil ? expiryColor(insuranceValidUntil) : "#94a3b8",
              }}
              type="date"
              value={insuranceValidUntil}
              onChange={e => setInsuranceValidUntil(e.target.value)}
            />
          </Field>
          <Field label="STK – platnost do" style={{flex:1}}>
            <input
              style={{
                ...s.input,
                color: stkValidUntil ? expiryColor(stkValidUntil) : "#94a3b8",
              }}
              type="date"
              value={stkValidUntil}
              onChange={e => setStkValidUntil(e.target.value)}
            />
          </Field>
        </div>

        {/* Uložit */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{...s.saveBtn, opacity: saving ? 0.7 : 1}}
        >
          {saving ? "Ukládám…" : isOnboarding ? "Uložit a pokračovat" : "Uložit změny"}
        </button>

      </div>
    </div>
  );
}

// ─── Pomocná Field komponenta ─────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
  style,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ marginBottom: 12, ...style }}>
      <label style={s.label}>{label}</label>
      {children}
      {error && <div style={s.errorMsg}>{error}</div>}
    </div>
  );
}

// ─── Styly ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at top, #0f172a 0%, #020617 70%)",
    padding: "0 0 48px",
    color: "#f1f5f9",
  },
  container: {
    maxWidth: 520,
    margin: "0 auto",
    padding: "0 16px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "20px 0 18px",
    borderBottom: "1px solid rgba(148,163,184,0.1)",
    marginBottom: 20,
  },
  backBtn: {
    width: 38, height: 38,
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.15)",
    background: "#0d1426",
    color: "#94a3b8",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  headerTitle: { fontSize: 18, fontWeight: 700, color: "#f1f5f9" },
  headerSub:   { fontSize: 12, color: "#64748b", marginTop: 2 },
  onboardingNote: {
    display: "flex", alignItems: "flex-start", gap: 10,
    background: "rgba(29,78,216,0.1)",
    border: "1px solid rgba(29,78,216,0.25)",
    borderRadius: 12,
    padding: "12px 14px",
    fontSize: 13, color: "#93c5fd",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: 700, color: "#475569",
    letterSpacing: "0.07em", textTransform: "uppercase",
    marginBottom: 4, marginTop: 20,
  },
  sectionHint: {
    fontSize: 12, color: "#334155",
    marginBottom: 12,
  },
  subSectionHint: {
    fontSize: 11,
    fontWeight: 600,
    color: "#64748b",
    marginTop: 16,
    marginBottom: 8,
  },
  privacyBox: {
    background: "rgba(148, 163, 184, 0.08)",
    border: "1px solid rgba(148, 163, 184, 0.22)",
    borderRadius: 12,
    padding: "12px 14px",
    marginBottom: 14,
  },
  privacyTitle: {
    display: "block",
    fontSize: 11,
    color: "#e2e8f0",
    marginBottom: 8,
    letterSpacing: "0.02em",
  },
  privacyText: {
    margin: 0,
    fontSize: 11,
    lineHeight: 1.45,
    color: "#94a3b8",
  },
  label: {
    display: "block",
    fontSize: 11, fontWeight: 600, color: "#475569",
    letterSpacing: "0.05em", textTransform: "uppercase",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    background: "#0d1426",
    border: "1px solid rgba(148,163,184,0.15)",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14, color: "#f1f5f9",
    outline: "none",
  },
  inputError: {
    borderColor: "rgba(239,68,68,0.5)",
  },
  errorMsg: {
    fontSize: 11, color: "#fca5a5",
    marginTop: 4,
  },
  row: {
    display: "flex", gap: 10,
  },
  fuelRow: {
    display: "flex", flexWrap: "wrap", gap: 8,
  },
  fuelChip: {
    padding: "7px 14px", borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.15)",
    background: "transparent",
    color: "#64748b", fontSize: 13, cursor: "pointer",
  },
  fuelChipActive: {
    background: "#1d4ed8",
    borderColor: "#1d4ed8",
    color: "#fff",
    fontWeight: 600,
  },
  ratePreview: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "linear-gradient(135deg, #0f1f3d, #0d1528)",
    border: "1px solid #1e3060",
    borderRadius: 14,
    padding: "14px 16px",
    marginTop: 8, marginBottom: 4,
  },
  ratePreviewLeft: { flex: 1 },
  rateLabel:   { fontSize: 12, color: "#93c5fd", marginBottom: 3 },
  rateFormula: { fontSize: 11, color: "#334155" },
  rateValue:   { fontSize: 26, fontWeight: 800, color: "#3b82f6" },
  rateUnit:    { fontSize: 14, fontWeight: 500, color: "#64748b" },
  saveBtn: {
    width: "100%",
    marginTop: 28,
    padding: "14px",
    borderRadius: 999,
    border: "none",
    background: "linear-gradient(135deg, #1d4ed8, #1e40af)",
    color: "#fff",
    fontSize: 16, fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(29,78,216,0.3)",
  },
};
