// Browser-side storage for "has this user finished the guided tour?".
// The flag is stored per authenticated user id so one account's completion
// never affects another account on the same browser. The id is the opaque
// account identifier — no names, phone numbers or health data go in the key.

const KEY_PREFIX = "swasthyaSetuTourCompleted_";

export function tourStorageKey(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

function getStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // storage blocked (private mode / policy)
  }
}

export function isTourCompleted(userId: string): boolean {
  const storage = getStorage();
  if (!storage) return true; // cannot remember state, so never nag
  try {
    return storage.getItem(tourStorageKey(userId)) === "true";
  } catch {
    return true;
  }
}

export function markTourCompleted(userId: string): void {
  try {
    getStorage()?.setItem(tourStorageKey(userId), "true");
  } catch {
    // ignore: the tour just may show again next time
  }
}

/** Clears ONLY this user's tour flag. Nothing else is touched. */
export function resetTourCompleted(userId: string): void {
  try {
    getStorage()?.removeItem(tourStorageKey(userId));
  } catch {
    // ignore
  }
}
