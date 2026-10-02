"use client";

import React, { useEffect, useRef } from "react";
import { Compass, LifeBuoy, Mail, Phone, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n/languageContext";
import { getSupportEmail, getSupportPhone } from "@/lib/support/supportConfig";
import { useTour } from "@/components/tour/TourProvider";

const HELP_TOPIC_KEYS = [
  "support.help.use",
  "support.help.appointments",
  "support.help.teleconsultation",
  "support.help.referrals",
  "support.help.navigation",
];

export function HelpSupportPanel({ onClose }: { onClose: () => void }) {
  const { t } = useLanguage();
  const tour = useTour();
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const phone = getSupportPhone();
  const email = getSupportEmail();

  // Focus the dialog, trap Tab, close on Escape, and give focus back after.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = cardRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
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
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-900/60"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ss-support-title"
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-700 text-white flex items-center justify-center shrink-0">
              <LifeBuoy className="w-5 h-5" aria-hidden="true" />
            </div>
            <h2 id="ss-support-title" className="text-xl font-extrabold text-slate-900 dark:text-white">
              {t("support.title")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("support.close")}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-400"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <p className="text-base text-slate-700 dark:text-slate-200">{t("support.intro")}</p>

        <div className="rounded-2xl bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-700/60 p-4 space-y-3">
          {phone ? (
            <>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("support.callPrompt")}</p>
              <p className="flex items-center gap-2 text-2xl font-extrabold text-teal-900 dark:text-teal-200 break-all">
                <Phone className="w-6 h-6 shrink-0" aria-hidden="true" />
                <span>{phone.display}</span>
              </p>
              <a
                href={`tel:${phone.telHref}`}
                className="flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-base font-bold cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-400"
              >
                <Phone className="w-5 h-5" aria-hidden="true" />
                {t("support.callNow")}
              </a>
            </>
          ) : (
            <p role="status" className="text-base font-semibold text-slate-700 dark:text-slate-200">
              {t("support.unavailable")}
            </p>
          )}
          {email && (
            <p className="text-sm text-slate-700 dark:text-slate-200 flex flex-wrap items-center gap-1.5">
              <Mail className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{t("support.emailLabel")}</span>
              <a href={`mailto:${email}`} className="font-bold text-teal-800 dark:text-teal-300 underline break-all">
                {email}
              </a>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{t("support.helpWithHeading")}</p>
          <ul className="list-disc pl-5 space-y-1 text-base text-slate-700 dark:text-slate-200">
            {HELP_TOPIC_KEYS.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </div>

        {/* Kept visibly separate: this is a help line, not emergency care. */}
        <p className="text-sm leading-relaxed rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 text-amber-900 dark:text-amber-200 p-3">
          {t("support.emergencyNote")}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          {tour?.available && (
            <button
              type="button"
              onClick={() => {
                onClose();
                tour.restart();
              }}
              className="flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-xl bg-white dark:bg-slate-800 text-teal-900 dark:text-teal-200 border border-teal-300 dark:border-teal-700 hover:bg-teal-50 dark:hover:bg-slate-700 text-base font-bold cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-400"
            >
              <Compass className="w-5 h-5" aria-hidden="true" />
              {t("tour.restart")}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[48px] px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 text-base font-bold cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-400"
          >
            {t("support.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
