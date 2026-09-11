"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/languageContext";

export interface NavItem {
  labelKey: string;
  defaultLabel: string;
  href: string;
  icon: React.ElementType;
}

interface SidebarProps {
  items: NavItem[];
}

export function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 min-h-[calc(100vh-61px)] p-4 shrink-0">
      <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-3">
        {t("navigation")}
      </div>
      <nav className="space-y-1">
        {items.map((item, idx) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const label = t(item.labelKey) || item.defaultLabel;

          return (
            <Link
              key={`${item.labelKey}-${item.href}-${idx}`}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-teal-50 dark:bg-teal-900/30 text-teal-900 dark:text-teal-300 border border-teal-200/80 dark:border-teal-700/60 shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive ? "text-teal-700 dark:text-teal-400" : "text-slate-400 dark:text-slate-500"
                }`}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
