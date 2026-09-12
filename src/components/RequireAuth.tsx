"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAuthenticated, getCurrentUserRole, AUTH_CHANGED_EVENT } from "@/lib/api/client";
import type { Role } from "@/lib/api/types";
import { dashboardPathForJwtRole } from "@/lib/search/searchService";

const ROLE_PREFIX: Record<string, Role[]> = {
  "/patient": ["PATIENT"],
  "/hw": ["HEALTH_WORKER", "ADMIN"],
  "/doctor": ["DOCTOR", "ADMIN"],
  "/facility": ["FACILITY_ADMIN", "FACILITY_STAFF", "ADMIN"],
};

function allowedRolesForPath(pathname: string): Role[] | null {
  for (const [prefix, roles] of Object.entries(ROLE_PREFIX)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return roles;
    }
  }
  return null;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const guard = () => {
      if (!isAuthenticated()) {
        setReady(false);
        const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
        router.replace(`/login${next}`);
        return;
      }

      const role = getCurrentUserRole();
      const allowed = allowedRolesForPath(pathname);
      if (allowed && role && !allowed.includes(role as Role)) {
        setReady(false);
        router.replace(dashboardPathForJwtRole(role) || "/login");
        return;
      }

      setReady(true);
    };

    guard();
    window.addEventListener(AUTH_CHANGED_EVENT, guard);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, guard);
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        Checking session…
      </div>
    );
  }

  return <>{children}</>;
}
