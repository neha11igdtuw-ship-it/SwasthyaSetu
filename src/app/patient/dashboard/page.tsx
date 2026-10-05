"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  appointmentsApi,
  careGapsApi,
  facilitiesApi,
  referralsApi,
  getCurrentUserId,
} from "@/lib/api/client";
import { loadOwnPatient } from "@/lib/api/ownPatient";
import { db, type PatientCareCacheRecord } from "@/lib/offline/db";
import { isMaternalCarePathway } from "@/lib/carePathway";
import type { CareGapOut, PatientOut, ReferralOut } from "@/lib/api/types";
import { PatientHeader } from "@/components/patient/PatientHeader";
import { LastSyncedBadge } from "@/components/patient/LastSyncedBadge";
import { CareStatusCard } from "@/components/care/CareStatusCard";
import { NextActionCard } from "@/components/care/NextActionCard";
import { ReferralStatusStepper } from "@/components/care/ReferralStatusStepper";
import { QuickActionCard } from "@/components/patient/QuickActionCard";
import { EmergencyHelpCard, GeneralEmergencyHelpCard } from "@/components/patient/EmergencyHelpCard";
import { QueueCard } from "@/components/patient/QueueCard";
import { useLanguage } from "@/lib/i18n/languageContext";
import { stepsFromReferralStatus, currentStepLabel } from "@/lib/referral/stepper";
import { Loader2 } from "lucide-react";
import {
  Mic,
  Calendar,
  Upload,
  Share2,
  Stethoscope,
  Pill,
  AlertOctagon,
  Share2 as ShareIcon,
  Sparkles,
  Bot,
} from "lucide-react";

