"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavItem } from "./Sidebar";
import { useLanguage } from "@/lib/i18n/languageContext";

interface MobileBottomNavProps {
  items: NavItem[];
}

export function MobileBottomNav({ items }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-2 py-1.5 flex items-center justify-around shadow-lg">
      {items.map((item, idx) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        const label = t(item.labelKey) || item.defaultLabel;

        return (
          <Link
            key={`${item.labelKey}-${item.href}-${idx}`}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
              isActive ? "text-teal-800 dark:text-teal-400 font-extrabold" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <Icon
              className={`w-5 h-5 mb-0.5 ${
                isActive ? "text-teal-700 dark:text-teal-400" : "text-slate-400 dark:text-slate-500"
              }`}
            />
            <span className="truncate max-w-[64px]">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
