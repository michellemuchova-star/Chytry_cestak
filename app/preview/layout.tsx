/** Bez statického prerenderu — Firebase se inicializuje až v prohlížeči (build na Vercelu bez .env). */
export const dynamic = "force-dynamic";

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
