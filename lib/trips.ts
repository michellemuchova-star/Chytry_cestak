import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import { DEFAULT_PER_DIEM_RATES } from "./types";
import type { GeoPoint, TransportMode, Trip, TripSummary } from "./types";

// ─── Diety ────────────────────────────────────────────────────────────────────

export function calculatePerDiem(hours: number): number {
  for (const tier of [...DEFAULT_PER_DIEM_RATES].reverse()) {
    if (hours >= tier.minHours) return tier.amount;
  }
  return 0;
}

// ─── Vzdálenost přes OSRM (zdarma, bez API klíče) ────────────────────────────

export async function fetchRouteDistanceKm(
  start: GeoPoint,
  end: GeoPoint
): Promise<number | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=false`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      routes?: { distance: number }[];
      code?: string;
    };
    if (data.code !== "Ok" || !data.routes?.length) return null;
    return Math.round((data.routes[0].distance / 1000) * 10) / 10;
  } catch {
    return null;
  }
}

// ─── Geolocation helper ────────────────────────────────────────────────────────

export function getCurrentPosition(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Prohlížeč nepodporuje GPS."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error("GPS přístup byl zamítnut. Povol polohu v prohlížeči."));
        } else {
          reject(new Error("Nepodařilo se získat polohu. Zkus to znovu."));
        }
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    );
  });
}

// ─── Firestore ────────────────────────────────────────────────────────────────

export async function startTrip(
  userId: string,
  startLocation: GeoPoint,
  purpose: string,
  transportMode: TransportMode,
  vehicleId: string | null = null,
  kmRatePerKm: number | null = null
): Promise<string> {
  const ref = await addDoc(collection(db, "trips"), {
    userId,
    vehicleId,
    transportMode,
    purpose,
    startTime: serverTimestamp(),
    startTimeMs: Date.now(),
    endTime: null,
    startLocation,
    endLocation: null,
    distanceKm: null,
    distanceSource: "gps_route",
    ticketPrice: null,
    kmRatePerKm,
    kmCost: null,
    perDiemHours: null,
    perDiemAmount: null,
    status: "active",
    notes: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function endTrip(
  activeTrip: Trip,
  endLocation: GeoPoint
): Promise<TripSummary> {
  const now = Date.now();
  const startMs = activeTrip.startTimeMs ?? now;
  const hours = Math.round(((now - startMs) / 1000 / 3600) * 10) / 10;
  const perDiemAmount = calculatePerDiem(hours);

  let distanceKm: number | null = null;
  let kmCost: number | null = null;

  if (activeTrip.transportMode === "car" && activeTrip.startLocation) {
    distanceKm = await fetchRouteDistanceKm(activeTrip.startLocation, endLocation);
    if (distanceKm !== null && activeTrip.kmRatePerKm) {
      kmCost = Math.round(distanceKm * activeTrip.kmRatePerKm * 100) / 100;
    }
  }

  await updateDoc(doc(db, "trips", activeTrip.id), {
    endTime: serverTimestamp(),
    endLocation,
    distanceKm,
    kmCost,
    perDiemHours: hours,
    perDiemAmount,
    status: "draft",
    updatedAt: serverTimestamp(),
  });

  return {
    distanceKm,
    kmCost,
    perDiemHours: hours,
    perDiemAmount,
    transportMode: activeTrip.transportMode,
    ticketPrice: activeTrip.ticketPrice,
  };
}

export async function recordTicketTrip(
  userId: string,
  purpose: string,
  transportMode: "train" | "bus",
  ticketPrice: number,
  startTimeMs: number
): Promise<TripSummary> {
  const now = Date.now();
  const hours = Math.round(((now - startTimeMs) / 1000 / 3600) * 10) / 10;
  const perDiemAmount = calculatePerDiem(hours);

  await addDoc(collection(db, "trips"), {
    userId,
    vehicleId: null,
    transportMode,
    purpose,
    startTime: serverTimestamp(),
    startTimeMs,
    endTime: serverTimestamp(),
    startLocation: null,
    endLocation: null,
    distanceKm: null,
    distanceSource: "ticket",
    ticketPrice,
    kmRatePerKm: null,
    kmCost: null,
    perDiemHours: hours,
    perDiemAmount,
    status: "draft",
    notes: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    distanceKm: null,
    kmCost: null,
    perDiemHours: hours,
    perDiemAmount,
    transportMode,
    ticketPrice,
  };
}

export async function getActiveTrip(userId: string): Promise<Trip | null> {
  const q = query(
    collection(db, "trips"),
    where("userId", "==", userId),
    where("status", "==", "active"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<Trip, "id">) };
}

export async function getRecentTrips(userId: string, count = 10): Promise<Trip[]> {
  const q = query(
    collection(db, "trips"),
    where("userId", "==", userId),
    where("status", "!=", "active"),
    orderBy("status"),
    orderBy("createdAt", "desc"),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Trip, "id">) }));
}

// ─── Formátovací helpery ──────────────────────────────────────────────────────

export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${m} min`;
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString("cs-CZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " Kč";
}
