"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/languageContext";
import {
  MoreVertical,
  LogIn,
  UserPlus,
  User,
  HeartPulse,
  Stethoscope,
  Building2,
  Check,
} from "lucide-react";

export function ThreeDotMenu() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside and Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const spaces = [
    {
      titleKey: "patient",
      descKey: "patientSpaceDesc",
      href: "/patient/dashboard",
      icon: User,
      color: "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30",
    },
    {
      titleKey: "healthWorker",
      descKey: "hwSpaceDesc",
      href: "/hw/dashboard",
      icon: HeartPulse,
      color: "text-teal-700 bg-teal-50 dark:bg-teal-900/30",
    },
    {
      titleKey: "doctor",
      descKey: "doctorSpaceDesc",
      href: "/doctor/dashboard",
      icon: Stethoscope,
      color: "text-sky-700 bg-sky-50 dark:bg-sky-900/30",
    },
    {
      titleKey: "healthcareFacility",
      descKey: "facilitySpaceDesc",
      href: "/facility/dashboard",
      icon: Building2,
      color: "text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30",
    },
  ];

  return (
    <div className="relative inline-block text-left z-50" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl p-2.5 space-y-3 text-xs z-50">
          {/* Section: Account */}
          <div className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {t("accountSection")}
            </div>

            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                pathname === "/login"
                  ? "bg-teal-50 dark:bg-teal-900/30 text-teal-900 font-extrabold border border-teal-200/80"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold"
              }`}
            >
              <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/30 border border-teal-100 text-teal-700 shrink-0">
                <LogIn className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  {t("signInTitle")}
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate">
                  {t("signInDesc")}
                </span>
              </div>
            </Link>

            <Link
              href="/register"
              onClick={() => setIsOpen(false)}
              className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                pathname === "/register"
                  ? "bg-teal-50 dark:bg-teal-900/30 text-teal-900 font-extrabold border border-teal-200/80"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold"
              }`}
            >
              <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/30 border border-teal-100 text-teal-700 shrink-0">
                <UserPlus className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  {t("createAccountTitle")}
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate">
                  {t("createAccountDesc")}
                </span>
              </div>
            </Link>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700" />

          {/* Section: Choose your space */}
          <div className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {t("chooseYourSpace")}
            </div>

            {spaces.map((space) => {
              const Icon = space.icon;
              const isActive = pathname.startsWith(space.href);

              return (
                <Link
                  key={space.href}
                  href={space.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                    isActive
                      ? "bg-teal-50 dark:bg-teal-900/30 text-teal-900 font-extrabold border border-teal-200/80 shadow-xs"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold"
                  }`}
                >
                  <div className={`p-2 rounded-lg border shrink-0 ${space.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                        {t(space.titleKey)}
                      </span>
                      {isActive && <Check className="w-3.5 h-3.5 text-teal-700" />}
                    </div>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate">
                      {t(space.descKey)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
