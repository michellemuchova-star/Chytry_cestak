"use client";

/**
 * Logo firmy z `public/logo.png` (stejný soubor jako `logo.png` v kořeni projektu).
 */
export default function AppLogo({ size = 36 }: { size?: number }) {
  const borderW = size >= 48 ? 2.5 : 2;
  const pad = size >= 48 ? 3 : 2;
  return (
    <div
      style={{
        width: size,
        height: size,
        boxSizing: "border-box",
        background: "#fff",
        border: `${borderW}px solid #000`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        padding: pad,
      }}
    >
      <img
        src="/logo.png"
        alt="Euroinstitut"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center",
          display: "block",
        }}
      />
    </div>
  );
}
