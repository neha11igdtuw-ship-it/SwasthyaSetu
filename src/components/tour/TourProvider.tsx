"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { UserOut } from "@/lib/api/types";
import { findTourTarget } from "@/lib/tour/tourDom";
import { isTourCompleted, markTourCompleted, resetTourCompleted } from "@/lib/tour/tourStorage";
import {
  TOUR_DASHBOARD_PATH,
  TOUR_READY_TARGET,
  getTourSteps,
  tourRoleForUserRole,
  type TourStepDef,
} from "@/lib/tour/tourSteps";
import { GuidedTour } from "./GuidedTour";
import { TourWelcome } from "./TourWelcome";

type Phase = "idle" | "waiting" | "welcome" | "steps";

interface TourContextValue {
  /** True when the signed-in user's role has a guided tour. */
  available: boolean;
  /** Clears this user's completion flag and starts their role's tour. */
  restart: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

/** Null outside the app shell (landing, login, ...), where there is no tour. */
export function useTour(): TourContextValue | null {
  return useContext(TourContext);
}

const POLL_MS = 400;
const POLL_LIMIT_MS = 5 * 60 * 1000; // stop looking after 5 minutes

export function TourProvider({ user, children }: { user: UserOut | null; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const [steps, setSteps] = useState<TourStepDef[]>([]);
  const skipWelcomeRef = useRef(false);
  const autoChecked = useRef<string | null>(null);

  const userId = user?.id ?? null;
  const tourRole = tourRoleForUserRole(user?.role);

  // First-visit detection: once per signed-in account, show the tour if that
  // account has never completed or skipped it in this browser.
  useEffect(() => {
    if (!userId || !tourRole) {
      autoChecked.current = null;
      setPhase("idle");
      return;
    }
    const checkKey = `${userId}:${tourRole}`;
    if (autoChecked.current === checkKey) return;
    autoChecked.current = checkKey;
    if (isTourCompleted(userId, tourRole)) {
      setPhase("idle");
      return;
    }
    skipWelcomeRef.current = false;
    setPhase("waiting");
  }, [userId, tourRole]);

  // Wait until the real dashboard is on screen (after login, onboarding and
  // data loading) before showing anything.
  useEffect(() => {
    if (phase !== "waiting" || !tourRole) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (findTourTarget(TOUR_READY_TARGET)) {
        window.clearInterval(timer);
        if (skipWelcomeRef.current) {
          const available = getTourSteps(tourRole).filter((s) => findTourTarget(s.target));
          if (available.length > 0) {
            setSteps(available);
            setPhase("steps");
          } else {
            setPhase("idle");
          }
        } else {
          setPhase("welcome");
        }
      } else if (Date.now() - startedAt > POLL_LIMIT_MS) {
        window.clearInterval(timer);
        setPhase("idle");
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [phase, tourRole, pathname]);

  const close = useCallback(
    (markDone: boolean) => {
      if (markDone && userId && tourRole) markTourCompleted(userId, tourRole);
      setPhase("idle");
      setSteps([]);
    },
    [userId, tourRole]
  );

  const handleStart = useCallback(() => {
    if (!tourRole) return close(false);
    // Only steps whose element exists on screen for THIS user are included.
    const available = getTourSteps(tourRole).filter((s) => findTourTarget(s.target));
    if (available.length === 0) return close(true);
    setSteps(available);
    setPhase("steps");
  }, [tourRole, close]);

  const handleFinish = useCallback(() => close(true), [close]);
  const handleSkip = useCallback(() => close(true), [close]);
  const handleAbort = useCallback(() => close(false), [close]);

  const restart = useCallback(() => {
    if (!userId || !tourRole) return;
    resetTourCompleted(userId, tourRole); // only this role's tour flag — nothing else
    skipWelcomeRef.current = true;
    const dashboard = TOUR_DASHBOARD_PATH[tourRole];
    if (pathname !== dashboard) router.push(dashboard);
    setSteps([]);
    setPhase("waiting");
  }, [userId, tourRole, pathname, router]);

  const value = useMemo<TourContextValue>(
    () => ({ available: Boolean(userId && tourRole), restart }),
    [userId, tourRole, restart]
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {phase === "welcome" && <TourWelcome onStart={handleStart} onSkip={handleSkip} />}
      {phase === "steps" && steps.length > 0 && (
        <GuidedTour steps={steps} onFinish={handleFinish} onSkip={handleSkip} onAbort={handleAbort} />
      )}
    </TourContext.Provider>
  );
}
