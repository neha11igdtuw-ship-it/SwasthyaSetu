"use client";

import React from "react";
import Link from "next/link";
import { Mic } from "lucide-react";
import { useLanguage } from "@/lib/i18n/languageContext";

export function FloatingMicButton() {
  const { t } = useLanguage();
  const label = t("speakInYourLanguage") || "Speak symptoms";

  return (
    <aside
      aria-label={label}
      className="fixed z-40 bottom-5 right-5 sm:bottom-8 sm:right-8 flex items-center gap-3 group"
    >
      {/* Desktop side chip */}
      <span className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-slate-800/95 border border-teal-200/80 dark:border-teal-700/80 text-teal-900 dark:text-teal-100 text-xs font-extrabold shadow-lg backdrop-blur-md transition-all group-hover:scale-105 group-hover:bg-white dark:group-hover:bg-slate-800">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        <span>{label}</span>
      </span>

      {/* Floating Action Button */}
      <div className="relative flex items-center justify-center">
        {/* Soft outer pulse ring matching reference image */}
        <span className="absolute inset-0 rounded-full bg-teal-400/30 dark:bg-teal-500/30 animate-ping pointer-events-none scale-125" />
        <span className="absolute -inset-2.5 rounded-full bg-teal-500/20 dark:bg-teal-400/20 blur-md pointer-events-none" />

        <Link
          href="/patient/voice-assistant"
          aria-label={label}
          title={label}
          className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-teal-800 via-teal-700 to-emerald-600 dark:from-teal-600 dark:via-teal-500 dark:to-emerald-400 text-white shadow-xl flex items-center justify-center ring-4 ring-white/80 dark:ring-slate-900/80 transition-all duration-200 hover:scale-110 active:scale-95 group-hover:shadow-2xl group-hover:shadow-teal-600/30 cursor-pointer"
        >
          <Mic className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow-xs" />
        </Link>
      </div>
    </aside>
  );
}
