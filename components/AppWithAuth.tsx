"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { UserRole } from "@/lib/types";
import LoginPage   from "@/components/LoginPage";
import Dashboard   from "@/components/Dashboard";
import AdminView   from "@/components/AdminView";

const ADMIN_ROLES: UserRole[] = ["manager", "hr", "accountant", "admin"];

type AppState =
  | { status: "unauthenticated" }
  | { status: "employee"; user: User }
  | { status: "admin";    user: User };

export default function AppWithAuth() {
  const [state, setState] = useState<AppState>({ status: "unauthenticated" });

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (cancelled) return;
        const role = (snap.data()?.role ?? "employee") as UserRole;
        if (ADMIN_ROLES.includes(role)) {
          setState({ status: "admin", user });
        } else {
          setState({ status: "employee", user });
        }
      } catch {
        if (!cancelled) setState({ status: "employee", user });
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (state.status === "unauthenticated") {
    return <LoginPage onLogin={(user) => setState({ status: "employee", user })} />;
  }
  if (state.status === "admin") {
    return <AdminView user={state.user} />;
  }
  return <Dashboard user={state.user} />;
}
