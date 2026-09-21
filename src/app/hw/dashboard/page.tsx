"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { DashboardCard } from "@/components/DashboardCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import { useAppState } from "@/lib/store/AppStateProvider";
import { derivePatientGaps } from "@/lib/careGaps";
import { patientsApi, referralsApi, careGapsApi, facilitiesApi } from "@/lib/api/client";
import { patientOutToHealthWorkerPatient, referralOutToHWReferral } from "@/lib/api/adapters";
import type { HealthWorkerPatient, HWReferral } from "@/lib/mockData";
import { OfflinePill } from "@/components/shared/OfflinePill";
import { HealthWorkerQueueSection } from "@/components/care/HealthWorkerQueueSection";
import {
  Users,
  AlertTriangle,
  Share2,
  Calendar,
  Clock,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  UserPlus,
  AlertOctagon,
  CheckCircle2,
} from "lucide-react";

export default function HealthWorkerDashboardPage() {
  const { t } = useLanguage();
  const { outboxCount } = useAppState();

  const [filterRisk, setFilterRisk] = useState<string>("All");
  const [patients, setPatients] = useState<HealthWorkerPatient[]>([]);
  const [referrals, setReferrals] = useState<HWReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [realPatientCount, setRealPatientCount] = useState<number | null>(null);
  const [realReferralCount, setRealReferralCount] = useState<number | null>(null);
  const [realCareGapCount, setRealCareGapCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [realPatients, realReferrals, facilityList] = await Promise.all([
          patientsApi.list(),
          referralsApi.list(),
          facilitiesApi.list().catch(() => []),
        ]);
        if (cancelled) return;
        const facilityNameById = new Map(facilityList.map((f) => [f.id, f.name]));
        const patientNameById = new Map(realPatients.map((p) => [p.id, p.full_name]));
        setPatients(realPatients.map(patientOutToHealthWorkerPatient));
        setReferrals(
          realReferrals.map((r) =>
            referralOutToHWReferral(
              r,
              patientNameById.get(r.patient_id) || "Patient",
              facilityNameById.get(r.to_facility_id || "") || "Facility"
            )
          )
        );
        setRealPatientCount(realPatients.length);
        setRealReferralCount(
          realReferrals.filter((r) => r.status === "CREATED" || r.status === "PENDING").length
        );
        // care-gaps has no facility-wide list for non-admin roles; aggregate
        // per-patient (fine for the seeded demo dataset's size).
        const gapLists = await Promise.all(
          realPatients.map((p) => careGapsApi.listForPatient(p.id).catch(() => []))
        );
        if (cancelled) return;
        const openGaps = gapLists.flat().filter((g) => g.status === "OPEN");
        setRealCareGapCount(openGaps.length);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load dashboard from server.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const highRiskPatientsCount = patients.filter((p) => p.riskLevel === "High Risk").length;
  const pendingReferralsCount = referrals.filter(
    (r) => r.status === "Pending Acceptance" || (r.status as string) === "Waiting for action"
  ).length;

  const highRiskSectionPatients = patients.filter((p) => {
    const gaps = derivePatientGaps(p, referrals, [], []);
    if (filterRisk === "All") return true;
    if (filterRisk === "High Risk") return p.riskLevel === "High Risk";
    if (filterRisk === "Medium Risk") return p.riskLevel === "Watch / Moderate";
    if (filterRisk === "Low Risk") return p.riskLevel === "Low Risk" || p.riskLevel === "Normal";
    if (filterRisk === "Follow-up Missed")
      return gaps.some(
        (cg) =>
          cg.toLowerCase().includes("overdue") ||
          cg.toLowerCase().includes("pending") ||
          cg.toLowerCase().includes("missed")
      );
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <PageHeader
        title={`${t("welcomeWorker")}, ANM Sunita Devi`}
        subtitle={`${t("assignedVillage")} Rampur Block • Sub-Centre Area 2 • Date: Sunday, Sep 6, 2026`}
        roleBadge={<RoleBadge role="Health Worker" />}
        action={
          <Link
            href="/hw/patients/register"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t("hwRegister")}</span>
          </Link>
        }
      />

      {loading && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-600 text-xs font-semibold flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading patients and care requests from server…
        </div>
      )}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Summary Cards Grid showing exact simple user-friendly labels */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. My patients */}
        <DashboardCard
          title={t("myPatients")}
          value={realPatientCount ?? patients.length}
          subtitle={t("registeredInVillageSector")}
          icon={Users}
        />

        {/* 2. Patients needing urgent attention */}
        <DashboardCard
          title={t("patientsNeedingUrgentAttention")}
          value={highRiskPatientsCount}
          subtitle={t("maternalAndNcdPriority")}
          icon={AlertTriangle}
          highlight
        />

        {/* 3. Visits due */}
        <DashboardCard
          title={t("visitsDue")}
          value={realCareGapCount ?? 0}
          subtitle={t("scheduledHomeAndClinicVisits")}
          icon={Calendar}
        />

        {/* 4. Missed visits */}
        <DashboardCard
          title={t("missedVisits")}
          value={0}
          subtitle={t("followUpRequired")}
          icon={Clock}
        />

        {/* 5. New care requests */}
        <DashboardCard
          title={t("newCareRequests")}
          value={realReferralCount ?? pendingReferralsCount}
          subtitle={t("waitingForHospitalReview")}
          icon={Share2}
        />

        {/* 6. Information waiting to be sent */}
        <DashboardCard
          title={t("informationWaitingToBeSent")}
          value={outboxCount}
          subtitle={t("savedOnDeviceSubtitle")}
          icon={RefreshCw}
        />
      </div>

      <HealthWorkerQueueSection
        patients={patients.map((p) => ({ id: p.id, full_name: p.name, riskLevel: p.riskLevel }))}
      />

      {/* Priority Action List: Patients Needing Urgent Attention Today */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 dark:text-white text-lg">
                {t("urgentAttentionSectionTitle")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("urgentAttentionSectionSubtitle")}
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-rose-800 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 px-3 py-1 rounded-full w-fit">
            {patients.filter((p) => p.riskLevel === "High Risk").length} {t("actionsDueToday")}
          </span>
        </div>

        {/* Urgent Attention Patients List */}
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {patients
            .filter((p) => p.riskLevel === "High Risk")
            .map((patient) => {
              const gaps = derivePatientGaps(patient, referrals, [], []);
              return (
                <div
                  key={patient.id}
                  className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800 transition-colors rounded-xl px-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-base">
                        {patient.name}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        ({patient.id})
                      </span>
                      <StatusBadge status={patient.riskLevel} />
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      Village: {patient.village} • Key Care Gap: {gaps[0] || patient.requiredAction}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>{patient.nextFollowUp}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/hw/patients/${patient.id}`}
                      className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                    >
                      <span>{t("openPatientDetails")}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* High-Risk Patient Section with Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div>
            <h2 className="font-extrabold text-slate-900 dark:text-white text-lg">
              {t("highCarePriorityListTitle")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("highCarePriorityListSubtitle")}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              { id: "All", label: t("filterAll") },
              { id: "High Risk", label: t("filterUrgent") },
              { id: "Medium Risk", label: t("filterModerate") },
              { id: "Low Risk", label: t("filterLow") },
              { id: "Follow-up Missed", label: t("filterMissed") },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterRisk(f.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                  filterRisk === f.id
                    ? "bg-teal-700 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {highRiskSectionPatients.map((p) => {
            const gaps = derivePatientGaps(p, referrals, [], []);
            return (
              <div
                key={p.id}
                className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">{p.name}</h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {p.age} Yrs • Village: {p.village}
                    </span>
                  </div>
                  <StatusBadge status={p.riskLevel} />
                </div>

                <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                  {p.carePathway === "Maternal Care" && p.pregnancyWeek && (
                    <p>
                      <strong>Pregnancy Week:</strong> {p.pregnancyWeek} (EDD: {p.edd})
                    </p>
                  )}
                  <p className="text-teal-900 font-semibold bg-teal-50 dark:bg-teal-900/30 p-2 rounded-lg border border-teal-100">
                    <strong>Derived Care Gap:</strong> {gaps[0]}
                  </p>
                  <p>
                    <strong>Referral Status:</strong> {p.referralStatus}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-teal-800">
                    Next: {p.nextFollowUp}
                  </span>
                  <Link
                    href={`/hw/patients/${p.id}`}
                    className="text-xs font-bold text-teal-700 hover:underline inline-flex items-center gap-1"
                  >
                    <span>{t("openPatientDetails")}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Care Request & Derived Care Gap Summary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Care Request Summary Box */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-teal-700" />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                {t("careRequestSummaryTitle")}
              </h3>
            </div>
            <Link
              href="/hw/referrals"
              className="text-xs font-bold text-teal-700 hover:underline"
            >
              {t("viewAllRequests")} ({referrals.length})
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200">
              <span className="text-amber-800 font-semibold block">{t("waitingHospitalResponse")}</span>
              <span className="text-xl font-extrabold text-amber-950 mt-1 block">
                {referrals.filter((r) => r.status === "Pending Acceptance").length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200">
              <span className="text-emerald-800 font-semibold block">{t("acceptedAndConfirmed")}</span>
              <span className="text-xl font-extrabold text-emerald-950 mt-1 block">
                {referrals.filter((r) => r.status === "Accepted").length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-900/30 border border-sky-200">
              <span className="text-sky-800 font-semibold block">{t("waitingPatientVisit")}</span>
              <span className="text-xl font-extrabold text-sky-950 mt-1 block">
                {referrals.filter((r) => r.currentStep === "Patient Visit").length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-900/30 border border-teal-200">
              <span className="text-teal-800 font-semibold block">{t("completedTreatment")}</span>
              <span className="text-xl font-extrabold text-teal-950 mt-1 block">
                {referrals.filter((r) => r.status === "Completed").length}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Derived Care-Gap Summary Box */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
            <AlertOctagon className="w-5 h-5 text-rose-600" />
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              {t("careGapsTitle")} (Derived Live)
              {realCareGapCount !== null && (
                <span className="ml-2 text-xs font-bold text-rose-700">
                  {realCareGapCount} open (backend)
                </span>
              )}
            </h3>
          </div>

          <div className="space-y-2.5 text-xs">
            {patients.slice(0, 3).map((p) => {
              const gaps = derivePatientGaps(p, referrals, [], []);
              return (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-900/30 border border-rose-200/80 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-rose-900 block">{gaps[0]}</span>
                    <span className="text-rose-700 text-[11px]">
                      {p.name} ({p.id}) • {p.village}
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-rose-800 shrink-0 ml-2">
                    {p.riskLevel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 7. Update Information / Device Records Banner */}
      <div className="p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <OfflinePill />
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <span>{t("deviceSavedRecordsTitle")}</span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {t("deviceSavedRecordsSubtitle")}
            </p>
          </div>
        </div>

        <Link
          href="/hw/sync"
          className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 shadow-sm"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{t("updateInformation")}</span>
        </Link>
      </div>
    </div>
  );
}
