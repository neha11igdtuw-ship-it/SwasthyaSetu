import React from "react";
import { WifiOff, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/languageContext";

interface LastSyncedBadgeProps {
  lastSyncedText: string;
}

export function LastSyncedBadge({ lastSyncedText }: LastSyncedBadgeProps) {
  const { t } = useLanguage();

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 text-emerald-900 text-xs font-medium">
      <WifiOff className="w-3.5 h-3.5 text-emerald-700" />
      <span className="font-bold">{t("savedOnThisDevice")}</span>
      <span className="text-emerald-700">•</span>
      <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        {lastSyncedText}
      </span>
    </div>
  );
}
