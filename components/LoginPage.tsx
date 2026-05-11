"use client";

import { useState } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { auth, googleProvider, db } from "@/lib/firebase";
import { ALLOWED_DOMAINS, ORG_CONFIG, type Organization } from "@/lib/types";

async function ensureUserDocument(user: User, organization: Organization) {
  const ref = doc(db, "users", user.uid);
  await setDoc(
    ref,
    {
      email: user.email ?? "",
      displayName: user.displayName ?? "",
      photoURL: user.photoURL ?? null,
      role: "employee",
      organization,
      subOrganization: null,   // Euroinstitut uživatelé si zvolí kraj při prvním spuštění
      isActive: true,
      defaultVehicleId: null,
      workspaceDomainVerified: true,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

interface Props {
  onLogin: (user: User) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const domain = (user.email ?? "").split("@")[1] ?? "";
      const organization = ALLOWED_DOMAINS[domain];

      if (!organization) {
        const allowed = Object.keys(ALLOWED_DOMAINS).map(d => `@${d}`).join(", ");
        setError(`Přihlášení je povoleno pouze pro firemní účty (${allowed}).`);
        await signOut(auth);
        setLoading(false);
        return;
      }

      await ensureUserDocument(user, organization);
      onLogin(user);
    } catch (err) {
      console.error(err);
      setError("Přihlášení se nezdařilo. Zkuste to prosím znovu.");
      setLoading(false);
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logo}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"
                fill="currentColor"
              />
            </svg>
          </div>
          <h1 style={styles.title}>Chytrý Cesťák</h1>
          <p style={styles.subtitle}>
            Automatizovaná evidence cestovních příkazů
          </p>
        </div>

        {/* Divider */}
        <div style={styles.divider} />

        {/* Přihlásit se */}
        <button
          onClick={handleSignIn}
          disabled={loading}
          style={{
            ...styles.googleBtn,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "default" : "pointer",
          }}
        >
          {/* Google logo */}
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path
              fill="#4285F4"
              d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
            />
            <path
              fill="#34A853"
              d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
            />
            <path
              fill="#FBBC05"
              d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
            />
            <path
              fill="#EA4335"
              d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
            />
          </svg>
          {loading ? "Přihlašuji…" : "Přihlásit se přes firemní Google účet"}
        </button>

        {error && <p style={styles.error}>{error}</p>}

        <p style={styles.hint}>
          Přístup je omezen na účty Google Workspace vaší společnosti.
        </p>
        <a href="/demo" style={styles.previewLink}>
          Demo – vizuální pohled s fiktivními daty →
        </a>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    background: "radial-gradient(ellipse at top, #0f172a 0%, #020617 70%)",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#0d1426",
    borderRadius: 20,
    padding: "36px 28px",
    border: "1px solid rgba(148,163,184,0.15)",
    boxShadow:
      "0 0 0 1px rgba(56,189,248,0.05), 0 24px 60px rgba(0,0,0,0.7)",
  },
  logoWrap: {
    textAlign: "center",
    marginBottom: 24,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 18,
    margin: "0 auto 14px",
    background: "linear-gradient(135deg, #38bdf8 0%, #22c55e 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#020617",
    boxShadow: "0 4px 20px rgba(56,189,248,0.4)",
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    margin: "0 0 6px",
    color: "#f1f5f9",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    margin: 0,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(148,163,184,0.1)",
    marginBottom: 24,
  },
  googleBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "11px 16px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.25)",
    backgroundColor: "#1e293b",
    color: "#f1f5f9",
    fontWeight: 500,
    fontSize: 15,
    transition: "background 0.15s",
  },
  error: {
    marginTop: 14,
    fontSize: 13,
    color: "#fca5a5",
    textAlign: "center",
    padding: "8px 12px",
    borderRadius: 8,
    backgroundColor: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.2)",
  },
  hint: {
    marginTop: 20,
    fontSize: 12,
    color: "#475569",
    textAlign: "center",
  },
  previewLink: {
    display: "block",
    marginTop: 16,
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    textDecoration: "none",
  },
};
