"use client";

import React from "react";
import {
  User,
  HeartPulse,
  Stethoscope,
  Building2,
  WifiOff,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/languageContext";
import { LanguageSelector } from "@/components/shared/LanguageSelector";

interface RoleCardProps {
  title: string;
  roleTag: string;
  description: string;
  icon: React.ElementType;
  primaryActionLabel: string;
  href: string;
  badgeText?: string;
}

function RoleCard({
  title,
  roleTag,
  description,
  icon: Icon,
  primaryActionLabel,
  href,
  badgeText,
}: RoleCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 hover:border-teal-500/50 hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
            <Icon className="w-6 h-6" aria-hidden="true" />
          </div>
          {badgeText && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {badgeText}
            </span>
          )}
        </div>
        <span className="text-xs font-medium uppercase tracking-wider text-teal-800/70">
          {roleTag}
        </span>
        <h3 className="text-xl font-bold text-slate-900 mt-1 mb-2">{title}</h3>
        <p className="text-slate-600 text-sm leading-relaxed mb-6">
          {description}
        </p>
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <Link
          href={href}
          aria-label={`Open ${title} overview`}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-sm font-semibold transition-colors shadow-sm"
        >
          <span>{primaryActionLabel}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { t } = useLanguage();

  const roles: RoleCardProps[] = [
    {
      roleTag: "Role 1",
      title: t("patient"),
      description: t("patientRoleDesc"),
      icon: User,
      primaryActionLabel: t("openOverview"),
      href: "/patient/dashboard",
      badgeText: "Voice & Text",
    },
    {
      roleTag: "Role 2",
      title: t("healthWorker"),
      description: t("healthWorkerRoleDesc"),
      icon: HeartPulse,
      primaryActionLabel: t("openOverview"),
      href: "/hw/dashboard",
      badgeText: t("savedOnThisDevice"),
    },
    {
      roleTag: "Role 3",
      title: t("doctor"),
      description: t("doctorRoleDesc"),
      icon: Stethoscope,
      primaryActionLabel: t("openOverview"),
      href: "/doctor/dashboard",
      badgeText: "Clinical Review",
    },
    {
      roleTag: "Role 4",
      title: t("healthcareFacility"),
      description: t("facilityRoleDesc"),
      icon: Building2,
      primaryActionLabel: t("openOverview"),
      href: "/facility/dashboard",
      badgeText: "Care Desk",
    },
  ];

  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* Top Header / Navbar */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 px-4 py-3.5 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold text-xl shadow-sm">
              S
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 block leading-none">
                {t("appName")}
              </span>
              <span className="text-[10px] text-teal-700 font-semibold tracking-wide uppercase">
                {t("platformSubtitle")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
              <WifiOff className="w-3.5 h-3.5 text-teal-700" />
              <span>{t("savedOnThisDevice")}</span>
            </div>

            {/* Language Selector in Top Right Header */}
            <LanguageSelector />
          </div>
        </div>
      </header>

      {/* Main Hero & Content Section */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-8 sm:py-14 flex-1 flex flex-col justify-center">
        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/70 border border-emerald-300 text-emerald-900 text-xs font-bold tracking-wide">
            <Activity className="w-3.5 h-3.5 text-emerald-700" />
            <span>SIH26133 • Rural Healthcare & Continuity Solution</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {t("appName")}
          </h1>

          <p className="text-xl sm:text-2xl font-semibold text-teal-800 italic">
            “{t("tagline")}”
          </p>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed pt-2">
            {t("landingHeroDescription")}
          </p>

          {/* Core USP Banner */}
          <div className="mt-6 p-4 rounded-2xl bg-teal-900 text-white shadow-md text-left sm:text-center flex flex-col sm:flex-row items-center justify-center gap-3 border border-teal-800">
            <span className="px-2.5 py-1 rounded-md bg-amber-400 text-slate-950 text-xs font-extrabold uppercase tracking-wide shrink-0">
              {t("corePurposeTag")}
            </span>
            <p className="text-sm sm:text-base font-medium text-teal-50">
              “{t("corePurposeStatement")}”
            </p>
          </div>
        </div>

        {/* Roles Grid */}
        <section className="space-y-6" aria-labelledby="roles-heading">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
            <div>
              <h2
                id="roles-heading"
                className="text-xl font-bold text-slate-900"
              >
                {t("fourStakeholders")}
              </h2>
              <p className="text-xs text-slate-500">
                {t("selectRoleSub")}
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-200/70 text-slate-700 w-fit">
              {t("demoPathwayTag")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {roles.map((role) => (
              <RoleCard key={role.title} {...role} />
            ))}
          </div>
        </section>

        {/* Offline & Safety Guidance Section */}
        <section className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base mb-1">
                {t("savedOnThisDevice")}
              </h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                {t("informationSavedOnThisDevice")}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base mb-1">
                {t("importantSafetyNotice")}
              </h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                {t("aiPreliminaryNotice")}
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>SwasthyaSetu Platform Active</span>
          </div>
          <p>© 2026 SwasthyaSetu Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
