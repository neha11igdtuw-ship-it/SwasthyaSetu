"use client";

import React from "react";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { useLanguage } from "@/lib/i18n/languageContext";
import {
  MessageSquare,
  Search,
  Calendar,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Globe2,
  Building2,
  WifiOff,
  User,
  HeartPulse,
  Stethoscope,
  ChevronRight,
} from "lucide-react";

export default function LandingPage() {
  const { t } = useLanguage();

  const quickActionTiles = [
    {
      titleKey: "tellUsProblemTitle",
      descKey: "tellUsProblemDesc",
      icon: MessageSquare,
      color: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 border-emerald-200/80",
      iconBg: "bg-emerald-600 text-white",
      href: "/patient/symptoms",
    },
    {
      titleKey: "findRightCareTitle",
      descKey: "findRightCareDesc",
      icon: Search,
      color: "bg-teal-50 dark:bg-teal-900/30 text-teal-800 border-teal-200/80",
      iconBg: "bg-teal-600 text-white",
      href: "/patient/facilities",
    },
    {
      titleKey: "continueCareTitle",
      descKey: "continueCareDesc",
      icon: Calendar,
      color: "bg-sky-50 dark:bg-sky-900/30 text-sky-800 border-sky-200/80",
      iconBg: "bg-sky-600 text-white",
      href: "/patient/follow-ups",
    },
    {
      titleKey: "getSupportTitle",
      descKey: "getSupportDesc",
      icon: AlertCircle,
      color: "bg-amber-50 dark:bg-amber-900/30 text-amber-900 border-amber-200/80",
      iconBg: "bg-amber-600 text-white",
      href: "/hw/high-risk",
    },
  ];

  const journeySteps = [
    { step: "01", titleKey: "journeyStep1", desc: "Speak or type symptoms in your language" },
    { step: "02", titleKey: "journeyStep2", desc: "Get preliminary guidance and hospital match" },
    { step: "03", titleKey: "journeyStep3", desc: "Receive treatment and care transfer support" },
    { step: "04", titleKey: "journeyStep4", desc: "Complete follow-up visits with ASHA alerts" },
  ];

  const ruralBenefits = [
    {
      titleKey: "speakInLocalLanguage",
      desc: "Speak naturally in Hindi, Marathi or local dialect with easy voice assistance.",
      icon: Globe2,
    },
    {
      titleKey: "findSuitableFacility",
      desc: "Match symptoms directly with available doctor duty and hospital beds.",
      icon: Building2,
    },
    {
      titleKey: "continueCareWeakInternet",
      desc: "Important records are saved on phone and automatically sent when online.",
      icon: WifiOff,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f6fafa] dark:bg-[#0b1a1f]">
      <TopBar />

      <main className="flex-1 space-y-12 sm:space-y-16 pb-16">
        {/* Hero Section */}
        <section className="pt-8 sm:pt-14 px-4 sm:px-8 max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 text-white rounded-3xl p-6 sm:p-12 shadow-xl relative overflow-hidden">
            <div className="max-w-2xl space-y-6 relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-semibold backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-teal-300 animate-pulse" />
                <span>{t("corePurposeStatement")}</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                {t("heroHeadline")}
              </h1>

              <p className="text-sm sm:text-base text-teal-100 font-normal leading-relaxed">
                {t("heroDescription")}
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Link
                  href="/login"
                  className="px-6 py-3.5 rounded-2xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-extrabold text-sm transition-colors text-center shadow-md flex items-center justify-center gap-2"
                >
                  <span>{t("getStarted")}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href="#care-journey"
                  className="px-6 py-3.5 rounded-2xl bg-white/10 dark:bg-slate-800 hover:bg-white/20 dark:hover:bg-slate-800 text-white font-bold text-sm transition-colors text-center border border-white/20 backdrop-blur-md"
                >
                  {t("seeHowItWorks")}
                </a>
              </div>
            </div>

            {/* Visual connected care graphic element */}
            <div className="hidden lg:flex absolute right-8 top-1/2 -translate-y-1/2 gap-4 items-center opacity-85 pointer-events-none">
              <div className="p-4 rounded-2xl bg-white/10 dark:bg-slate-800 border border-white/20 backdrop-blur-md text-white text-center w-32 space-y-1">
                <User className="w-6 h-6 mx-auto text-teal-300" />
                <span className="text-xs font-bold block">{t("patient")}</span>
              </div>

              <div className="w-8 h-0.5 bg-teal-400/60" />

              <div className="p-4 rounded-2xl bg-white/10 dark:bg-slate-800 border border-white/20 backdrop-blur-md text-white text-center w-32 space-y-1">
                <HeartPulse className="w-6 h-6 mx-auto text-emerald-300" />
                <span className="text-xs font-bold block">{t("healthWorker")}</span>
              </div>

              <div className="w-8 h-0.5 bg-teal-400/60" />

              <div className="p-4 rounded-2xl bg-white/10 dark:bg-slate-800 border border-white/20 backdrop-blur-md text-white text-center w-32 space-y-1">
                <Stethoscope className="w-6 h-6 mx-auto text-sky-300" />
                <span className="text-xs font-bold block">{t("doctor")}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Action Tiles */}
        <section className="px-4 sm:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActionTiles.map((tile, i) => {
              const Icon = tile.icon;

              return (
                <Link
                  key={i}
                  href={tile.href}
                  className={`p-5 rounded-2xl border transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between space-y-4 ${tile.color}`}
                >
                  <div className="space-y-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tile.iconBg}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                        {t(tile.titleKey)}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed mt-1">
                        {t(tile.descKey)}
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex items-center text-xs font-bold text-slate-900 dark:text-white gap-1 pt-2 border-t border-slate-200/50 dark:border-slate-700">
                    <span>{t("viewDetails")}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Simple Care Journey */}
        <section id="care-journey" className="px-4 sm:px-8 max-w-7xl mx-auto space-y-6 scroll-mt-20">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t("yourCareJourneyConnected")}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
              {t("corePurposeStatement")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {journeySteps.map((step, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3 relative"
              >
                <div className="text-2xl font-black text-teal-700/30 font-mono">
                  {step.step}
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                  {t(step.titleKey)}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Rural Support Benefits Section */}
        <section className="px-4 sm:px-8 max-w-7xl mx-auto space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-6">
            <div className="max-w-xl space-y-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {t("ruralSupportSectionTitle")}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                {t("landingHeroDescription")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {ruralBenefits.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                    <div className="p-2.5 rounded-xl bg-teal-100 text-teal-800 shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {t(item.titleKey)}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Important Safety Notice */}
        <section className="px-4 sm:px-8 max-w-7xl mx-auto">
          <div className="p-5 rounded-2xl bg-amber-50/90 dark:bg-amber-900/30 border border-amber-200/80 text-amber-900 flex items-start gap-3.5 shadow-xs">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs sm:text-sm">
              <span className="font-extrabold block">
                {t("safetyNoticeTitle")}
              </span>
              <p className="text-amber-800 font-medium leading-relaxed">
                {t("aiPreliminaryNotice")}
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 dark:text-slate-500 text-xs border-t border-slate-800 py-10 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <span className="font-extrabold text-white text-base block">
              {t("appName")}
            </span>
            <p className="text-slate-400 dark:text-slate-500 text-xs">
              {t("tagline")}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 font-semibold text-slate-300">
            <Link href="/login" className="hover:text-white transition-colors">
              {t("signInTitle")}
            </Link>
            <Link href="/register" className="hover:text-white transition-colors">
              {t("createAccountTitle")}
            </Link>
            <Link href="/patient/dashboard" className="hover:text-white transition-colors">
              {t("patient")}
            </Link>
            <Link href="/hw/dashboard" className="hover:text-white transition-colors">
              {t("healthWorker")}
            </Link>
            <Link href="/doctor/dashboard" className="hover:text-white transition-colors">
              {t("doctor")}
            </Link>
            <Link href="/facility/dashboard" className="hover:text-white transition-colors">
              {t("healthcareFacility")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
