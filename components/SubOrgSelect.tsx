"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SUB_ORG_CONFIG, type SubOrganization } from "@/lib/types";
import AppLogo from "./AppLogo";

interface Props {
  user: User;
  onSelect: (subOrg: SubOrganization) => void;
  demoMode?: boolean;
}

export default function SubOrgSelect({ user, onSelect, demoMode }: Props) {
  const [selected, setSelected]   = useState<SubOrganization | null>(null);
  const [saving,   setSaving]     = useState(false);

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      if (demoMode) {
        onSelect(selected);
      } else {
        await updateDoc(doc(db, "users", user.uid), { subOrganization: selected });
        onSelect(selected);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={s.root}>
      <div style={s.container}>

        {/* Logo + nadpis */}
        <div style={s.logoWrap}>
          <AppLogo size={52} />
          <h1 style={s.title}>Kde pracuješ?</h1>
          <p style={s.sub}>
            Vyber svůj kraj nebo pracoviště.<br/>
            Toto nastavení stačí udělat jednou.
          </p>
        </div>

        {/* Mřížka krajů */}
        <div style={s.grid}>
          {(Object.entries(SUB_ORG_CONFIG) as [SubOrganization, typeof SUB_ORG_CONFIG[SubOrganization]][]).map(
            ([key, cfg]) => {
              const isSelected = selected === key;
              const isSPC      = key === "SPC";
              return (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  style={{
                    ...s.tile,
                    borderColor:     isSelected ? cfg.color : "rgba(148,163,184,0.12)",
                    backgroundColor: isSelected ? `${cfg.color}18` : "#0d1426",
                    boxShadow:       isSelected ? `0 0 0 1px ${cfg.color}` : "none",
                  }}
                >
                  {/* Barevný pruh nahoře */}
                  <div style={{
                    width: "100%", height: 4, borderRadius: "4px 4px 0 0",
                    background: cfg.color,
                    marginBottom: 12,
                  }} />

                  <div style={{
                    fontSize: 22, fontWeight: 800, letterSpacing: "0.04em",
                    color: isSelected ? cfg.color : (isSPC ? "#94a3b8" : "#f1f5f9"),
                    marginBottom: 4,
                  }}>
                    {cfg.label}
                  </div>

                  <div style={{
                    fontSize: 11, color: isSelected ? cfg.color : "#475569",
                    lineHeight: 1.3, textAlign: "center",
                  }}>
                    {cfg.fullLabel}
                  </div>

                  {isSelected && (
                    <div style={{
                      position: "absolute", top: 10, right: 10,
                      width: 18, height: 18, borderRadius: "50%",
                      background: cfg.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, color: "#fff", fontWeight: 700,
                    }}>✓</div>
                  )}
                </button>
              );
            }
          )}
        </div>

        {/* Potvrzení */}
        <button
          onClick={handleConfirm}
          disabled={!selected || saving}
          style={{
            ...s.confirmBtn,
            opacity:          !selected || saving ? 0.4 : 1,
            cursor:           !selected || saving ? "default" : "pointer",
            background:       selected
              ? `linear-gradient(135deg, ${SUB_ORG_CONFIG[selected].color}, ${SUB_ORG_CONFIG[selected].color}cc)`
              : "linear-gradient(135deg, #1d4ed8, #1e40af)",
            color:            selected === "SPC" ? "#0f172a" : "#fff",
          }}
        >
          {saving
            ? "Ukládám…"
            : selected
              ? `Pokračovat jako ${SUB_ORG_CONFIG[selected].label}`
              : "Vyber pracoviště"}
        </button>

      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at top, #0f172a 0%, #020617 70%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "24px 16px",
    color: "#f1f5f9",
  },
  container: {
    width: "100%", maxWidth: 480,
    display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
  },
  logoWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    marginBottom: 28,
    gap: 14,
  },
  title: { fontSize: 22, fontWeight: 700, margin: "0 0 6px", color: "#f1f5f9" },
  sub:   { fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.5 },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    width: "100%",
    marginBottom: 20,
  },
  tile: {
    position: "relative",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "flex-start",
    padding: "0 12px 14px",
    borderRadius: 14,
    border: "1px solid",
    cursor: "pointer",
    transition: "border-color 0.15s, background-color 0.15s, box-shadow 0.15s",
    overflow: "hidden",
  },
  confirmBtn: {
    width: "100%", padding: "14px",
    borderRadius: 999, border: "none",
    fontSize: 15, fontWeight: 700,
    transition: "opacity 0.15s",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
  },
};
