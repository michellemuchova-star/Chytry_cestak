import type { Timestamp } from "firebase/firestore";

export type UserRole        = "employee" | "manager" | "hr" | "accountant" | "admin";
export type TransportMode   = "car" | "train" | "bus" | "other";
export type TripStatus      = "active" | "draft" | "submitted" | "approved" | "rejected";
export type DistanceSource  = "gps_route" | "manual" | "ticket";
export type FuelType        = "diesel" | "petrol95" | "petrol98" | "electric" | "other";
export type Organization    = "euroinstitut" | "eduservis" | "biotherapy";
export type SubOrganization = "PHA" | "STC" | "ULK" | "OLK" | "KVK" | "SPC";

// ─── Podorganizace Euroinstitut (kraje + SPC) ─────────────────────────────────

export const SUB_ORG_CONFIG: Record<SubOrganization, {
  label:     string;   // zkratka
  fullLabel: string;   // plný název
  color:     string;   // barva v UI
  zakazka:   string;   // kód zakázky pro PDF formulář
}> = {
  PHA: { label: "PHA", fullLabel: "Praha",                         color: "#16a34a", zakazka: "NORMATIV PHA" },
  STC: { label: "STC", fullLabel: "Středočeský kraj",              color: "#c2410c", zakazka: "NORMATIV STC" },
  ULK: { label: "ULK", fullLabel: "Ústecký kraj",                  color: "#ca8a04", zakazka: "NORMATIV ULK" },
  OLK: { label: "OLK", fullLabel: "Olomoucký kraj",                color: "#dc2626", zakazka: "NORMATIV OLK" },
  KVK: { label: "KVK", fullLabel: "Karlovarský kraj",              color: "#2563eb", zakazka: "NORMATIV KVK" },
  SPC: { label: "SPC", fullLabel: "Speciálně pedagogické centrum", color: "#cbd5e1", zakazka: "NORMATIV SPC" },
};

// ─── Konfigurace organizací ───────────────────────────────────────────────────
// ⚠️  Uprav domény dle skutečnosti (část emailu za @)

export const ALLOWED_DOMAINS: Record<string, Organization> = {
  "euroinstitut.cz": "euroinstitut",
  "eduservis.cz":    "eduservis",    // ← uprav pokud jiná přípona
  "biotherapy.cz":   "biotherapy",   // ← uprav pokud jiná přípona
};

export const ORG_CONFIG: Record<Organization, {
  label:    string;
  color:    string;   // barva v UI
  fullName: string;   // oficiální název pro PDF formulář
  address:  string;
  city:     string;
  ic:       string;
  zakazka:  string;
}> = {
  euroinstitut: {
    label:    "Euroinstitut",
    color:    "#3b82f6",
    fullName: "Střední škola Euroinstitut v Olomouckém kraji",
    address:  "Havlíčkova 378",
    city:     "79827 Němčice nad Hanou",
    ic:       "04778847",
    zakazka:  "NORMATIV OLK",
  },
  eduservis: {
    label:    "Eduservis",
    color:    "#8b5cf6",
    fullName: "EDUSERVIS s.r.o.",
    address:  "Podnádražní 910/12",
    city:     "190 00 Praha 9 – Vysočany",
    ic:       "04628349",
    zakazka:  "NORMATIV EDUSERVIS",
  },
  biotherapy: {
    label:    "Biotherapy",
    color:    "#22c55e",
    fullName: "Biotherapy s.r.o.",
    address:  "Paříkova 354/5",
    city:     "190 00 Praha 9 – Vysočany",
    ic:       "26730227",
    zakazka:  "NORMATIV BIOTHERAPY",
  },
};

export interface GeoPoint {
  lat: number;
  lng: number;
}

// ─── Uživatel ────────────────────────────────────────────────────────────────

