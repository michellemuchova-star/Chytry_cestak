"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import Dashboard from "@/components/Dashboard";
import AdminView from "@/components/AdminView";
import type { UserRole } from "@/lib/types";

// Mock uživatel pro náhled (bez Firebase Auth)
const MOCK_USERS: Record<UserRole, User> = {
  employee: {
    uid: "preview-employee",
    email: "zamestnanec@euroinstitut.cz",
    displayName: "Jan Novák",
    photoURL: null,
  } as User,
  manager: {
    uid: "preview-manager",
    email: "vedouci@euroinstitut.cz",
    displayName: "Marie Vedoucí",
    photoURL: null,
  } as User,
  hr: {
    uid: "preview-hr",
    email: "hr@euroinstitut.cz",
    displayName: "Petra HR",
    photoURL: null,
  } as User,
  accountant: {
    uid: "preview-accountant",
    email: "ucetni@euroinstitut.cz",
    displayName: "Eva Účetní",
    photoURL: null,
  } as User,
  admin: {
    uid: "preview-admin",
    email: "admin@euroinstitut.cz",
    displayName: "Admin Systém",
    photoURL: null,
  } as User,
};

const ROLE_LABELS: Record<UserRole, string> = {
  employee:   "Zaměstnanec",
  manager:    "Správce / Vedoucí",
  hr:         "HR",
  accountant: "Účetní",
  admin:      "Administrátor",
};

export default function PreviewPage() {
  const [role, setRole] = useState<UserRole>("employee");

  const user = MOCK_USERS[role];
  const isAdminRole = ["manager", "hr", "accountant", "admin"].includes(role);

  return (
    <div style={styles.root}>
      {/* Přepínač rolí */}
      <div style={styles.switcher}>
        <a href="/" style={styles.backLink}>← Zpět na aplikaci</a>
        <h2 style={styles.title}>Náhled pohledů podle role</h2>
        <div style={styles.roleRow}>
          {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
            <button
              key={r}
              style={{
                ...styles.roleBtn,
                ...(role === r ? styles.roleBtnActive : {}),
              }}
              onClick={() => setRole(r)}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
        <p style={styles.hint}>
          {isAdminRole
            ? "Správce, HR, Účetní a Admin vidí stejný přehled cest."
            : "Zaměstnanec vidí evidenci vlastních cest a vozidla."}
        </p>
      </div>

      {/* Náhled pohledu */}
      <div style={styles.preview}>
        {isAdminRole ? (
          <AdminView user={user} />
        ) : (
          <Dashboard user={user} />
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "#0f172a",
  },
  switcher: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "linear-gradient(180deg, #0f172a 0%, rgba(15,23,42,0.95) 100%)",
    padding: "12px 16px 16px",
    borderBottom: "1px solid rgba(148,163,184,0.15)",
  },
  backLink: {
    display: "inline-block",
    fontSize: 12,
    color: "#64748b",
    marginBottom: 8,
    textDecoration: "none",
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: "#94a3b8",
    margin: "0 0 12px",
  },
  roleRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  roleBtn: {
    padding: "6px 12px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.2)",
    background: "transparent",
    color: "#94a3b8",
    fontSize: 12,
    cursor: "pointer",
  },
  roleBtnActive: {
    background: "#1d4ed8",
    borderColor: "#1d4ed8",
    color: "#fff",
    fontWeight: 600,
  },
  hint: {
    fontSize: 11,
    color: "#64748b",
    margin: 0,
  },
  preview: {
    minHeight: "calc(100vh - 140px)",
  },
};
