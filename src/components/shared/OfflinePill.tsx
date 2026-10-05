"use client";

import React, { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useLanguage } from "@/lib/i18n/languageContext";

interface OfflinePillProps {
  className?: string;
}

export function OfflinePill({ className = "" }: OfflinePillProps) {
  const { t } = useLanguage();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const StatusIcon = online ? Wifi : WifiOff;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-medium text-xs shadow-xs transition-colors ${online ? "bg-teal-50 dark:bg-teal-950/80 border-teal-200/80 dark:border-teal-400/50 text-teal-900 dark:text-teal-100" : "bg-amber-50 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100"} ${className}`}
    >
      <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${online ? "bg-teal-200/70 dark:bg-teal-800/80" : "bg-amber-200 dark:bg-amber-900"}`}>
        <StatusIcon className={`w-3 h-3 shrink-0 ${online ? "text-teal-800 dark:text-teal-200" : "text-amber-900 dark:text-amber-200"}`} aria-hidden="true" />
      </span>
      <span className="font-semibold text-xs tracking-tight">{t(online ? "onlineStatusText" : "offlineStatusText")}</span>
    </div>
  );
}
