import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  DEFAULT_FUEL_PRICES,
  DEFAULT_KM_BASE_RATE,
  type Vehicle,
  type FuelType,
  type VehicleExportSnapshot,
} from "./types";

// ─── Výpočet náhrady za 1 km ──────────────────────────────────────────────────
// Vzorec dle zákoníku práce: základní sazba + průměrná spotřeba × cena PHM / 100

export function calculateKmRate(
  consumption: number | null,   // průměrná spotřeba l/100km (nebo kWh/100km)
  fuelType: FuelType
): number {
  if (!consumption || consumption <= 0) return DEFAULT_KM_BASE_RATE;
  const fuelPrice = DEFAULT_FUEL_PRICES[fuelType];
  const fuelCostPerKm = (consumption * fuelPrice) / 100;
  return Math.round((DEFAULT_KM_BASE_RATE + fuelCostPerKm) * 100) / 100;
}

// Průměrná spotřeba ze tří hodnot z TP (ignoruje null)
export function averageConsumption(
  v1: number | null,
  v2: number | null,
  v3: number | null
): number | null {
  const vals = [v1, v2, v3].filter((v): v is number => v !== null && v > 0);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// ─── Firestore ────────────────────────────────────────────────────────────────

export async function saveVehicle(
  userId: string,
  data: Omit<Vehicle, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<string> {
  const avg = averageConsumption(data.consumption1, data.consumption2, data.consumption3);
  const kmRate = calculateKmRate(avg, data.fuelType);

  const payload = {
    ...data,
    userId,
    kmRatePerKm: kmRate,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, "vehicles"), payload);
  return ref.id;
}

export async function updateVehicle(
  vehicleId: string,
  data: Partial<Omit<Vehicle, "id" | "userId" | "createdAt">>
): Promise<void> {
  const avg = data.consumption1 !== undefined
    ? averageConsumption(
        data.consumption1 ?? null,
        data.consumption2 ?? null,
        data.consumption3 ?? null
      )
    : null;

  const kmRate = avg !== null && data.fuelType
    ? calculateKmRate(avg, data.fuelType)
    : undefined;

  await updateDoc(doc(db, "vehicles", vehicleId), {
    ...data,
    ...(kmRate !== undefined ? { kmRatePerKm: kmRate } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function getUserVehicles(userId: string): Promise<Vehicle[]> {
  const q = query(
    collection(db, "vehicles"),
    where("userId", "==", userId),
    where("isActive", "==", true),
    limit(10)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Vehicle, "id">) }));
}

export async function getDefaultVehicle(userId: string): Promise<Vehicle | null> {
  const vehicles = await getUserVehicles(userId);
  return vehicles[0] ?? null;
}

// ─── Pomocné funkce ───────────────────────────────────────────────────────────

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  petrol95: "Natural 95",
  petrol98: "Natural 98",
  diesel:   "Nafta",
  electric: "Elektřina",
  other:    "Jiné",
};

export function formatPlate(raw: string): string {
  // "1AB2345" → "1AB 2345"
  return raw.replace(/([A-Z0-9]{3})([A-Z0-9]{4})/, "$1 $2").toUpperCase();
}

function fmtIsoToCs(iso: string | null | undefined): string {
  const raw = (iso ?? "").trim();
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Data pro 2. stranu PDF vyúčtování (položky 1–5, 14–16 šablony) */
export function buildVehicleExportSnapshot(v: Vehicle | null): VehicleExportSnapshot | null {
  if (!v) return null;
  const avg = averageConsumption(v.consumption1, v.consumption2, v.consumption3);
  const vol = v.engineVolumeCcm != null ? `${v.engineVolumeCcm} cm³` : "—";
  const vehicleLine = `${v.vehicleName}, ${vol}, ${formatPlate(v.plateNumber)}`;
  const consumptionLine =
    avg != null ? `${avg.toLocaleString("cs-CZ", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} l/100 km (resp. kWh/100 km)` : "—";
  const fuelPrice = DEFAULT_FUEL_PRICES[v.fuelType];
  return {
    vehicleLine,
    consumptionLine,
    fuelTypeLabel: FUEL_TYPE_LABELS[v.fuelType],
    fuelPriceLine: `${fuelPrice.toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`,
    kmRateLine: `${v.kmRatePerKm.toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`,
    insurancePolicyNumber: (v.insurancePolicyNumber ?? "").trim(),
    insuranceValidDisplay: fmtIsoToCs(v.insuranceValidUntil),
    stkValidDisplay: fmtIsoToCs(v.stkValidUntil),
  };
}

export function expiryColor(isoDate: string | null): string {
  if (!isoDate) return "#475569";
  const ms = new Date(isoDate).getTime() - Date.now();
  const days = ms / 86_400_000;
  if (days < 0)   return "#f87171"; // červená – expirováno
  if (days < 60)  return "#fbbf24"; // žlutá – do 60 dnů
  return "#4ade80";                  // zelená – v pořádku
}
