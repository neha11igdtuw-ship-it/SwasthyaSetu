"use client";

import React, { useEffect, useRef } from "react";
import { Compass } from "lucide-react";
import { useLanguage } from "@/lib/i18n/languageContext";

interface TourWelcomeProps {
  onStart: () => void;
  onSkip: () => void;
}

export function TourWelcome({ onStart, onSkip }: TourWelcomeProps) {
  const { t } = useLanguage();
  const startRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startRef.current?.focus({ preventScroll: true });
  }, []);

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
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onSkip]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[rgba(8,28,33,0.65)]">
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ss-tour-welcome-title"
        aria-describedby="ss-tour-welcome-desc"
        className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border-2 border-teal-600 shadow-2xl p-6 sm:p-8 text-center space-y-4"
      >
        <div className="mx-auto w-14 h-14 rounded-2xl bg-teal-700 text-white flex items-center justify-center shadow-xs">
          <Compass className="w-7 h-7" aria-hidden="true" />
        </div>
        <h2 id="ss-tour-welcome-title" className="text-2xl font-extrabold text-slate-900 dark:text-white">
          {t("tour.welcome.title")}
        </h2>
        <p id="ss-tour-welcome-desc" className="text-base leading-relaxed text-slate-700 dark:text-slate-200">
          {t("tour.welcome.description")}
        </p>
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 min-h-[48px] px-4 rounded-xl text-base font-bold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-400"
          >
            {t("tour.welcome.skip")}
          </button>
          <button
            ref={startRef}
            type="button"
            onClick={onStart}
            className="flex-1 min-h-[48px] px-4 rounded-xl text-base font-bold bg-teal-700 hover:bg-teal-800 text-white cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-400"
          >
            {t("tour.welcome.start")}
          </button>
        </div>
      </div>
    </div>
  );
}
