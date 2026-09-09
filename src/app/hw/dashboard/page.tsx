"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { DashboardCard } from "@/components/DashboardCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import {
  mockHealthWorkerData,
  hwPatientsList,
  hwReferralsList,
} from "@/lib/mockData";
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
  WifiOff,
  CheckCircle2,
} from "lucide-react";

export default function HealthWorkerDashboardPage() {
  const { t } = useLanguage();
  const hw = mockHealthWorkerData;
  const [filterRisk, setFilterRisk] = useState<string>("All");

  const highRiskSectionPatients = hwPatientsList.filter((p) => {
    if (filterRisk === "All") return true;
    if (filterRisk === "High Risk") return p.riskLevel === "High Risk";
    if (filterRisk === "Medium Risk") return p.riskLevel === "Watch / Moderate";
    if (filterRisk === "Low Risk") return p.riskLevel === "Low Risk" || p.riskLevel === "Normal";
    if (filterRisk === "Follow-up Missed")
      return p.careGaps.some(
        (cg) =>
          cg.includes("overdue") || cg.includes("pending") || cg.includes("waiting")
      );
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <PageHeader
        title={`${t("welcomeWorker")}, Sunita Devi`}
        subtitle={`${t("assignedVillage")} Rampur Block • Sub-Centre Area 2 • Date: ${hw.currentDate}`}
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

      {/* Summary Cards Grid showing exact simple user-friendly labels */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. My patients */}
        <DashboardCard
          title={t("myPatients")}
          value={hw.totalPatients}
          subtitle={t("registeredInVillageSector")}
          icon={Users}
        />

        {/* 2. Patients needing urgent attention */}
        <DashboardCard
          title={t("patientsNeedingUrgentAttention")}
          value={hw.highRiskPatients}
          subtitle={t("maternalAndNcdPriority")}
          icon={AlertTriangle}
          highlight
        />

        {/* 3. Visits due */}
        <DashboardCard
          title={t("visitsDue")}
          value={hw.followUpsDueToday}
          subtitle={t("scheduledHomeAndClinicVisits")}
          icon={Calendar}
        />

        {/* 4. Missed visits */}
        <DashboardCard
          title={t("missedVisits")}
          value={hw.missedFollowUps}
          subtitle={t("followUpRequired")}
          icon={Clock}
        />

        {/* 5. New care requests */}
        <DashboardCard
          title={t("newCareRequests")}
          value={hw.pendingReferrals}
          subtitle={t("waitingForHospitalReview")}
          icon={Share2}
        />

        {/* 6. Information waiting to be sent */}
        <DashboardCard
          title={t("informationWaitingToBeSent")}
          value={hw.unsyncedRecordsCount}
          subtitle={t("savedOnDeviceSubtitle")}
          icon={RefreshCw}
        />
      </div>

      {/* Priority Action List: Patients Needing Urgent Attention Today */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-lg">
                {t("urgentAttentionSectionTitle")}
              </h2>
              <p className="text-xs text-slate-500">
                {t("urgentAttentionSectionSubtitle")}
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full w-fit">
            {hw.actionPatients.length} {t("actionsDueToday")}
          </span>
        </div>

        {/* Urgent Attention Patients List */}
        <div className="divide-y divide-slate-100">
          {hw.actionPatients.map((patient) => (
            <div
              key={patient.id}
              className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors rounded-xl px-2"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-base">
                    {patient.name}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    ({patient.id})
                  </span>
                  <StatusBadge status={patient.riskLevel} />
                </div>
                <p className="text-xs font-semibold text-slate-800">
                  {t("villageLabel")}: {patient.village} • {t("requiredAction")}: {patient.actionNeeded}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>{patient.dueTime}</span>
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
          ))}
        </div>
      </div>

      {/* High-Risk Patient Section with Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-extrabold text-slate-900 text-lg">
              {t("highCarePriorityListTitle")}
            </h2>
            <p className="text-xs text-slate-500">
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
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                  filterRisk === f.id
                    ? "bg-teal-700 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {highRiskSectionPatients.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">{p.name}</h3>
                  <span className="text-[11px] text-slate-500">
                    {p.age} {t("ageYears")} • {t("villageLabel")}: {p.village}
                  </span>
                </div>
                <StatusBadge status={p.riskLevel} />
              </div>

              <div className="text-xs space-y-1 text-slate-600">
                {p.pregnancyWeek && (
                  <p>
                    <strong>{t("pregnancyWeekLabel")}:</strong> {p.pregnancyWeek} (EDD: {p.edd})
                  </p>
                )}
                <p>
                  <strong>{t("requiredAction")}:</strong> {p.requiredAction}
                </p>
                <p>
                  <strong>{t("careRequestStatusLabel")}:</strong> {p.referralStatus}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-teal-800">
                  {t("nextVisitLabel")}: {p.nextFollowUp}
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
          ))}
        </div>
      </div>

      {/* Care Request & Care Gap Summary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Care Request Summary Box */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-teal-700" />
              <h3 className="font-extrabold text-slate-900 text-base">
                {t("careRequestSummaryTitle")}
              </h3>
            </div>
            <Link
              href="/hw/referrals"
              className="text-xs font-bold text-teal-700 hover:underline"
            >
              {t("viewAllRequests")} ({hwReferralsList.length})
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-amber-800 font-semibold block">{t("waitingHospitalResponse")}</span>
              <span className="text-xl font-extrabold text-amber-950 mt-1 block">2</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-emerald-800 font-semibold block">{t("acceptedAndConfirmed")}</span>
              <span className="text-xl font-extrabold text-emerald-950 mt-1 block">4</span>
            </div>
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200">
              <span className="text-sky-800 font-semibold block">{t("waitingPatientVisit")}</span>
              <span className="text-xl font-extrabold text-sky-950 mt-1 block">3</span>
            </div>
            <div className="p-3 rounded-xl bg-teal-50 border border-teal-200">
              <span className="text-teal-800 font-semibold block">{t("completedTreatment")}</span>
              <span className="text-xl font-extrabold text-teal-950 mt-1 block">8</span>
            </div>
          </div>
        </div>

        {/* Care-Gap Summary Box */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <AlertOctagon className="w-5 h-5 text-rose-600" />
            <h3 className="font-extrabold text-slate-900 text-base">
              {t("careGapsTitle")}
            </h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-between">
              <div>
                <span className="font-bold text-rose-900 block">Care Request Pending Acceptance</span>
                <span className="text-rose-700 text-[11px]">Pooja Sharma (P-9012) • Kalyanpur</span>
              </div>
              <span className="text-xs font-extrabold text-rose-800">&gt; 24h</span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between">
              <div>
                <span className="font-bold text-amber-900 block">Visit Overdue</span>
                <span className="text-amber-800 text-[11px]">Ramesh Chandra (P-4410) • Rampur</span>
              </div>
              <span className="text-xs font-extrabold text-amber-900">High BP</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Recommended Check Pending</span>
                <span className="text-slate-600 text-[11px]">Asha Devi (P-5521) • Sundarpur</span>
              </div>
              <span className="text-xs font-semibold text-slate-700">Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Update Information / Device Records Banner */}
      <div className="p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-teal-400 flex items-center justify-center shrink-0">
            <WifiOff className="w-5 h-5" />
          </div>
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
