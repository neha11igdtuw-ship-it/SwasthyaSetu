"use client";

import React from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { DashboardCard } from "@/components/DashboardCard";
import { StatusBadge } from "@/components/StatusBadge";
import { mockFacilityData } from "@/lib/mockData";
import { useLanguage } from "@/lib/i18n/languageContext";
import {
  Inbox,
  CheckCircle2,
  Users,
  Clock,
  Building2,
  Activity,
  PackageCheck,
  Check,
  X,
  Repeat,
} from "lucide-react";

export default function FacilityDashboardPage() {
  const fac = mockFacilityData;
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("districtHospitalName")}
        subtitle={`${t("healthcareFacility")} • Kalyanpur District`}
        roleBadge={<RoleBadge role="Healthcare Facility" />}
      />

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <DashboardCard
          title={t("newCareRequests")}
          value={fac.incomingReferralsCount}
          subtitle={t("hwSpaceDesc")}
          icon={Inbox}
          highlight
        />

        <DashboardCard
          title={t("acceptedAndConfirmed")}
          value={fac.acceptedReferralsCount}
          subtitle={t("waitingPatientVisit")}
          icon={CheckCircle2}
        />

        <DashboardCard
          title={t("peopleExpectedToday")}
          value={fac.patientsExpectedToday}
          subtitle={t("todaysSchedule")}
          icon={Users}
        />

        <DashboardCard
          title={t("waitingHospitalResponse")}
          value={fac.pendingFacilityResponsesCount}
          subtitle={t("waitingForAction")}
          icon={Clock}
        />

        <DashboardCard
          title={t("facilityOverview")}
          value="78%"
          subtitle={fac.bedOccupancyRate}
          icon={Building2}
        />
      </div>

      {/* Incoming Care Requests Desk & Medicine/Service Availability Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incoming Care Requests Management */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-extrabold text-slate-900 text-lg">
                {t("newCareRequestsDesk")}
              </h2>
              <p className="text-xs text-slate-500">
                {t("acceptRedirectFeedback")}
              </p>
            </div>
            <span className="text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 px-3 py-1 rounded-full w-fit">
              {fac.pendingFacilityResponsesCount} {t("waitingHospitalResponse")}
            </span>
          </div>

          <div className="space-y-3">
            {fac.incomingReferrals.map((ref) => (
              <div
                key={ref.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {ref.patientName === "Priya Sharma" ? t("priyaSharmaName") : ref.patientName}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      ({ref.id})
                    </span>
                    <StatusBadge status={ref.status} />
                  </div>
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                    {t("highRisk")}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p>
                    <strong>From:</strong> {t("subCentreRampur")} |{" "}
                    <strong>Reason:</strong> {t("preEclampsiaReason")}
                  </p>
                </div>

                {ref.status === "Pending Acceptance" && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> {t("acceptCareRequest")}
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Repeat className="w-3.5 h-3.5" /> {t("redirect")}
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" /> {t("sendBackToWorker")}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Available Services & Stock Card */}
        <div className="space-y-6">
          {/* Services Availability */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Activity className="w-5 h-5 text-teal-700" />
              <h3 className="font-bold text-slate-900 text-base">
                {t("servicesAvailable")}
              </h3>
            </div>

            <div className="space-y-3">
              {fac.availableServices.map((service) => (
                <div
                  key={service.name}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800 block">
                      {service.name}
                    </span>
                    <span className="text-slate-500 block text-[11px]">
                      {service.onDutyStaff.includes("Ananya") ? `${t("drAnanyaRao")} — On Duty` : service.onDutyStaff}
                    </span>
                  </div>
                  <StatusBadge status={service.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Medicine & Lab Availability */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <PackageCheck className="w-5 h-5 text-teal-700" />
              <h3 className="font-bold text-slate-900 text-base">
                {t("medicineDiagnosticStock")}
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Blood Bank Stock:</span>
                <span className="font-bold text-slate-900">
                  {fac.stockAvailability.bloodBankUnits} Units
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Maternal ICU Beds:</span>
                <span className="font-bold text-slate-900">
                  {fac.stockAvailability.maternalIcuBeds} Free
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Oxytocin Stock:</span>
                <span className="font-bold text-emerald-700">
                  {fac.stockAvailability.oxytocinAvailability}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Essential ANC Meds:</span>
                <StatusBadge status={fac.stockAvailability.essentialMeds} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
