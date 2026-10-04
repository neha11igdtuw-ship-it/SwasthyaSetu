// Browser-side storage for "has this user finished the guided tour?".
// State is kept per authenticated user id AND per tour role, so completing
// one role's tour never affects another role or another account on the same
// browser. The id is the opaque account identifier — no names, phone numbers
// or health data go in the key.

import type { TourRole } from "./tourSteps";

const KEY_PREFIX = "guided-tour";
// Pre-role key (one flag per user). Still honoured on read so existing users
// who already finished the tour are not shown it again.
const LEGACY_KEY_PREFIX = "swasthyaSetuTourCompleted_";

export function tourStorageKey(userId: string, role: TourRole): string {
  return `${KEY_PREFIX}:${userId}:${role}`;
}

function legacyKey(userId: string): string {
  return `${LEGACY_KEY_PREFIX}${userId}`;
}

function getStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // storage blocked (private mode / policy)
  }
}

export function isTourCompleted(userId: string, role: TourRole): boolean {
  const storage = getStorage();
  if (!storage) return true; // cannot remember state, so never nag
  try {
    return (
      storage.getItem(tourStorageKey(userId, role)) === "true" ||
      storage.getItem(legacyKey(userId)) === "true"
    );
  } catch {
    return true;
  }
}

export function markTourCompleted(userId: string, role: TourRole): void {
  try {
    getStorage()?.setItem(tourStorageKey(userId, role), "true");
  } catch {
    // ignore: the tour just may show again next time
  }
}

/** Clears ONLY this user's flag for this role. Nothing else is touched. */
export function resetTourCompleted(userId: string, role: TourRole): void {
  try {
    const storage = getStorage();
    storage?.removeItem(tourStorageKey(userId, role));
    storage?.removeItem(legacyKey(userId));
  } catch {
    // ignore
  }
}
