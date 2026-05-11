"use client";

import dynamic from "next/dynamic";
import LoginFallback from "@/components/LoginFallback";

const AppWithAuth = dynamic(() => import("@/components/AppWithAuth"), {
  ssr: false,
  loading: () => <LoginFallback />,
});

export default function Page() {
  return <AppWithAuth />;
}
