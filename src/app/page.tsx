"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { TopBar } from "@/components/TopBar";
import { useLanguage } from "@/lib/i18n/languageContext";
import type { LucideIcon } from "lucide-react";
import {
  Search,
  Calendar,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Mic,
  Stethoscope,
  Languages,
  HeartPulse,
  WifiOff,
  Building2,
  ClipboardList,
  Bell,
  UserRound,
  Hospital,
  CalendarCheck,
  Sprout,
} from "lucide-react";
import { FeedbackFormSection } from "@/components/FeedbackFormSection";

export default function LandingPage() {
  const { t } = useLanguage();

  const quickActionTiles = [
    {
      titleKey: "tellUsProblemTitle",
      descKey: "tellUsProblemDesc",
      icon: Mic,
      color: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800",
      iconBg: "bg-emerald-600 text-white",
      href: "/patient/symptoms",
    },
    {
      titleKey: "findRightCareTitle",
      descKey: "findRightCareDesc",
      icon: Search,
      color: "bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800",
      iconBg: "bg-teal-600 text-white",
      href: "/patient/facilities",
    },
    {
      titleKey: "continueCareTitle",
      descKey: "continueCareDesc",
      icon: Calendar,
      color: "bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800",
      iconBg: "bg-sky-600 text-white",
      href: "/patient/follow-ups",
    },
    {
      titleKey: "getSupportTitle",
      descKey: "getSupportDesc",
      icon: AlertCircle,
      color: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800",
      iconBg: "bg-amber-600 text-white",
      href: "/hw/high-risk",
    },
    {
      titleKey: "tellSymptomsCta",
      descKey: "tellSymptomsTileDesc",
      icon: Mic,
      color: "bg-teal-600 dark:bg-teal-500 border-teal-700 dark:border-teal-400 text-white",
      iconBg: "bg-slate-950 text-teal-300",
      href: "/patient/voice-assistant",
      featured: true,
    },
  ];

  const leftFeatures: FeatureItem[] = [
    {
      titleKey: "speakInLocalLanguage",
      descKey: "featureVoiceBrief",
      icon: Languages,
      href: "/patient/voice-assistant",
    },
    {
      titleKey: "featureWorkerTitle",
      descKey: "featureWorkerBrief",
      icon: HeartPulse,
      href: "/hw/dashboard",
    },
    {
      titleKey: "continueCareWeakInternet",
      descKey: "featureOfflineBrief",
      icon: WifiOff,
      href: "/patient/documents",
    },
  ];

  const rightFeatures: FeatureItem[] = [
    {
      titleKey: "findSuitableFacility",
      descKey: "featureFacilityBrief",
      icon: Building2,
      href: "/patient/facilities",
    },
    {
      titleKey: "featureDoctorTitle",
      descKey: "featureDoctorBrief",
      icon: ClipboardList,
      href: "/doctor/dashboard",
    },
    {
      titleKey: "featureFollowTitle",
      descKey: "featureFollowBrief",
      icon: Bell,
      href: "/patient/follow-ups",
    },
  ];

  const roadmapSteps: RoadmapStep[] = [
    {
      n: 1,
      titleKey: "roadmapStep1Title",
      descKey: "roadmapStep1Desc",
      icon: Mic,
      place: "top",
      accent: "violet",
      featured: true,
    },
    {
      n: 2,
      titleKey: "roadmapStep2Title",
      descKey: "roadmapStep2Desc",
      icon: HeartPulse,
      place: "bottom",
      accent: "orange",
    },
    {
      n: 3,
      titleKey: "roadmapStep3Title",
      descKey: "roadmapStep3Desc",
      icon: Hospital,
      place: "top",
      accent: "navy",
    },
    {
      n: 4,
      titleKey: "roadmapStep4Title",
      descKey: "roadmapStep4Desc",
      icon: CalendarCheck,
      place: "bottom",
      accent: "green",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f6fafa] dark:bg-[#0b1a1f]">
      <TopBar />

      <main className="flex-1 space-y-12 sm:space-y-16 pb-16">
        <section className="pt-8 sm:pt-14 px-4 sm:px-8 max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 text-white rounded-3xl p-6 sm:p-12 shadow-xl">
            <div className="max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-100 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-teal-300" />
                <span>{t("corePurposeStatement")}</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight text-white">
                {t("heroHeadline")}
              </h1>

              <p className="text-sm sm:text-base text-teal-50 font-normal leading-relaxed">
                {t("heroDescription")}
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Link
                  href="/login"
                  className="px-6 py-3.5 rounded-2xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-extrabold text-sm transition-colors text-center shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{t("getStarted")}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href="#care-journey"
                  className="px-6 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm transition-colors text-center border border-white/25 cursor-pointer"
                >
                  {t("seeHowItWorks")}
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-8 max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {quickActionTiles.map((tile) => {
              const Icon = tile.icon;
              const featured = "featured" in tile && tile.featured;

              return (
                <Link
                  key={tile.titleKey}
                  href={tile.href}
                  className={`p-5 rounded-2xl border transition-all shadow-xs hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between space-y-4 min-w-0 cursor-pointer ${tile.color}`}
                >
                  <div className="space-y-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tile.iconBg}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3
                        className={`font-extrabold text-base tracking-tight ${
                          featured ? "text-white" : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {t(tile.titleKey)}
                      </h3>
                      <p
                        className={`text-xs font-medium leading-relaxed mt-1 ${
                          featured ? "text-teal-50" : "text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {t(tile.descKey)}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`inline-flex items-center text-xs font-bold gap-1 pt-2 border-t ${
                      featured
                        ? "text-white border-white/25"
                        : "text-slate-900 dark:text-white border-slate-200/50 dark:border-slate-600"
                    }`}
                  >
                    <span>{t("viewDetails")}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="px-4 sm:px-8 max-w-7xl mx-auto">
          <div className="relative overflow-hidden rounded-[2rem] border border-teal-100/80 dark:border-teal-800/40 bg-gradient-to-b from-[#f3faf7] via-[#eef8f4] to-[#d7eee4] dark:from-[#082226] dark:via-[#0a2429] dark:to-[#071c1f] px-5 sm:px-8 lg:px-10 pt-8 sm:pt-10 pb-8 sm:pb-9">
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 space-y-2 relative z-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#16384a] dark:text-white tracking-tight">
                {t("ruralSupportSectionTitle")}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                {t("ecosystemSubtitle")}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(280px,380px)_1fr] gap-8 lg:gap-6 xl:gap-10 items-center relative z-10">
              <div className="space-y-2 order-2 lg:order-1">
                {leftFeatures.map((item) => (
                  <FeatureRow
                    key={item.titleKey}
                    href={item.href}
                    icon={item.icon}
                    title={t(item.titleKey)}
                    desc={t(item.descKey)}
                  />
                ))}
              </div>

              <div className="order-1 lg:order-2">
                <EcosystemVisual
                  patientLabel={t("patient")}
                  workerLabel={t("ecosystemNodeWorker")}
                  doctorLabel={t("doctor")}
                  facilityLabel={t("ecosystemNodeFacility")}
                  brandName={t("appName")}
                  tagline={t("continuityInEveryStep")}
                  footer={t("peopleTechCommunities")}
                />
              </div>

              <div className="space-y-2 order-3">
                {rightFeatures.map((item) => (
                  <FeatureRow
                    key={item.titleKey}
                    href={item.href}
                    icon={item.icon}
                    title={t(item.titleKey)}
                    desc={t(item.descKey)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="care-journey" className="px-4 sm:px-8 max-w-7xl mx-auto space-y-10 scroll-mt-20">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t("howItWorksTitle")}
            </h2>
          </div>

          <div className="hidden lg:block relative pt-6 pb-4">
            <svg
              className="absolute left-[9%] right-[9%] top-1/2 h-1 w-[82%] pointer-events-none -translate-y-1/2"
              viewBox="0 0 1000 4"
              fill="none"
              aria-hidden="true"
              preserveAspectRatio="none"
            >
              <line x1="0" y1="2" x2="333" y2="2" stroke="#f59e0b" strokeWidth="4" />
              <line x1="333" y1="2" x2="666" y2="2" stroke="#1e3a8a" strokeWidth="4" />
              <line x1="666" y1="2" x2="1000" y2="2" stroke="#4d7c0f" strokeWidth="4" />
            </svg>

            <div className="grid grid-cols-4 relative">
              {roadmapSteps.map((step) => (
                <RoadmapColumn
                  key={step.n}
                  step={step}
                  title={t(step.titleKey)}
                  desc={t(step.descKey)}
                />
              ))}
            </div>
          </div>

          <div className="lg:hidden space-y-0">
            {roadmapSteps.map((step, idx) => {
              const styles = accentStyles[step.accent];
              const Icon = step.icon;
              return (
                <div key={step.n} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`relative z-10 rounded-full text-white flex items-center justify-center font-black shrink-0 ${styles.circle} ${
                        step.featured
                          ? "w-14 h-14 text-xl ring-[6px] ring-violet-100 dark:ring-violet-500/20 shadow-lg shadow-violet-700/25"
                          : "w-11 h-11 text-base"
                      }`}
                    >
                      {step.n}
                    </div>
                    {idx < roadmapSteps.length - 1 && (
                      <div className={`w-1 flex-1 min-h-10 ${styles.line}`} />
                    )}
                  </div>
                  <div className={`pb-8 ${step.featured ? "pt-0.5" : "pt-1"}`}>
                    <div className="flex items-start gap-2.5">
                      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${styles.icon}`} />
                      <div>
                        <div
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-white text-xs font-extrabold ${styles.circle} ${
                            step.featured ? "text-sm px-3 py-1.5" : ""
                          }`}
                        >
                          {t(step.titleKey)}
                        </div>
                        <p className="mt-2 text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed max-w-sm">
                          {t(step.descKey)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Feedback & Support Section */}
        <section id="feedback-section" className="px-4 sm:px-8 max-w-7xl mx-auto scroll-mt-20">
          <FeedbackFormSection />
        </section>
      </main>

      <footer className="mt-auto bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-10 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <span className="font-extrabold text-white text-base block">{t("appName")}</span>
            <p className="text-slate-400 text-xs">{t("tagline")}</p>
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
            <Link href="/#feedback-section" className="hover:text-white transition-colors">
              {t("feedbackTitle")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

type FeatureItem = {
  titleKey: string;
  descKey: string;
  icon: LucideIcon;
  href: string;
};

type RoadmapAccent = "violet" | "orange" | "navy" | "green";

type RoadmapStep = {
  n: number;
  titleKey: string;
  descKey: string;
  icon: LucideIcon;
  place: "top" | "bottom";
  accent: RoadmapAccent;
  featured?: boolean;
};

const accentStyles: Record<
  RoadmapAccent,
  { circle: string; line: string; icon: string; stem: string }
> = {
  violet: {
    circle: "bg-[#6d28d9]",
    line: "bg-[#f59e0b]",
    icon: "text-[#6d28d9] dark:text-violet-300",
    stem: "bg-[#6d28d9]",
  },
  orange: {
    circle: "bg-[#ea580c]",
    line: "bg-[#1e3a8a]",
    icon: "text-[#ea580c] dark:text-orange-300",
    stem: "bg-[#ea580c]",
  },
  navy: {
    circle: "bg-[#1e3a8a]",
    line: "bg-[#4d7c0f]",
    icon: "text-[#1e3a8a] dark:text-sky-300",
    stem: "bg-[#1e3a8a]",
  },
  green: {
    circle: "bg-[#3f6212]",
    line: "bg-[#3f6212]",
    icon: "text-[#3f6212] dark:text-lime-300",
    stem: "bg-[#3f6212]",
  },
};

function FeatureRow({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3.5 rounded-2xl p-3 -mx-1 hover:bg-white/70 dark:hover:bg-teal-950/50 transition-colors cursor-pointer"
    >
      <div className="w-11 h-11 rounded-xl bg-white dark:bg-[#123038] border border-teal-100 dark:border-teal-700/50 shadow-sm flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-teal-700 dark:text-teal-300" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 pt-0.5">
        <h3 className="font-bold text-sm text-slate-800 dark:text-white tracking-tight group-hover:text-teal-800 dark:group-hover:text-teal-200">
          {title}
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{desc}</p>
      </div>
    </Link>
  );
}

function EcosystemVisual({
  patientLabel,
  workerLabel,
  doctorLabel,
  facilityLabel,
  brandName,
  tagline,
  footer,
}: {
  patientLabel: string;
  workerLabel: string;
  doctorLabel: string;
  facilityLabel: string;
  brandName: string;
  tagline: string;
  footer: string;
}) {
  return (
    <div className="relative mx-auto w-full max-w-[380px] aspect-square">
      <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
        <svg
          viewBox="0 0 380 380"
          className="absolute inset-0 w-full h-full dark:hidden"
          aria-hidden="true"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="ecoSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f7fcfa" />
              <stop offset="55%" stopColor="#eaf6f1" />
              <stop offset="100%" stopColor="#d4ebdf" />
            </linearGradient>
          </defs>
          <rect width="380" height="380" fill="url(#ecoSky)" />
          <path
            d="M0 292 C 48 268, 78 304, 128 286 C 176 270, 198 304, 248 288 C 292 274, 330 298, 380 276 V 380 H 0 Z"
            fill="#c8e6d6"
          />
          <path
            d="M0 322 C 70 298, 120 336, 190 314 C 250 296, 300 328, 380 308 V 380 H 0 Z"
            fill="#b4dcc8"
          />
          <g fill="#8fbfa3">
            <rect x="42" y="318" width="18" height="14" rx="1" />
            <polygon points="42,318 51,308 60,318" />
            <rect x="318" y="312" width="16" height="12" rx="1" />
            <polygon points="318,312 326,303 334,312" />
          </g>
        </svg>
        <svg
          viewBox="0 0 380 380"
          className="absolute inset-0 w-full h-full hidden dark:block"
          aria-hidden="true"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="ecoSkyDark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0c2a30" />
              <stop offset="55%" stopColor="#0a2429" />
              <stop offset="100%" stopColor="#08201c" />
            </linearGradient>
          </defs>
          <rect width="380" height="380" fill="url(#ecoSkyDark)" />
          <path
            d="M0 292 C 48 268, 78 304, 128 286 C 176 270, 198 304, 248 288 C 292 274, 330 298, 380 276 V 380 H 0 Z"
            fill="#134037"
          />
          <path
            d="M0 322 C 70 298, 120 336, 190 314 C 250 296, 300 328, 380 308 V 380 H 0 Z"
            fill="#0f3530"
          />
          <g fill="#1d5a4e">
            <rect x="42" y="318" width="18" height="14" rx="1" />
            <polygon points="42,318 51,308 60,318" />
            <rect x="318" y="312" width="16" height="12" rx="1" />
            <polygon points="318,312 326,303 334,312" />
          </g>
        </svg>
      </div>

      <div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 w-[58%] aspect-square rounded-full border-[1.5px] border-dashed border-teal-400/70 dark:border-teal-500/40 pointer-events-none" />

      <div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center text-center w-[42%]">
        <div className="w-full aspect-square rounded-full bg-white dark:bg-[#102830] shadow-[0_10px_30px_rgba(15,70,70,0.12)] dark:shadow-[0_10px_28px_rgba(0,0,0,0.35)] border border-teal-100 dark:border-teal-700/50 overflow-hidden flex items-center justify-center p-[8%]">
          <Image
            src="/logo.jpg"
            alt={brandName}
            width={160}
            height={160}
            className="w-[120%] h-[120%] max-w-none object-contain"
            priority
          />
        </div>
        <p className="mt-2 text-[10px] sm:text-[11px] font-semibold text-teal-800/80 dark:text-teal-200/80 tracking-wide">
          {tagline}
        </p>
      </div>

      <EcosystemNode
        className="absolute left-[2%] top-[8%]"
        icon={UserRound}
        label={patientLabel}
        align="left"
      />
      <EcosystemNode
        className="absolute right-[2%] top-[8%]"
        icon={HeartPulse}
        label={workerLabel}
        align="right"
      />
      <EcosystemNode
        className="absolute left-[2%] top-[58%]"
        icon={Stethoscope}
        label={doctorLabel}
        align="left"
      />
      <EcosystemNode
        className="absolute right-[2%] top-[58%]"
        icon={Building2}
        label={facilityLabel}
        align="right"
      />

      <div className="absolute left-1/2 top-[71%] -translate-x-1/2 z-10 text-teal-600 dark:text-teal-400">
        <Sprout className="w-4 h-4" strokeWidth={1.75} />
      </div>

      <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] sm:text-[11px] font-semibold tracking-wide text-teal-800/80 dark:text-teal-200/80">
        {footer}
      </p>
    </div>
  );
}

function EcosystemNode({
  className,
  icon: Icon,
  label,
  align,
}: {
  className: string;
  icon: LucideIcon;
  label: string;
  align: "left" | "right";
}) {
  return (
    <div className={`z-20 flex flex-col items-center gap-1.5 w-[30%] ${className}`}>
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white dark:bg-[#123038] border border-teal-100 dark:border-teal-700/60 shadow-md flex items-center justify-center">
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-teal-700 dark:text-teal-300" strokeWidth={1.7} />
      </div>
      <p
        className={`text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-100 leading-tight ${
          align === "left" ? "text-left" : "text-right"
        }`}
      >
        {label}
      </p>
    </div>
  );
}

function RoadmapColumn({
  step,
  title,
  desc,
}: {
  step: RoadmapStep;
  title: string;
  desc: string;
}) {
  const styles = accentStyles[step.accent];
  const Icon = step.icon;

  const card = (
    <div className="text-left max-w-[200px] mx-auto space-y-2">
      <div className={`px-4 py-2 rounded-lg text-white font-extrabold text-sm shadow-sm ${styles.circle}`}>
        {title}
      </div>
      <div className="flex items-start gap-1.5 pl-1">
        <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${styles.circle}`} aria-hidden="true" />
        <p className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed">{desc}</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center">
      <div className="min-h-[132px] flex flex-col items-center justify-end pb-2">
        {step.place === "top" ? (
          <>
            {card}
            <div className={`w-[2px] h-6 mt-2 ${styles.stem}`} />
          </>
        ) : (
          <Icon className={`w-6 h-6 ${styles.icon}`} aria-hidden="true" />
        )}
      </div>
      <div
        className={`relative z-10 rounded-full bg-white dark:bg-slate-900 border-4 flex items-center justify-center font-black ${styles.icon} ${
          step.featured ? "w-16 h-16 text-2xl shadow-lg shadow-violet-800/20" : "w-14 h-14 text-xl shadow-md"
        }`}
        style={{ borderColor: "currentColor" }}
      >
        {step.n}
      </div>
      <div className="min-h-[132px] flex flex-col items-center justify-start pt-2">
        {step.place === "bottom" ? (
          <>
            <div className={`w-[2px] h-6 mb-2 ${styles.stem}`} />
            {card}
          </>
        ) : (
          <Icon className={`w-6 h-6 ${styles.icon}`} aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
