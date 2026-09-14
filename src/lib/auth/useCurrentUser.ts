"use client";

import { useEffect, useState } from "react";
import { authApi } from "@/lib/api/client";
import type { UserOut } from "@/lib/api/types";

export function useCurrentUser() {
  const [user, setUser] = useState<UserOut | null>(null);

  useEffect(() => {
    let cancelled = false;
    authApi
      .me()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return user;
}
