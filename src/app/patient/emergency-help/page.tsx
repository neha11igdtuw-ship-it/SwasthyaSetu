"use client";

import React from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { EmergencyHelpCard } from "@/components/patient/EmergencyHelpCard";
import { priyaPatientMock } from "@/lib/mockData";
import { useLanguage } from "@/lib/i18n/languageContext";
import { ShieldAlert, AlertTriangle, CheckCircle2, PhoneCall, Building2 } from "lucide-react";

export default function PatientEmergencyHelpPage() {
  const p = priyaPatientMock;
  const { t } = useLanguage();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="emergencyHelp"
        subtitle="immediateHighRiskAlert"
        roleBadge={<RoleBadge role="Patient" />}
      />

      <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-900 text-xs font-bold flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
        <div>
          <span className="block text-sm font-extrabold mb-0.5">
            {t("emergencyProtocolTitle")}
          </span>
          <p className="font-normal text-rose-800">
            {t("aiPreliminaryNotice")}
          </p>
        </div>
      </div>

      {/* Main Emergency Card Component */}
      <EmergencyHelpCard ashaPhone={p.profile.assignedASHAPhone} />

      {/* Emergency Symptoms Checklist */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
            {t("maternalDangerSignsGetHelp")}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-800 dark:text-slate-100">
          {[
            t("severeContinuousHeadache"),
            t("blurredVisionOrSpots"),
            t("swellingFaceHandsFeet"),
            t("severeAbdominalPain"),
            t("vaginalBleedingDischarge"),
            t("reducedFetalMovement"),
          ].map((symptom, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-900/30 border border-rose-100 flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-bold">{symptom}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Direct Quick Dial Action Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            {t("callASHA")}
          </span>
          <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
            {t("sunitaDeviWorker")}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {t("rampurLocation")}
          </p>
          <a
            href={`tel:${p.profile.assignedASHAPhone}`}
            className="w-full py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            <PhoneCall className="w-4 h-4" />
            <span>{t("callASHA")} ({p.profile.assignedASHAPhone})</span>
          </a>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            {t("nearestHospital")}
          </span>
          <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
            {t("districtHospitalName")}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            24/7 Maternal Emergency Unit (8.5 km away)
          </p>
          <a
            href="/patient/facilities"
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            <Building2 className="w-4 h-4" />
            <span>{t("viewHospitalDetails")}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
