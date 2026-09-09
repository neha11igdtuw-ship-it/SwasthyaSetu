"use client";

import React from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { priyaPatientMock } from "@/lib/mockData";
import { useLanguage } from "@/lib/i18n/languageContext";
import { User, Clock } from "lucide-react";

export default function PatientRecordsPage() {
  const p = priyaPatientMock;
  const { t } = useLanguage();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="recordsTitle"
        subtitle="recordsSubtitle"
        roleBadge={<RoleBadge role="Patient" />}
      />

      {/* Patient Profile Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-bold text-lg">
            <User className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {t("patientId")}: {p.profile.id}
            </span>
            <h3 className="font-extrabold text-slate-900 text-lg">
              {t("priyaSharmaName")} ({p.profile.age} Yrs)
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 block">{t("pregnancyWeek")}</span>
            <span className="text-sm font-extrabold text-slate-900">
              Week {p.profile.pregnancyWeek}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 block">{t("bloodPressureReading")}</span>
            <span className="text-sm font-extrabold text-rose-700">
              {p.profile.vitals.bp}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 block">{t("hemoglobin")}</span>
            <span className="text-sm font-extrabold text-rose-700">
              {p.profile.vitals.hemoglobin}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 block">{t("callASHA")}</span>
            <span className="text-xs font-bold text-teal-800">
              {t("sunitaDeviWorker")}
            </span>
          </div>
        </div>
      </div>

      {/* Health Visit Timeline */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Clock className="w-5 h-5 text-teal-700" />
          <h3 className="font-extrabold text-slate-900 text-base">
            {t("healthVisitTimeline")}
          </h3>
        </div>

        <div className="space-y-6 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {p.timeline.map((vis) => (
            <div key={vis.id} className="relative pl-10 space-y-1">
              <div className="absolute left-2 top-1.5 w-4 h-4 rounded-full bg-teal-700 ring-4 ring-teal-50 border-2 border-white" />

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="font-bold text-slate-900 text-sm">
                    {vis.type}
                  </span>
                  <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                    {vis.date}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {vis.summary.includes("headache") ? t("preEclampsiaReason") : vis.summary}
                </p>

                <div className="flex gap-3 text-[11px] text-slate-500 font-medium pt-1">
                  <span>Visited: <strong>{vis.provider.includes("ANM") ? t("sunitaDeviWorker") : vis.provider.includes("District") ? t("districtHospitalName") : vis.provider}</strong></span>
                  <span>BP: <strong className="text-rose-700">{vis.bp}</strong></span>
                  <span>Hb: <strong className="text-rose-700">{vis.hb}</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
