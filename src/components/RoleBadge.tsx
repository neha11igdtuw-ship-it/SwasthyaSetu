"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n/languageContext";

export type RoleType = "Patient" | "Health Worker" | "Doctor" | "Healthcare Facility";

interface RoleBadgeProps {
  role: RoleType;
  className?: string;
}

export function RoleBadge({ role, className = "" }: RoleBadgeProps) {
  const { t } = useLanguage();

  const roleStyles: Record<RoleType, string> = {
    Patient: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 border-emerald-200",
    "Health Worker": "bg-teal-50 dark:bg-teal-900/30 text-teal-800 border-teal-200",
    Doctor: "bg-sky-50 dark:bg-sky-900/30 text-sky-800 border-sky-200",
    "Healthcare Facility": "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 border-indigo-200",
  };

  const roleLabels: Record<RoleType, string> = {
    Patient: t("patient"),
    "Health Worker": t("healthWorker"),
    Doctor: t("doctor"),
    "Healthcare Facility": t("healthcareFacility"),
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${roleStyles[role]} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {roleLabels[role] || role}
    </span>
  );
}
