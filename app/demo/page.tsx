"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import Dashboard from "@/components/Dashboard";
import AdminView from "@/components/AdminView";
import {
  DEMO_VEHICLE,
  DEMO_RECENT_TRIPS,
  DEMO_ACTIVE_TRIP,
  DEMO_TRIP_SUMMARY,
  DEMO_GROUPS,
} from "@/lib/demoData";
import type { DemoData } from "@/components/Dashboard";

const MOCK_USER: User = {
  uid: "demo-user",
  email: "jan.novak@euroinstitut.cz",
  displayName: "Jan Novák",
  photoURL: null,
} as User;

type ViewMode = "employee" | "admin";
type EmployeeScenario = "idle" | "traveling" | "completed" | "pre-depart" | "suborg" | "vehicle";

export default function DemoPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("employee");
  const [scenario, setScenario] = useState<EmployeeScenario>("idle");

  const getDemoData = (): DemoData => {
    switch (scenario) {
      case "traveling":
        return {
          organization: "euroinstitut",
          subOrganization: "OLK",
          vehicle: DEMO_VEHICLE,
          activeTrip: DEMO_ACTIVE_TRIP,
          recentTrips: DEMO_RECENT_TRIPS,
        };
      case "completed":
        return {
          organization: "euroinstitut",
          subOrganization: "OLK",
          vehicle: DEMO_VEHICLE,
          recentTrips: DEMO_RECENT_TRIPS,
          summary: DEMO_TRIP_SUMMARY,
        };
      case "suborg":
        return {
          organization: "euroinstitut",
          subOrganization: null,
          vehicle: null,
          recentTrips: [],
        };
      case "vehicle":
        return {
          organization: "euroinstitut",
          subOrganization: "OLK",
          vehicle: null,
          recentTrips: [],
        };
      case "pre-depart":
        return {
          organization: "euroinstitut",
          subOrganization: "OLK",
          vehicle: DEMO_VEHICLE,
          recentTrips: DEMO_RECENT_TRIPS,
          initialScreen: "pre-depart",
        };
      default:
        return {
          organization: "euroinstitut",
          subOrganization: "OLK",
          vehicle: DEMO_VEHICLE,
          recentTrips: DEMO_RECENT_TRIPS,
        };
    }
  };

  const handleEmployeeScenario = (s: EmployeeScenario) => {
    setViewMode("employee");
    setScenario(s);
  };

  return (
    <div style={styles.root}>
      {/* Ovládací panel */}
      <div style={styles.controls}>
        <a href="/" style={styles.backLink}>← Zpět na aplikaci</a>
        <h1 style={styles.title}>Demo – vizuální pohled aplikace</h1>
        <p style={styles.subtitle}>Fiktivní data · Všechny funkce</p>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Pohled zaměstnance</div>
          <div style={styles.btnRow}>
            {(["idle", "pre-depart", "traveling", "completed", "suborg", "vehicle"] as EmployeeScenario[]).map((s) => (
              <button
                key={s}
                style={{
                  ...styles.scenarioBtn,
                  ...(viewMode === "employee" && scenario === s ? styles.scenarioBtnActive : {}),
                }}
                onClick={() => handleEmployeeScenario(s)}
              >
                {SCENARIO_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Pohled správce / HR / účetní</div>
          <button
            style={{
              ...styles.scenarioBtn,
              ...(viewMode === "admin" ? styles.scenarioBtnActive : {}),
            }}
            onClick={() => setViewMode("admin")}
          >
            Přehled cest · Export PDF
          </button>
        </div>
      </div>

      {/* Náhled */}
      <div style={styles.preview}>
        {viewMode === "admin" ? (
          <AdminView
            user={MOCK_USER}
            demoData={{ groups: DEMO_GROUPS }}
            onSignOut={() => window.location.reload()}
          />
        ) : (
          <Dashboard
            key={scenario}
            user={MOCK_USER}
            demoData={getDemoData()}
            onSignOut={() => window.location.reload()}
          />
        )}
      </div>
    </div>
  );
}

const SCENARIO_LABELS: Record<EmployeeScenario, string> = {
  idle: "Připraven (Vyjíždím)",
  "pre-depart": "Nová cesta (formulář)",
  traveling: "Cesta probíhá",
  completed: "Souhrn cesty",
  suborg: "Výběr kraje",
  vehicle: "Nastavení vozidla",
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#0f172a",
  },
  controls: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "linear-gradient(180deg, #0f172a 0%, rgba(15,23,42,0.98) 100%)",
    padding: "16px 20px 20px",
    borderBottom: "1px solid rgba(148,163,184,0.2)",
  },
  backLink: {
    display: "inline-block",
    fontSize: 12,
    color: "#64748b",
    marginBottom: 10,
    textDecoration: "none",
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: "#f1f5f9",
    margin: "0 0 4px",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    margin: "0 0 20px",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#475569",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  btnRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  scenarioBtn: {
    padding: "8px 14px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.25)",
    background: "rgba(15,23,42,0.8)",
    color: "#94a3b8",
    fontSize: 12,
    cursor: "pointer",
  },
  scenarioBtnActive: {
    background: "#1d4ed8",
    borderColor: "#1d4ed8",
    color: "#fff",
    fontWeight: 600,
  },
  preview: {
    minHeight: "calc(100vh - 220px)",
  },
};
