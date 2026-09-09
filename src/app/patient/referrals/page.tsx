"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { ReferralStatusStepper } from "@/components/care/ReferralStatusStepper";
import { priyaPatientMock } from "@/lib/mockData";
import { useLanguage } from "@/lib/i18n/languageContext";
import { Share2, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function PatientReferralsPage() {
  const ref = priyaPatientMock.referral;
  const { t } = useLanguage();
  const [requested, setRequested] = useState(false);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="referralProgressTitle"
        subtitle="referralProgressSubtitle"
        roleBadge={<RoleBadge role="Patient" />}
      />

      {requested && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{t("referralUpdateSent")}</span>
        </div>
      )}

      {/* Active Referral Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-100 text-teal-700">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {t("careRequestId")}: {ref.id}
              </span>
              <h3 className="font-extrabold text-slate-900 text-lg">
                {t("districtHospitalName")}
              </h3>
            </div>
          </div>
          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
            {t("highRisk")} {t("priorityText")}
          </span>
        </div>

        {/* Visual Referral Stepper */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-700 block">
            {t("careRequestProgressStage")}
          </span>
          <ReferralStatusStepper steps={ref.steps} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
          <div>
            <span className="text-slate-500 block">{t("reasonForCareRequest")}</span>
            <span className="font-bold text-slate-900">{t("preEclampsiaReason")}</span>
          </div>
          <div>
            <span className="text-slate-500 block">{t("expectedVisitDate")}</span>
            <span className="font-bold text-teal-800">{t("followUpDueSep12")}</span>
          </div>
          <div className="sm:col-span-2 flex items-center gap-1.5 text-slate-600 border-t border-slate-200/60 pt-2">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span><strong>{t("statusAcceptedHospitalDesk")}</strong></span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {t("showSlipAtHospitalDesk")}
          </p>

          <button
            type="button"
            onClick={() => setRequested(true)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            {t("updateCareRequestStatus")}
          </button>
        </div>
      </div>
    </div>
  );
}
