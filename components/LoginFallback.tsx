"use client";

/**
 * Přihlašovací obrazovka bez Firebase – zobrazí se ihned,
 * zatímco se načítá AppWithAuth (Firebase).
 */
export default function LoginFallback() {
  return (
    <div style={styles.root}>
      <div style={styles.card}>
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
          <p style={styles.subtitle}>Automatizovaná evidence cestovních příkazů</p>
        </div>
        <div style={styles.divider} />
        <div style={styles.loading}>
          <p style={styles.loadingText}>Připravujeme přihlášení…</p>
        </div>
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
    boxShadow: "0 0 0 1px rgba(56,189,248,0.05), 0 24px 60px rgba(0,0,0,0.7)",
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
  loading: {
    textAlign: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#64748b",
    margin: 0,
  },
};