export interface UserDoc {
  email: string;
  displayName: string;
  photoURL: string | null;
  role: UserRole;
  organization: Organization;
  subOrganization: SubOrganization | null;  // jen pro Euroinstitut zaměstnance
  isActive: boolean;
  defaultVehicleId: string | null;
  workspaceDomainVerified: boolean;
  createdAt: Timestamp | null;
  /** Volitelné údaje pro tisk 1. strany vyúčtování (PDF) */
  homeAddress?: string | null;
  /** ISO datum RRRR-MM-DD */
  birthDate?: string | null;
  personalNumber?: string | null;
  phone?: string | null;
  /** 2. strana PDF – položka 6 */
  bankAccount?: string | null;
  /** 2. strana PDF – položka 7 (VS) */
  variableSymbol?: string | null;
  /** 2. strana PDF – položka 13 (název pojišťovny) */
  insuranceCompany?: string | null;
  /** 2. strana PDF – položka 9 (pořadové číslo CP v měsíci) */
  travelOrderInMonth?: string | null;
  /** 2. strana PDF – položka 11, ISO RRRR-MM-DD */
  payoutDueDate?: string | null;
}

// ─── Vozidlo ─────────────────────────────────────────────────────────────────

export interface Vehicle {
  id: string;
  userId: string;
  vehicleName: string;           // např. "Škoda Octavia Combi 1.6 TDI"
  plateNumber: string;           // SPZ
  engineVolumeCcm: number | null; // objem válců v cm³
  fuelType: FuelType;
  consumption1: number | null;   // spotřeba město (l/100km nebo kWh/100km)
  consumption2: number | null;   // spotřeba mimo město
  consumption3: number | null;   // spotřeba kombinovaná
  insurancePolicyNumber: string | null;
  insuranceValidUntil: string | null;  // ISO datum "2026-12-31"
  stkValidUntil: string | null;        // ISO datum
  kmRatePerKm: number;           // náhrada za 1 km (Kč) – automaticky nebo ruční
  isActive: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/** Hodnoty z defaultního vozidla pro 2. stranu vyúčtování (PDF) */
export interface VehicleExportSnapshot {
  vehicleLine: string;
  consumptionLine: string;
  fuelTypeLabel: string;
  fuelPriceLine: string;
  kmRateLine: string;
  insurancePolicyNumber: string;
  insuranceValidDisplay: string;
  stkValidDisplay: string;
}

// ─── Cesta ───────────────────────────────────────────────────────────────────

export interface Trip {
  id: string;
  userId: string;
  vehicleId: string | null;
  transportMode: TransportMode;
  purpose: string;               // účel cesty / místo jednání
  startTime: Timestamp | null;
  startTimeMs: number;
  endTime: Timestamp | null;
  startLocation: GeoPoint | null;
  endLocation: GeoPoint | null;
  distanceKm: number | null;
  distanceSource: DistanceSource;
  ticketPrice: number | null;    // cena jízdenky pro vlak/bus
  kmRatePerKm: number | null;    // sazba platná v době cesty (snapshot)
  kmCost: number | null;         // kilometrovné = distanceKm × kmRatePerKm
  perDiemHours: number | null;
  perDiemAmount: number | null;
  status: TripStatus;
  notes: string | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

// ─── Diety ───────────────────────────────────────────────────────────────────

export interface PerDiemTier {
  minHours: number;
  maxHours: number;
  amount: number;
}

// Sazby platné od 1. 1. 2025 (dle zákoníku práce)
export const DEFAULT_PER_DIEM_RATES: PerDiemTier[] = [
  { minHours: 5,  maxHours: 12,       amount: 148 },
  { minHours: 12, maxHours: 18,       amount: 225 },
  { minHours: 18, maxHours: Infinity, amount: 353 },
];

// Ceny PHM (Kč/litr nebo Kč/kWh) dle nastavení firmy
export const DEFAULT_FUEL_PRICES: Record<FuelType, number> = {
  petrol95: 35.80,
  petrol98: 40.50,
  diesel:   34.70,
  electric:  7.70,
  other:    35.80,
};

export const DEFAULT_KM_BASE_RATE = 5.00; // základní sazba Kč/km dle zákoníku práce 2025

// ─── Výsledek dokončené cesty ─────────────────────────────────────────────────

export interface TripSummary {
  distanceKm: number | null;
  kmCost: number | null;
  perDiemHours: number;
  perDiemAmount: number;
  transportMode: TransportMode;
  ticketPrice: number | null;
}
