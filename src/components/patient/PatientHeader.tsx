"use client";

import React from "react";
import { RoleBadge } from "@/components/RoleBadge";
import { MapPin, Languages, Baby } from "lucide-react";
import { useLanguage } from "@/lib/i18n/languageContext";
import { isMaternalPathway } from "@/lib/carePathways";

interface PatientHeaderProps {
  name: string;
  location: string;
  language: string;
  carePathway?: string | null;
  pregnancyWeek?: number | null;
}

export function PatientHeader({
  name,
  location,
  language,
  carePathway,
  pregnancyWeek,
}: PatientHeaderProps) {
  const { t } = useLanguage();

  const displayName = name === "Priya Sharma" ? t("priyaSharmaName") : name;
  const displayLocation =
    location === "Rampur Village" || location === "Rampur"
      ? t("rampurLocation")
      : location;

  // Maternal UI must only appear when the patient's confirmed care pathway
  // is Maternal Care — never inferred merely from a pregnancy_week value
  // being present (that field can be null/irrelevant for every other
  // pathway, and a truthy check alone would wrongly flag week=0 as "no").
  const isMaternal = isMaternalPathway(carePathway);
  const pathwayLabel = carePathway || t("noCarePathwaySet");

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {displayName}
            </h1>
            <RoleBadge role="Patient" />
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-800 border border-teal-200 text-[11px] font-bold">
              {pathwayLabel}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {isMaternal ? t("personalMaternalPortal") : "Personal health portal"}
          </p>
        </div>

        {isMaternal && pregnancyWeek != null && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-900/30 border border-teal-200/80 text-teal-900 text-xs font-bold">
            <Baby className="w-4 h-4 text-teal-700" />
            <span>{t("pregnancyWeek")} {pregnancyWeek}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0" />
          <span>{displayLocation}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Languages className="w-3.5 h-3.5 text-teal-700 shrink-0" />
          <span>{t("preferredLanguageLabel")}: {language}</span>
        </div>
      </div>
    </div>
  );
}
