"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/languageContext";
import { RoleType } from "./RoleBadge";
import { Menu, X } from "lucide-react";

export interface NavItem {
  labelKey: string;
  defaultLabel: string;
  href: string;
  icon: React.ElementType;
  label?: string;
}

export interface SidebarProps {
  items: NavItem[];
  role?: RoleType;
  userName?: string;
  facilityOrLocation?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function Sidebar({
  items,
  isOpen = true,
  onToggle,
}: SidebarProps) {
  const pathname = usePathname();
  const { t } = useLanguage();

  if (!isOpen) {
    return null;
  }

  return (
    <aside
      aria-label="Sidebar Navigation"
      className="flex flex-col w-64 sm:w-72 border-r border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 min-h-[calc(100vh-61px)] p-4 shrink-0 transition-all duration-300"
    >
      {/* Top Header Row of Sidebar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1 flex items-center gap-2">
          <Menu className="w-4 h-4 text-teal-700 dark:text-teal-400" />
          <span>{t("navigation")}</span>
        </div>
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Close menu"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Navigation Links */}
      <nav className="space-y-1 flex-1 overflow-y-auto pr-1">
        {items.map((item, idx) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const label = item.label ?? (t(item.labelKey) || item.defaultLabel);

          return (
            <Link
              key={`${item.labelKey}-${item.href}-${idx}`}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-teal-50 dark:bg-teal-900/40 text-teal-900 dark:text-teal-200 border border-teal-200/80 dark:border-teal-700/60 shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive
                    ? "text-teal-700 dark:text-teal-400"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
