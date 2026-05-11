import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chytrý Cesťák",
  description: "Automatizovaná evidence cestovních příkazů"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

