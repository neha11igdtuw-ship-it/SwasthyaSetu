"use client";

import React from "react";
import { CloudOff } from "lucide-react";
import { useLanguage } from "@/lib/i18n/languageContext";

interface OfflinePillProps {
  className?: string;
}

export function OfflinePill({ className = "" }: OfflinePillProps) {
  const { t } = useLanguage();

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/80 border border-teal-200/80 dark:border-teal-400/50 text-teal-900 dark:text-teal-100 font-medium text-xs shadow-xs transition-colors ${className}`}
    >
      <span className="w-5 h-5 rounded-full bg-teal-200/70 dark:bg-teal-800/80 flex items-center justify-center shrink-0">
        <CloudOff className="w-3 h-3 text-teal-800 dark:text-teal-200 shrink-0" />
      </span>
      <span className="font-semibold text-xs tracking-tight">{t("offlinePillText")}</span>
    </div>
  );
}
