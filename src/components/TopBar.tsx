import React from "react";
import Link from "next/link";
import { RoleType, RoleBadge } from "./RoleBadge";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { WifiOff, Home } from "lucide-react";

interface TopBarProps {
  role: RoleType;
  userName: string;
  facilityOrLocation: string;
}

export function TopBar({ role, userName, facilityOrLocation }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 px-4 py-3 sm:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="SwasthyaSetu Home"
            className="flex items-center gap-2 group"
          >
            <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center font-extrabold text-lg shadow-sm group-hover:bg-teal-800 transition-colors">
              S
            </div>
            <div className="hidden sm:block">
              <span className="font-extrabold text-lg tracking-tight text-slate-900 block leading-none">
                SwasthyaSetu
              </span>
              <span className="text-[10px] text-teal-700 font-semibold tracking-wider uppercase">
                Rural Care Continuity
              </span>
            </div>
          </Link>
          <RoleBadge role={role} />
        </div>

        {/* Right Section: User Info, Offline Badge, Language Selector & Home */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-bold text-slate-900">{userName}</span>
            <span className="text-[11px] text-slate-500">{facilityOrLocation}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
            <WifiOff className="w-3 h-3 text-emerald-700" />
            <span className="hidden sm:inline">Saved on this device</span>
            <span className="sm:hidden">Saved</span>
          </div>

          {/* Language Selector in Top Right */}
          <LanguageSelector />

          <Link
            href="/"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Return to Role Chooser"
          >
            <Home className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
