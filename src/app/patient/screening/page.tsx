"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { DisclaimerCard } from "@/components/shared/DisclaimerCard";
import { useLanguage } from "@/lib/i18n/languageContext";
import { useAppState } from "@/lib/store/AppStateProvider";
import { loadOwnPatient } from "@/lib/api/ownPatient";
import { encountersApi } from "@/lib/api/client";
import type { ScreeningOut, VitalOut } from "@/lib/api/types";
import { matchReferralFacility } from "@/lib/referralMatching";
import { assessMaternalRisk } from "@/lib/symptoms/assessRisk";
import { isUnspecifiedDuration } from "@/lib/symptoms/duration";
import {
  Building2,
  Share2,
  PhoneCall,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

function ScreeningContent() {
  const { t } = useLanguage();
  const { screeningResult } = useAppState();
  const searchParams = useSearchParams();

  // Real screenings recorded for this patient by a health worker (GET is
  // allowed for PATIENT role — writes are not, screenings are recorded on
  // the hw/screening page). Falls back to the mock demo result if the
  // backend has no screenings yet for this patient/account.
  const [latestScreening, setLatestScreening] = useState<ScreeningOut | null>(null);
  const [latestVital, setLatestVital] = useState<VitalOut | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await loadOwnPatient();
        if (!me || cancelled) return;
        const encounters = await encountersApi.list(me.id);
        if (cancelled || encounters.length === 0) return;
        // Most recent encounter first.
        const sorted = [...encounters].sort(
          (a, b) => new Date(b.encounter_date).getTime() - new Date(a.encounter_date).getTime()
        );
        for (const enc of sorted) {
          const [screenings, vitals] = await Promise.all([
            encountersApi.listScreenings(enc.id),
            encountersApi.listVitals(enc.id),
          ]);
          if (screenings.length > 0) {
            if (!cancelled) {
              setLatestScreening(screenings[screenings.length - 1]);
              setLatestVital(vitals[vitals.length - 1] || null);
            }
            break;
          }
        }
      } catch (err) {
        console.warn("patient/screening: failed to load real screening data", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const queryRisk = searchParams.get("risk");
  const queryBp = searchParams.get("bp");
  const queryWeek = searchParams.get("week");
  const queryDuration = searchParams.get("duration") || "";
  const queryNotes = searchParams.get("notes") || "";
  const fromThisCheck = Boolean(queryRisk && queryBp);

  const [sys, dia] = (queryBp || screeningResult.bp || "120/80")
    .split("/")
    .map((v) => parseInt(v.trim(), 10));

  const thisCheck = assessMaternalRisk({
    systolicBp: sys,
    diastolicBp: dia,
    headache: searchParams.get("headache") === "yes",
    blurredVision: searchParams.get("vision") === "yes",
    swelling: searchParams.get("swelling") === "yes",
    bleeding: searchParams.get("bleeding") === "yes",
    abdominalPain: searchParams.get("abdominal") === "yes",
    fever: searchParams.get("fever") === "yes",
    reducedFetalMovement: searchParams.get("fetal") === "yes",
  });

  const risk = fromThisCheck
    ? thisCheck.riskLevel
    : latestScreening?.risk_level === "HIGH"
      ? "High Risk"
      : latestScreening?.risk_level === "MEDIUM"
        ? "Watch / Moderate"
        : latestScreening?.risk_level === "LOW"
          ? "Low Risk"
          : searchParams.get("risk") || screeningResult.risk || "Low Risk";

  const bp = fromThisCheck
    ? queryBp || screeningResult.bp
    : latestVital?.systolic_bp && latestVital?.diastolic_bp
      ? `${latestVital.systolic_bp}/${latestVital.diastolic_bp}`
      : queryBp || screeningResult.bp || "120/80";
  const week = queryWeek || screeningResult.week || "28";

  const liveMatch = matchReferralFacility({
    riskLevel: risk,
    systolicBp: sys,
    diastolicBp: dia,
    symptoms: [
      thisCheck.flags.headache ? "Headache" : "",
      thisCheck.flags.blurredVision ? "Blurred vision" : "",
      thisCheck.flags.swelling ? "Swelling" : "",
      thisCheck.flags.bleeding ? "Bleeding" : "",
    ].filter(Boolean),
    carePathway: "Maternal Care",
  });

  const matchedFacility = fromThisCheck ? liveMatch.facility : screeningResult.matchedFacility;
  const matchReason = fromThisCheck ? liveMatch.matchReason : screeningResult.matchReason;

  const reasons = fromThisCheck
    ? [
        `${t("bloodPressureReading")}: ${bp} mmHg (${t("pregnancyWeek")} ${week})${
          thisCheck.highBp ? "" : ` — ${t("bpWithinNormalRange")}`
        }`,
        thisCheck.highBp ? t("highBpDetected") : null,
        thisCheck.flags.headache ? t("persistentHeadache") : null,
        thisCheck.flags.blurredVision ? t("blurredVision") : null,
        thisCheck.flags.swelling ? t("swellingFaceHandsFeet") : null,
        thisCheck.flags.bleeding ? t("vaginalBleedingDischarge") : null,
        thisCheck.flags.abdominalPain ? t("severeAbdominalPain") : null,
        thisCheck.flags.reducedFetalMovement ? t("reducedFetalMovement") : null,
        queryDuration && !isUnspecifiedDuration(queryDuration)
          ? `${t("durationLabel")}: ${queryDuration}`
          : null,
        queryNotes ? queryNotes : null,
      ].filter((item): item is string => Boolean(item))
    : latestScreening
      ? (latestScreening.result || "").split(";").map((s) => s.trim()).filter(Boolean)
      : [
          `${t("bloodPressureReading")}: ${bp} mmHg (${t("pregnancyWeek")} ${week})`,
          t("persistentHeadache"),
          t("swellingFaceHandsFeet"),
        ];

  if (fromThisCheck && risk === "Low Risk") {
    reasons.push(t("noSevereDangerSigns"));
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="preliminaryHealthCheckTitle"
        subtitle="initialAssessmentSubtitle"
        roleBadge={<RoleBadge role="Patient" />}
      />

      <DisclaimerCard
        text={t("screeningDisclaimer")}
        variant="amber"
      />

      {/* Main Screening Risk Result Box */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              {t("resultLabel")}
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {t("carePriorityCategory")}
            </h2>
          </div>
          <StatusBadge status={risk} className="text-sm px-3 py-1" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            {t("keyHealthIndicatorsNoted")}
          </span>
          <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
            {reasons.map((r, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="font-semibold">{r}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Action & Smart Facility Match Summary */}
        <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-900/30 border border-teal-200 text-teal-950 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-700 shrink-0" />
            <span className="text-xs font-extrabold uppercase tracking-wide text-teal-900">
              {t("suggestedFacilityRules")}:
            </span>
          </div>

          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-teal-200/80 space-y-1 text-xs">
            <span className="font-extrabold text-sm text-slate-900 dark:text-white block">
              {matchedFacility.name.includes("District") ? t("districtHospitalName") : matchedFacility.name} ({matchedFacility.distance})
            </span>
            <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
              {matchReason}
            </p>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/patient/facilities"
            className="p-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 shadow-xs"
          >
            <Building2 className="w-4 h-4" />
            <span>{t("viewNearbyFacilities")}</span>
          </Link>

          <Link
            href="/patient/referrals"
            className="p-3.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 shadow-xs"
          >
            <Share2 className="w-4 h-4" />
            <span>{t("requestReferral")}</span>
          </Link>

          <Link
            href="/patient/emergency-help"
            className="p-3.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 shadow-xs"
          >
            <PhoneCall className="w-4 h-4" />
            <span>{t("callASHA")}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PatientScreeningPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold">Loading...</div>}>
      <ScreeningContent />
    </Suspense>
  );
}
