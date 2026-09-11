"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { ReferralStatusStepper } from "@/components/care/ReferralStatusStepper";
import { useLanguage } from "@/lib/i18n/languageContext";
import { useAppState } from "@/lib/store/AppStateProvider";
import { authApi, patientsApi, referralsApi, facilitiesApi, ApiError } from "@/lib/api/client";
import { Share2, ShieldCheck, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";

export default function PatientReferralsPage() {
  const { t } = useLanguage();
  const { patientReferral, advancePatientReferralStep } = useAppState();
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [remoteSummary, setRemoteSummary] = useState<{
    facilityName: string;
    reason: string;
    status: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const me = await authApi.me();
        // PATIENT-role calls are auto-scoped to the caller's own patient record.
        const ownPatients = await patientsApi.list();
        const own = ownPatients[0];
        if (!own) {
          if (!cancelled) setLoadError(`No patient record linked to ${me.email} yet.`);
          return;
        }
        const referrals = await referralsApi.list(own.id);
        if (referrals.length === 0) {
          if (!cancelled) setLoadError("No active care requests found on the server.");
          return;
        }
        const latest = referrals[0];
        const facilityName = latest.to_facility_id
          ? (await facilitiesApi.get(latest.to_facility_id)).name
          : "Unassigned Facility";
        if (!cancelled) {
          setRemoteSummary({ facilityName, reason: latest.reason, status: latest.status });
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof ApiError ? err.message : "Failed to load referral status from server."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpdateStatus = () => {
    advancePatientReferralStep();
    setRequested(true);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="referralProgressTitle"
        subtitle="referralProgressSubtitle"
        roleBadge={<RoleBadge role="Patient" />}
      />

      {loading && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Checking latest care request status on server…</span>
        </div>
      )}

      {!loading && remoteSummary && (
        <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-900/30 border border-teal-200 text-teal-900 text-xs font-semibold space-y-1">
          <div>Server record: <strong>{remoteSummary.facilityName}</strong> — {remoteSummary.reason}</div>
          <div>Status: <strong>{remoteSummary.status}</strong></div>
        </div>
      )}

      {!loading && loadError && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 text-amber-900 text-xs font-semibold">
          {loadError}
        </div>
      )}

      {requested && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{t("referralUpdateSent")}</span>
        </div>
      )}

      {/* Active Referral Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/30 border border-teal-100 text-teal-700">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                {t("careRequestId")}: {patientReferral.id}
              </span>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
                {patientReferral.facilityName.includes("District") ? t("districtHospitalName") : patientReferral.facilityName}
              </h3>
            </div>
          </div>
          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-800 border border-rose-200">
            {patientReferral.priority} {t("priorityText")}
          </span>
        </div>

        {/* Visual Referral Stepper */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            {t("careRequestProgressStage")}
          </span>
          <ReferralStatusStepper steps={patientReferral.steps} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block">{t("reasonForCareRequest")}</span>
            <span className="font-bold text-slate-900 dark:text-white">{patientReferral.reason}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block">{t("expectedVisitDate")}</span>
            <span className="font-bold text-teal-800">{patientReferral.expectedVisitDate}</span>
          </div>
          <div className="sm:col-span-2 flex items-center gap-1.5 text-slate-600 dark:text-slate-300 border-t border-slate-200/60 dark:border-slate-700 pt-2">
            <ShieldCheck className="w-4 h-4 text-teal-700" />
            <span>Current Stage: <strong className="text-teal-900">{patientReferral.currentStep}</strong></span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("showSlipAtHospitalDesk")}
          </p>

          <button
            type="button"
            onClick={handleUpdateStatus}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Confirm Visit / Advance Care Stage</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
