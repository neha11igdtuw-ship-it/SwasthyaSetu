"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { RoleType, RoleBadge } from "./RoleBadge";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { ThreeDotMenu } from "@/components/ThreeDotMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLanguage } from "@/lib/i18n/languageContext";
import { WifiOff } from "lucide-react";

interface TopBarProps {
  role?: RoleType;
  userName?: string;
  facilityOrLocation?: string;
}

export function TopBar({ role, userName, facilityOrLocation }: TopBarProps) {
  const { t } = useLanguage();

  const localizedUserName =
    userName === "Priya Sharma"
      ? t("priyaSharmaName")
      : userName === "ANM Sunita Devi" || userName === "Sunita Devi"
      ? t("sunitaDeviWorker")
      : userName === "Dr. Ananya Rao"
      ? t("drAnanyaRao")
      : userName
      ? t(userName)
      : undefined;

  let localizedLocation = facilityOrLocation;
  if (facilityOrLocation) {
    if (facilityOrLocation.includes("Rampur Village")) {
      localizedLocation = facilityOrLocation
        .replace("Rampur Village", t("rampurLocation"))
        .replace("Pregnancy W28", t("pregnancyWeek28Text"));
    } else if (facilityOrLocation.includes("Sub-Centre Rampur")) {
      localizedLocation = facilityOrLocation.replace("Sub-Centre Rampur", t("subCentreRampur"));
    } else if (facilityOrLocation.includes("District Civil Hospital")) {
      localizedLocation = facilityOrLocation.replace(
        "District Civil Hospital & Maternal Care Centre",
        t("districtHospitalName")
      );
    }
  }

  return (
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-700 px-4 py-2.5 sm:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Logo & Subtitle */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="SwasthyaSetu Home"
            className="flex items-center gap-2.5 group"
          >
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <Image
                src="/logo.jpg"
                alt="SwasthyaSetu Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white block leading-none">
                {t("appName")}
              </span>
              <span className="text-[10px] text-teal-700 font-semibold tracking-wide uppercase">
                {t("platformSubtitle")}
              </span>
            </div>
          </Link>

          {role && <RoleBadge role={role} />}
        </div>

        {/* Right Section: Offline Badge, Language Selector & Three-Dot Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {localizedUserName && (
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs font-bold text-slate-900 dark:text-white">{localizedUserName}</span>
              {localizedLocation && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{localizedLocation}</span>
              )}
            </div>
          )}

          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
            <WifiOff className="w-3 h-3 text-emerald-700 shrink-0" />
            <span>{t("savedOnDevice")}</span>
          </div>

          {/* Language Selector */}
          <LanguageSelector />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Discovery Three-Dot Menu */}
          <ThreeDotMenu />
        </div>
      </div>
    </header>
  );
}
