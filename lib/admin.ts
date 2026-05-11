import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Trip, UserDoc, Organization, SubOrganization, VehicleExportSnapshot } from "./types";
import { ALLOWED_DOMAINS } from "./types";
import { getDefaultVehicle, buildVehicleExportSnapshot } from "./vehicles";

function resolveOrganization(user: UserDoc | undefined): Organization {
  if (user?.organization) return user.organization;
  const dom = (user?.email ?? "").split("@")[1]?.toLowerCase() ?? "";
  if (dom && ALLOWED_DOMAINS[dom]) return ALLOWED_DOMAINS[dom];
  return "euroinstitut";
}

// ─── Načtení cest za daný měsíc (všichni zaměstnanci) ────────────────────────

export async function getAllTripsByMonth(
  year: number,
  month: number          // 1–12
): Promise<Trip[]> {
  const start = new Date(year, month - 1, 1).getTime();
  const end   = new Date(year, month, 0, 23, 59, 59, 999).getTime();

  const q = query(
    collection(db, "trips"),
    where("startTimeMs", ">=", start),
    where("startTimeMs", "<=", end),
    orderBy("startTimeMs", "asc")
  );

  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...(d.data() as Omit<Trip, "id">) }))
    .filter(t => t.status !== "active");
}

// ─── Načtení profilu uživatele ────────────────────────────────────────────────

export async function getUserDoc(uid: string): Promise<(UserDoc & { uid: string }) | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { uid, ...(snap.data() as UserDoc) };
}

// ─── Načtení všech aktivních zaměstnanců ─────────────────────────────────────

export async function getAllUsers(): Promise<(UserDoc & { uid: string })[]> {
  const q = query(
    collection(db, "users"),
    where("isActive", "==", true)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...(d.data() as UserDoc) }));
}

// ─── Označit cestu jako zpracovanou ──────────────────────────────────────────

export async function markTripProcessed(tripId: string): Promise<void> {
  await updateDoc(doc(db, "trips", tripId), { status: "approved" });
}

// ─── Seskupit cesty podle zaměstnance ────────────────────────────────────────

export interface EmployeeGroup {
  uid: string;
  displayName: string;
  email: string;
  organization: Organization;
  subOrganization: SubOrganization | null;
  trips: Trip[];
  totalKm: number;
  totalKmCost: number;
  totalPerDiem: number;
  totalTickets: number;
  totalAll: number;
  /** Z profilu uživatele (Firestore users) – pro PDF */
  homeAddress?: string | null;
  birthDate?: string | null;
  personalNumber?: string | null;
  phone?: string | null;
  bankAccount?: string | null;
  variableSymbol?: string | null;
  insuranceCompany?: string | null;
  travelOrderInMonth?: string | null;
  payoutDueDate?: string | null;
  /** Defaultní vozidlo – 2. strana PDF */
  exportVehicle?: VehicleExportSnapshot | null;
}

export function groupTripsByEmployee(
  trips: Trip[],
  users: (UserDoc & { uid: string })[],
  filterOrg?:    Organization    | null,
  filterSubOrg?: SubOrganization | null
): EmployeeGroup[] {
  const userMap = new Map(users.map(u => [u.uid, u]));
  const groups  = new Map<string, Trip[]>();

  for (const trip of trips) {
    const user = userMap.get(trip.userId);
    if (filterOrg    && resolveOrganization(user) !== filterOrg)    continue;
    if (filterSubOrg && user?.subOrganization !== filterSubOrg) continue;
    const arr = groups.get(trip.userId) ?? [];
    arr.push(trip);
    groups.set(trip.userId, arr);
  }

  return Array.from(groups.entries())
    .map(([uid, userTrips]) => {
      const user         = userMap.get(uid);
      const totalKm      = userTrips.reduce((s, t) => s + (t.distanceKm    ?? 0), 0);
      const totalKmCost  = userTrips.reduce((s, t) => s + (t.kmCost        ?? 0), 0);
      const totalPerDiem = userTrips.reduce((s, t) => s + (t.perDiemAmount ?? 0), 0);
      const totalTickets = userTrips.reduce((s, t) => s + (t.ticketPrice   ?? 0), 0);
      return {
        uid,
        displayName:     user?.displayName     ?? uid,
        email:           user?.email           ?? "",
        organization:    resolveOrganization(user),
        subOrganization: user?.subOrganization ?? null,
        trips:           userTrips,
        totalKm:         Math.round(totalKm * 10) / 10,
        totalKmCost:     Math.round(totalKmCost),
        totalPerDiem,
        totalTickets,
        totalAll: Math.round(totalKmCost + totalPerDiem + totalTickets),
        homeAddress:     user?.homeAddress?.trim()     || null,
        birthDate:       user?.birthDate?.trim()       || null,
        personalNumber:  user?.personalNumber?.trim()  || null,
        phone:           user?.phone?.trim()           || null,
        bankAccount:         user?.bankAccount?.trim()         || null,
        variableSymbol:      user?.variableSymbol?.trim()      || null,
        insuranceCompany:    user?.insuranceCompany?.trim()    || null,
        travelOrderInMonth:  user?.travelOrderInMonth?.trim()  || null,
        payoutDueDate:       user?.payoutDueDate?.trim()       || null,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "cs"));
}

/** Doplní skupiny o údaje z defaultního vozidla (2. strana vyúčtování). */
export async function enrichEmployeeGroupsWithVehicles(groups: EmployeeGroup[]): Promise<EmployeeGroup[]> {
  return Promise.all(
    groups.map(async (g) => {
      const v = await getDefaultVehicle(g.uid);
      return { ...g, exportVehicle: buildVehicleExportSnapshot(v) };
    })
  );
}

// ─── Pomocné ─────────────────────────────────────────────────────────────────

export const CZECH_MONTHS = [
  "Leden","Únor","Březen","Duben","Květen","Červen",
  "Červenec","Srpen","Září","Říjen","Listopad","Prosinec",
];

export function getLastMonths(count = 6): { year: number; month: number; label: string }[] {
  const result = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      year:  d.getFullYear(),
      month: d.getMonth() + 1,
      label: `${CZECH_MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    });
  }
  return result;
}
