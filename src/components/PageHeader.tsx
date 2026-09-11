"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n/languageContext";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  roleBadge?: React.ReactNode;
  action?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  roleBadge,
  action,
}: PageHeaderProps) {
  const { t } = useLanguage();

  const displayTitle = t(title) || title;
  const displaySubtitle = subtitle ? (t(subtitle) || subtitle) : undefined;

  return (
    <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-700 pb-5">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {displayTitle}
          </h1>
          {roleBadge}
        </div>
        {displaySubtitle && (
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{displaySubtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
