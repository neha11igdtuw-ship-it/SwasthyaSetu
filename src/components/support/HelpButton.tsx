"use client";

import React from "react";
import { LifeBuoy, Phone } from "lucide-react";
import { useLanguage } from "@/lib/i18n/languageContext";
import { useSupport } from "./SupportProvider";

/** "floating": small screens, above the bottom nav.
 *  "header": normal button in the top bar on larger screens.
 *  Both carry data-tour="help"; only the one that is visible is highlighted. */
export function HelpButton({ variant }: { variant: "floating" | "header" }) {
  const { t } = useLanguage();
  const support = useSupport();
  if (!support) return null;

  if (variant === "floating") {
    return (
      <button
        type="button"
        data-tour="help"
        onClick={support.open}
        aria-label={t("support.button")}
        aria-haspopup="dialog"
        className="md:hidden fixed bottom-20 right-3 z-40 inline-flex items-center gap-2 min-h-[48px] px-4 rounded-full bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-sm font-extrabold shadow-lg cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-300"
      >
        <Phone className="w-4 h-4" aria-hidden="true" />
        <span>{t("support.button")}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      data-tour="help"
      onClick={support.open}
      aria-label={t("support.button")}
      aria-haspopup="dialog"
      className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-900/40 hover:bg-teal-100 dark:hover:bg-teal-900/70 text-teal-900 dark:text-teal-200 text-xs font-bold border border-teal-200/80 dark:border-teal-700/60 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
    >
      <LifeBuoy className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{t("support.navLabel")}</span>
    </button>
  );
}