export default function PatientDashboardPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<PatientOut | null>(null);
  const [referrals, setReferrals] = useState<ReferralOut[]>([]);
  const [careGaps, setCareGaps] = useState<CareGapOut[]>([]);
  // No facility is assumed until this patient actually has an active
  // referral that points to one — never a hardcoded maternal facility.
  const [facilityName, setFacilityName] = useState<string | null>(null);
  const [nextVisit, setNextVisit] = useState<string | null>(null);
  const [careInfoUpdatedAt, setCareInfoUpdatedAt] = useState<string | null>(null);
  const [showingSavedCareInfo, setShowingSavedCareInfo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const userId = getCurrentUserId();
      let savedCareInfo: PatientCareCacheRecord | undefined;
      try {
        if (userId) {
          try {
            savedCareInfo = await db.patientCareCache.get(userId);
          } catch (cacheError) {
            console.warn("Could not read the saved care plan on this device:", cacheError);
          }
          if (savedCareInfo && !cancelled) {
            setPatient(savedCareInfo.patient);
            setReferrals(savedCareInfo.referrals);
            setCareGaps(savedCareInfo.careGaps);
            setFacilityName(savedCareInfo.facilityName);
            setNextVisit(savedCareInfo.nextVisit);
            setCareInfoUpdatedAt(savedCareInfo.cachedAt);
            setShowingSavedCareInfo(typeof navigator !== "undefined" && !navigator.onLine);
            setLoading(false);
          }
        }

        if (typeof navigator !== "undefined" && !navigator.onLine) {
          if (!savedCareInfo && !cancelled) setError("careInformationUnavailable");
          return;
        }

        const me = await loadOwnPatient();
        if (cancelled) return;
        if (!me) {
          if (savedCareInfo) {
            setShowingSavedCareInfo(true);
            setError(null);
          } else {
            setError("No patient record is linked to this login yet.");
          }
          return;
        }
        const [refs, gaps, appointments] = await Promise.all([
          referralsApi.list(me.id),
          careGapsApi.listForPatient(me.id).catch(() => []),
          appointmentsApi.list(me.id).catch(() => []),
        ]);
        if (cancelled) return;
        const currentReferrals = refs.filter((r) => r.status !== "CANCELLED" && r.status !== "REJECTED");
        const currentCareGaps = gaps.filter((g) => g.status === "OPEN");
        const active = currentReferrals[0];
        let currentFacilityName: string | null = null;
        if (active?.to_facility_id) {
          const fac = await facilitiesApi.get(active.to_facility_id).catch(() => null);
          if (fac) currentFacilityName = fac.name;
        }
        const upcoming = appointments.find((a) => a.status === "SCHEDULED");
        const currentNextVisit = upcoming ? new Date(upcoming.scheduled_at).toLocaleString() : null;
        if (cancelled) return;

        setPatient(me);
        setReferrals(currentReferrals);
        setCareGaps(currentCareGaps);
        setFacilityName(currentFacilityName);
        setNextVisit(currentNextVisit);
        setError(null);
        setShowingSavedCareInfo(false);
        const cachedAt = new Date().toISOString();
        setCareInfoUpdatedAt(cachedAt);
        if (userId) {
          try {
            await db.patientCareCache.put({
              id: userId,
              cachedAt,
              patient: me,
              referrals: currentReferrals,
              careGaps: currentCareGaps,
              facilityName: currentFacilityName,
              nextVisit: currentNextVisit,
            });
          } catch (cacheError) {
            console.warn("Could not save the latest care plan on this device:", cacheError);
          }
        }
      } catch (err) {
        if (!cancelled) {
          if (savedCareInfo) {
            setShowingSavedCareInfo(true);
            setError(null);
          } else {
            setError(err instanceof Error ? err.message : "Could not load dashboard.");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeReferral = referrals[0];
  const stepStatus = activeReferral ? currentStepLabel(activeReferral.status) : "Created";
  const carePathSteps: { label: string; status: "completed" | "current" | "pending" }[] = [
    { label: "1. Symptoms", status: "completed" },
    { label: "2. Health Check", status: "completed" },
    { label: "3. Facility Match", status: "completed" },
    { label: "4. Referral", status: activeReferral ? "completed" : "pending" },
    { label: "5. Medicines", status: "pending" },
    { label: "6. Follow-up", status: "pending" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 gap-2 text-sm">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading your care record…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error === "careInformationUnavailable" ? t(error) : error}
        </div>
      )}

      {showingSavedCareInfo && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <span className="text-sm font-semibold">{t("lastUpdated")}: {careInfoUpdatedAt ? new Date(careInfoUpdatedAt).toLocaleString() : "—"}</span>
        </div>
      )}

      <div className="space-y-3" data-tour="dashboard-header">
        <PatientHeader
          name={patient?.full_name || "Your account"}
          location={patient?.village || "Location not set"}
          language={patient?.preferred_language || "—"}
          // Pregnancy info only for patients whose persisted care pathway is maternal.
          pregnancyWeek={
            isMaternalCarePathway(patient?.care_pathway)
              ? (patient?.pregnancy_week ?? undefined)
              : undefined
          }
        />
        <div className="flex justify-end">
          <LastSyncedBadge
            lastSyncedText={
              showingSavedCareInfo
                ? `${t("lastUpdated")}: ${careInfoUpdatedAt ? new Date(careInfoUpdatedAt).toLocaleString() : "—"}`
                : t("latestInfoReceived")
            }
          />
        </div>
      </div>

      <div data-tour="care-journey" className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border-2 border-teal-500/80 shadow-md space-y-6 ring-1 ring-teal-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-700 text-white flex items-center justify-center font-extrabold shadow-xs">
              <ShareIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-800 block">
                {t("yourCareJourneyConnected")}
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {t("careJourneyHeader")}
              </h2>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-100 text-teal-900 border border-teal-200">
            Active Care Request: {activeReferral ? stepStatus : "None yet"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {carePathSteps.map((st, i) => (
            <div
              key={i}
              className={`p-2.5 rounded-xl border text-center text-xs font-bold ${
                st.status === "completed"
                  ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 text-emerald-900"
                  : st.status === "current"
                  ? "bg-teal-700 text-white border-teal-800 shadow-xs"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 font-medium"
              }`}
            >
              <span>{st.label}</span>
            </div>
          ))}
        </div>

        <div className="pt-2 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Hospital Transfer Stepper{facilityName ? ` (${facilityName})` : ""}:
            </span>
            <Link href="/patient/referrals" className="text-teal-700 font-extrabold hover:underline">
              View Care Request Details
            </Link>
          </div>
          <ReferralStatusStepper
            steps={
              activeReferral
                ? stepsFromReferralStatus(activeReferral.status)
                : stepsFromReferralStatus("CREATED")
            }
          />
        </div>
      </div>

      <QueueCard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CareStatusCard
          label={patient?.care_pathway || "General Primary Care"}
          riskStatus={careGaps.length > 0 ? "Watch / Moderate" : "Low Risk"}
          reasons={
            careGaps.length
              ? careGaps.map((g) => g.description || g.gap_type)
              : ["No open care gaps yet. A health worker can add screening and vitals."]
          }
          disclaimer={t("aiPreliminaryNotice")}
        />

        <NextActionCard
          recommendedAction={
            nextVisit
              ? `Next visit: ${nextVisit}`
              : activeReferral
              ? `Visit ${facilityName || "your referred facility"} for a specialist checkup`
              : "Ask your health worker to complete a health check"
          }
          recommendedFacility={facilityName || "No facility recommended yet"}
          facilityType={activeReferral ? "Referred Facility" : "Not assigned yet"}
          distance={activeReferral ? "" : "—"}
          availableServices={[]}
          doctorAvailability={activeReferral ? "Contact facility for availability" : "Not scheduled yet"}
          lastUpdated="Live"
          isLive={true}
        />
      </div>

      <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-bold border border-amber-300/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t("voiceAssistance")}</span>
          </div>
          <h3 className="text-base font-extrabold text-white">{t("speakInYourLanguage")}</h3>
          <p className="text-xs text-teal-100">{t("voicePromptExample")}</p>
        </div>
        <Link
          href="/patient/voice-assistant"
          className="px-5 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-extrabold text-xs transition-colors shrink-0 shadow-sm"
        >
          {t("askVoiceAssistant")}
        </Link>
      </div>

      <div className="space-y-3">
        <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
          {t("quickActionsHeading")}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <QuickActionCard title={t("voiceAssistance")} subtitle={t("askVoiceAssistant")} href="/patient/voice-assistant" icon={Mic} badgeText="Voice" accentColor="amber" />
          <QuickActionCard title={t("aiHealthAssistant")} subtitle={t("aiHealthAssistantTile")} href="/patient/ai-assistant" icon={Bot} badgeText="AI" accentColor="indigo" />
          <QuickActionCard title={t("bookAppointment")} subtitle={t("scheduleDoctorVisit")} href="/patient/appointments" icon={Calendar} accentColor="teal" />
          <QuickActionCard title={t("uploadReport")} subtitle={t("scanLabTestsOrAncCard")} href="/patient/documents" icon={Upload} accentColor="indigo" />
          <QuickActionCard title={t("viewCareRequest")} subtitle={t("checkHospitalProgress")} href="/patient/referrals" icon={Share2} accentColor="teal" />
          <QuickActionCard title={t("viewLabTests")} subtitle={t("recommendedHealthTests")} href="/patient/diagnostics" icon={Stethoscope} accentColor="teal" />
          <QuickActionCard title={t("viewMedicines")} subtitle={t("dosageAndNearbyStock")} href="/patient/medicines" icon={Pill} accentColor="teal" />
          <QuickActionCard title={t("emergencyHelp")} subtitle={t("immediateHighRiskAlert")} href="/patient/emergency-help" icon={AlertOctagon} badgeText={t("highRisk")} accentColor="rose" />
        </div>
      </div>

      {isMaternalCarePathway(patient?.care_pathway) ? (
        <EmergencyHelpCard emergencyContact={patient?.emergency_contact || null} />
      ) : (
        <GeneralEmergencyHelpCard emergencyContact={patient?.emergency_contact || null} />
      )}
    </div>
  );
}
