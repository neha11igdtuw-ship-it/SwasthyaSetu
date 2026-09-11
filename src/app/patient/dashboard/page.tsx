"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { priyaPatientMock } from "@/lib/mockData";
import { patientsApi, referralsApi, careGapsApi } from "@/lib/api/client";
import type { PatientOut, ReferralOut, CareGapOut } from "@/lib/api/types";
import { PatientHeader } from "@/components/patient/PatientHeader";
import { LastSyncedBadge } from "@/components/patient/LastSyncedBadge";
import { CareStatusCard } from "@/components/care/CareStatusCard";
import { NextActionCard } from "@/components/care/NextActionCard";
import { ReferralStatusStepper } from "@/components/care/ReferralStatusStepper";
import { FollowUpCard } from "@/components/care/FollowUpCard";
import { QuickActionCard } from "@/components/patient/QuickActionCard";
import { EmergencyHelpCard } from "@/components/patient/EmergencyHelpCard";
import { useLanguage } from "@/lib/i18n/languageContext";
import { useAppState } from "@/lib/store/AppStateProvider";
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
} from "lucide-react";

export default function PatientDashboardPage() {
  const p = priyaPatientMock;
  const { t } = useLanguage();
  const {
    patientReferral,
    screeningResult,
    followUps,
    markFollowUpCompleted,
    lastSyncedTime,
  } = useAppState();

  const matchedFac = screeningResult.matchedFacility;

  // Real backend-derived data for the logged-in patient (RBAC auto-scoped to
  // this patient's own record server-side). The rest of the dashboard
  // (matched facility, follow-ups, care journey visuals) still comes from the
  // mock AppStateProvider since the backend has no risk-scoring/matching
  // fields yet — same pattern used on hw/dashboard.
  const [realPatient, setRealPatient] = useState<PatientOut | null>(null);
  const [realReferrals, setRealReferrals] = useState<ReferralOut[]>([]);
  const [realOpenCareGaps, setRealOpenCareGaps] = useState<CareGapOut[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const patients = await patientsApi.list();
        if (cancelled) return;
        const me = patients[0] || null;
        setRealPatient(me);
        if (me) {
          const [referrals, careGaps] = await Promise.all([
            referralsApi.list(me.id),
            careGapsApi.listForPatient(me.id).catch(() => []),
          ]);
          if (cancelled) return;
          setRealReferrals(referrals);
          setRealOpenCareGaps(careGaps.filter((g) => g.status === "OPEN"));
        }
      } catch (err) {
        console.warn("patient dashboard: failed to load real backend data", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 6-step compact care path
  const carePathSteps = [
    { label: "1. Symptoms", status: "completed" },
    { label: "2. Health Check", status: "completed" },
    { label: "3. Facility Match", status: "completed" },
    { label: "4. Referral", status: patientReferral.currentStep !== "Created" ? "completed" : "current" },
    { label: "5. Medicines", status: "pending" },
    { label: "6. Follow-up", status: "pending" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Patient Header & Offline Badge */}
      <div className="space-y-3">
        <PatientHeader
          name={p.profile.name}
          location={p.profile.location}
          language={p.profile.selectedLanguage}
          pregnancyWeek={p.profile.pregnancyWeek}
        />
        <div className="flex justify-end">
          <LastSyncedBadge lastSyncedText={lastSyncedTime || "Saved on device"} />
        </div>
      </div>

      {/* 1. CENTERPIECE — YOUR CARE JOURNEY FIRST */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border-2 border-teal-500/80 shadow-md space-y-6 ring-1 ring-teal-500/20">
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
            Active Care Request: {patientReferral.currentStep}
          </span>
        </div>

        {/* Compact 6-step Care Path overview */}
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

        {/* Detailed Stepper for active Referral */}
        <div className="pt-2 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">Hospital Transfer Stepper ({patientReferral.facilityName}):</span>
            <Link href="/patient/referrals" className="text-teal-700 font-extrabold hover:underline flex items-center gap-1">
              <span>View Care Request Details</span>
            </Link>
          </div>
          <ReferralStatusStepper steps={patientReferral.steps} />
        </div>
      </div>

      {/* Real backend data (RBAC-scoped to the logged-in patient) */}
      {realPatient && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-sm">
          <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">
            Live Account Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="block text-slate-500 dark:text-slate-400 text-xs">Registered Name</span>
              <span className="font-bold text-slate-900 dark:text-white">{realPatient.full_name}</span>
            </div>
            <div>
              <span className="block text-slate-500 dark:text-slate-400 text-xs">Active Referrals</span>
              <span className="font-bold text-slate-900 dark:text-white">{realReferrals.length}</span>
            </div>
            <div>
              <span className="block text-slate-500 dark:text-slate-400 text-xs">Open Care Gaps</span>
              <span className="font-bold text-slate-900 dark:text-white">{realOpenCareGaps.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Care Status & Next Action (Matched Facility) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CareStatusCard
          label={p.careStatus.label}
          riskStatus={p.careStatus.riskStatus}
          reasons={p.careStatus.reasons}
          disclaimer={p.careStatus.disclaimer}
        />

        <NextActionCard
          recommendedAction={p.nextAction.recommendedAction}
          recommendedFacility={matchedFac.name}
          facilityType={matchedFac.type}
          distance={matchedFac.distance}
          availableServices={matchedFac.availableServices}
          doctorAvailability={matchedFac.doctorAvailability}
          lastUpdated={matchedFac.lastUpdated}
          isLive={true}
        />
      </div>

      {/* Compact Voice Assistant Hero Banner */}
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

      {/* Quick Actions Grid */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
          {t("quickActionsHeading")}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title={t("voiceAssistance")}
            subtitle={t("askVoiceAssistant")}
            href="/patient/voice-assistant"
            icon={Mic}
            badgeText="Voice"
            accentColor="amber"
          />
          <QuickActionCard
            title={t("bookAppointment")}
            subtitle={t("scheduleDoctorVisit")}
            href="/patient/appointments"
            icon={Calendar}
            accentColor="teal"
          />
          <QuickActionCard
            title={t("uploadReport")}
            subtitle={t("scanLabTestsOrAncCard")}
            href="/patient/documents"
            icon={Upload}
            accentColor="indigo"
          />
          <QuickActionCard
            title={t("viewCareRequest")}
            subtitle={t("checkHospitalProgress")}
            href="/patient/referrals"
            icon={Share2}
            accentColor="teal"
          />
          <QuickActionCard
            title={t("viewLabTests")}
            subtitle={t("recommendedHealthTests")}
            href="/patient/diagnostics"
            icon={Stethoscope}
            accentColor="teal"
          />
          <QuickActionCard
            title={t("viewMedicines")}
            subtitle={t("dosageAndNearbyStock")}
            href="/patient/medicines"
            icon={Pill}
            accentColor="teal"
          />
          <QuickActionCard
            title={t("emergencyHelp")}
            subtitle={t("immediateHighRiskAlert")}
            href="/patient/emergency-help"
            icon={AlertOctagon}
            badgeText={t("highRisk")}
            accentColor="rose"
          />
        </div>
      </div>

      {/* Upcoming Follow-up Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
          {t("upcomingFollowUpPriority")}
        </h3>
        <FollowUpCard item={followUps[0]} onMarkCompleted={markFollowUpCompleted} />
      </div>

      {/* Emergency Help Protocol Banner */}
      <EmergencyHelpCard ashaPhone={p.profile.assignedASHAPhone} />
    </div>
  );
}
