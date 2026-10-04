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
import type { ScreeningOut, VitalOut, PatientOut } from "@/lib/api/types";
import { matchReferralFacility } from "@/lib/referralMatching";
import { assessMaternalRisk } from "@/lib/symptoms/assessRisk";
import { isUnspecifiedDuration } from "@/lib/symptoms/duration";
import { isMaternalCarePathway } from "@/lib/carePathway";
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

  // The AUTHENTICATED patient's own record. Used to (a) load THIS
  // patient's real screenings/vitals, isolated from every other account,
  // and (b) gate pregnancy-specific wording to the maternal-care pathway.
  const [ownPatient, setOwnPatient] = useState<PatientOut | null>(null);
  const [latestScreening, setLatestScreening] = useState<ScreeningOut | null>(null);
  const [latestVital, setLatestVital] = useState<VitalOut | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await loadOwnPatient();
        if (cancelled) return;
        setOwnPatient(me);
        if (!me) return;
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

  const isMaternal = isMaternalCarePathway(ownPatient?.care_pathway);

  const queryRisk = searchParams.get("risk");
  const queryBp = searchParams.get("bp");
  const queryWeek = searchParams.get("week");
  const queryDuration = searchParams.get("duration") || "";
  const queryNotes = searchParams.get("notes") || "";
  const fromThisCheck = Boolean(queryRisk && queryBp);

  // Do we have ANY real result to show — from this submission, from a
  // backend-recorded screening, or from this session's own screening
  // (never from a seeded/demo patient)?
  const hasAnyResult = Boolean(fromThisCheck || latestScreening || screeningResult);

  const [sys, dia] = (queryBp || screeningResult?.bp || "120/80")
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
          : searchParams.get("risk") || screeningResult?.risk || "Low Risk";

  const bp = fromThisCheck
    ? queryBp || screeningResult?.bp
    : latestVital?.systolic_bp && latestVital?.diastolic_bp
      ? `${latestVital.systolic_bp}/${latestVital.diastolic_bp}`
      : queryBp || screeningResult?.bp || "120/80";
  // No fallback pregnancy week — an empty value simply means "not
  // recorded", and pregnancy wording is only shown at all when this
  // patient is actually on the maternal-care pathway (see `isMaternal`).
  const week = queryWeek || screeningResult?.week || "";

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
    carePathway: ownPatient?.care_pathway ?? undefined,
  });

  const matchedFacility = fromThisCheck ? liveMatch.facility : screeningResult?.matchedFacility ?? liveMatch.facility;
  const matchReason = fromThisCheck ? liveMatch.matchReason : screeningResult?.matchReason ?? liveMatch.matchReason;

  const bpWithWeek = isMaternal && week
    ? `${t("bloodPressureReading")}: ${bp} mmHg (${t("pregnancyWeek")} ${week})`
    : `${t("bloodPressureReading")}: ${bp} mmHg`;

  // Detected danger signs from this check. Pregnancy-specific wording and
  // symptoms are only used on the persisted maternal-care pathway.
  const flagReasons = [
    thisCheck.highBp ? t("highBpDetected") : null,
    thisCheck.flags.headache ? t("persistentHeadache") : null,
    thisCheck.flags.blurredVision ? t("blurredVision") : null,
    thisCheck.flags.swelling ? t("swellingFaceHandsFeet") : null,
    thisCheck.flags.bleeding ? (isMaternal ? t("vaginalBleedingDischarge") : "Bleeding") : null,
    thisCheck.flags.abdominalPain ? t("severeAbdominalPain") : null,
    isMaternal && thisCheck.flags.reducedFetalMovement ? t("reducedFetalMovement") : null,
  ].filter((item): item is string => Boolean(item));

  const reasons = fromThisCheck
    ? [
        `${bpWithWeek}${thisCheck.highBp ? "" : ` — ${t("bpWithinNormalRange")}`}`,
        ...flagReasons,
        queryDuration && !isUnspecifiedDuration(queryDuration)
          ? `${t("durationLabel")}: ${queryDuration}`
          : null,
        queryNotes ? queryNotes : null,
      ].filter((item): item is string => Boolean(item))
    : latestScreening
      ? (latestScreening.result || "").split(";").map((s) => s.trim()).filter(Boolean)
      : screeningResult
        ? [bpWithWeek, ...screeningResult.symptoms]
        : [];

  // High-risk symptoms shown prominently: from this check's flags, or from the
  // recorded screening's findings.
  const dangerSigns: string[] =
    risk === "High Risk" ? (fromThisCheck ? flagReasons : reasons) : [];

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

      {!hasAnyResult ? (
        /* Genuinely new/no-screening state — no fabricated risk level,
           BP, or pregnancy week is shown here. This is what every
           brand-new patient sees until they actually complete a symptom
           check or a health worker records one. */
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200/80 dark:border-slate-700 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto">
            <Sparkles className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              {t("noScreeningYetTitle")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {t("noScreeningYetSubtitle")}
            </p>
          </div>
          <Link
            href="/patient/symptoms"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shadow-xs"
          >
            <span>{t("tellSymptomsVoiceTextTitle")}</span>
          </Link>
        </div>
      ) : (
      /* Main Screening Risk Result Box */
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

        {dangerSigns.length > 0 && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border-2 border-rose-400 text-rose-950 dark:text-rose-100 space-y-3"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0" />
              <h3 className="font-extrabold text-sm">
                High-risk signs detected. Get medical help now.
              </h3>
            </div>
            <ul className="space-y-1.5 text-xs font-bold">
              {dangerSigns.map((sign, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
                  <span>{sign}</span>
                </li>
              ))}
            </ul>
            <a
              href="tel:108"
              className="min-h-11 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold"
            >
              <PhoneCall className="w-4 h-4" />
              Call 108 (Ambulance)
            </a>
          </div>
        )}

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
        {matchedFacility && (
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
        )}

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
      )}
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
