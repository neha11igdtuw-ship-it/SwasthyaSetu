// Helpers for locating tour targets in the live DOM.

export interface TourRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function isRendered(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false; // display:none, collapsed, etc.
  return window.getComputedStyle(el).visibility !== "hidden";
}

/** First element with this `data-tour` value that is actually rendered.
 * The same id can exist twice (e.g. desktop + mobile nav); the hidden copy
 * is ignored. Returns null when the feature is not on screen. */
export function findTourTarget(target: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const matches = document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`);
  for (const el of Array.from(matches)) {
    if (isRendered(el)) return el;
  }
  return null;
}

export function toTourRect(rect: DOMRect): TourRect {
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

/** Fixed/sticky elements (top bar, nav, help button) never need scrolling. */
function isPinned(el: HTMLElement): boolean {
  let node: HTMLElement | null = el;
  while (node && node !== document.body) {
    const position = window.getComputedStyle(node).position;
    if (position === "fixed" || position === "sticky") return true;
    node = node.parentElement;
  }
  return false;
}

/** Scrolls the target into view if it is clipped by the viewport. */
export function ensureTargetInView(el: HTMLElement): void {
  if (isPinned(el)) return;
  const rect = el.getBoundingClientRect();
  const margin = 80; // clear of the sticky top bar and bottom nav
  const clipped = rect.top < margin || rect.bottom > window.innerHeight - margin;
  if (clipped) {
    el.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
  }
}
