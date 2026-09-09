"use client";

import React from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { priyaPatientMock } from "@/lib/mockData";
import { useLanguage } from "@/lib/i18n/languageContext";
import { Stethoscope, Building2, Calendar, Download } from "lucide-react";

export default function PatientDiagnosticsPage() {
  const diagnostics = priyaPatientMock.diagnostics;
  const { t } = useLanguage();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="labTestsTitle"
        subtitle="labTestsSubtitle"
        roleBadge={<RoleBadge role="Patient" />}
      />

      <div className="space-y-4">
        {diagnostics.map((diag) => (
          <div
            key={diag.id}
            className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-100 text-teal-700">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {t("testId")}: {diag.id}
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {diag.testName}
                  </h3>
                </div>
              </div>
              <StatusBadge status={diag.status} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-700 shrink-0" />
                <span>{t("healthCenterLab")} <strong>{diag.facilityName.includes("District") ? t("districtHospitalName") : diag.facilityName}</strong></span>
              </div>
              {diag.scheduledDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>{t("scheduledDate")} <strong>{diag.scheduledDate}</strong></span>
                </div>
              )}
            </div>

            {diag.reportSummary && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-xs space-y-1">
                <span className="font-bold text-slate-800 block">{t("reportSummary")}</span>
                <p className="text-slate-600">{diag.reportSummary.includes("Hb") ? `Hb 9.2 g/dL (${t("moderateAnemia")})` : diag.reportSummary}</p>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => alert(`View Report for ${diag.testName}`)}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t("viewLabReport")}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
