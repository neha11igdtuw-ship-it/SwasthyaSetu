"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n/languageContext";
import type { TourRect } from "@/lib/tour/tourDom";

interface TourStepProps {
  rect: TourRect | null;
  title: string;
  description: string;
  current: number;
  total: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

interface Placement {
  top: number;
  left: number;
  side: "top" | "bottom" | "none";
  arrowLeft: number;
}

const VIEWPORT_MARGIN = 12;
const TARGET_GAP = 16;

/** Tooltip card with a pointer toward the highlighted element. Always kept
 * inside the viewport (mobile friendly). */
export function TourStep({ rect, title, description, current, total, onNext, onBack, onSkip }: TourStepProps) {
  const { t } = useLanguage();
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);

  const isFirst = current === 1;
  const isLast = current === total;

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card || !rect) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    const centerX = rect.left + rect.width / 2;
    const left = Math.min(Math.max(centerX - w / 2, VIEWPORT_MARGIN), Math.max(vw - w - VIEWPORT_MARGIN, VIEWPORT_MARGIN));
    const arrowLeft = Math.min(Math.max(centerX - left, 22), Math.max(w - 22, 22));
    const spaceBelow = vh - (rect.top + rect.height) - TARGET_GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - TARGET_GAP - VIEWPORT_MARGIN;

    if (spaceBelow >= h) {
      setPlacement({ top: rect.top + rect.height + TARGET_GAP, left, side: "bottom", arrowLeft });
    } else if (spaceAbove >= h) {
      setPlacement({ top: rect.top - h - TARGET_GAP, left, side: "top", arrowLeft });
    } else {
      // Target is too tall to fit the card above/below: dock the card at the
      // bottom of the screen and skip the pointer.
      setPlacement({ top: Math.max(vh - h - VIEWPORT_MARGIN, VIEWPORT_MARGIN), left, side: "none", arrowLeft });
    }
  }, [rect, title, description]);

  // Move keyboard focus to the primary button on every step.
  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, [current]);

  // Keyboard: Escape skips, Tab stays inside the card.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onSkip();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = cardRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!cardRef.current?.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onSkip]);

  const counter = t("tour.ui.stepOf")
    .replace("{current}", String(current))
    .replace("{total}", String(total));

  const buttonBase =
    "min-h-[44px] px-4 rounded-xl text-sm font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-400";

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ss-tour-title"
      aria-describedby="ss-tour-desc"
      aria-label={t("tour.ui.dialogLabel")}
      className="fixed z-[102] rounded-2xl bg-white dark:bg-slate-900 border-2 border-teal-600 shadow-2xl p-5 space-y-3 transition-opacity duration-150 motion-reduce:transition-none"
      style={{
        width: "min(24rem, calc(100vw - 24px))",
        top: placement?.top ?? 0,
        left: placement?.left ?? VIEWPORT_MARGIN,
        opacity: placement ? 1 : 0,
      }}
    >
      {placement && placement.side !== "none" && (
        <span
          aria-hidden="true"
          className={`absolute w-4 h-4 rotate-45 bg-white dark:bg-slate-900 border-teal-600 ${
            placement.side === "bottom" ? "border-l-2 border-t-2 -top-[9px]" : "border-r-2 border-b-2 -bottom-[9px]"
          }`}
          style={{ left: placement.arrowLeft - 8 }}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-extrabold uppercase tracking-wider text-teal-800 dark:text-teal-300" aria-live="polite">
          {counter}
        </span>
        <button
          type="button"
          onClick={onSkip}
          className="min-h-[44px] px-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white underline underline-offset-2 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-400 rounded-lg"
        >
          {t("tour.ui.skip")}
        </button>
      </div>

      <h2 id="ss-tour-title" className="text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
        {title}
      </h2>
      <p id="ss-tour-desc" className="text-base leading-relaxed text-slate-700 dark:text-slate-200">
        {description}
      </p>

      <div className="flex items-center justify-end gap-2 pt-1">
        {!isFirst && (
          <button
            type="button"
            onClick={onBack}
            className={`${buttonBase} bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700`}
          >
            {t("tour.ui.back")}
          </button>
        )}
        <button
          ref={nextRef}
          type="button"
          onClick={onNext}
          className={`${buttonBase} bg-teal-700 hover:bg-teal-800 text-white min-w-[96px]`}
        >
          {isLast ? t("tour.ui.finish") : t("tour.ui.next")}
        </button>
      </div>
    </div>
  );
}
