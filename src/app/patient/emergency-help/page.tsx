"use client";

import React, { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { EmergencyHelpCard, GeneralEmergencyHelpCard } from "@/components/patient/EmergencyHelpCard";
import { loadOwnPatient } from "@/lib/api/ownPatient";
import { patientsApi } from "@/lib/api/client";
import type { PatientOut } from "@/lib/api/types";
import { isMaternalCarePathway } from "@/lib/carePathway";
import { useLanguage } from "@/lib/i18n/languageContext";
import { ShieldAlert, AlertTriangle, CheckCircle2, PhoneCall, Building2, Loader2 } from "lucide-react";

// Generic community ASHA/health-worker support line shown only on the
// maternal-care pathway when this patient hasn't set a personal emergency
// contact — never used to label or represent a non-maternal patient.
const FALLBACK_ASHA_PHONE = "9876500111";

export default function PatientEmergencyHelpPage() {
  const { t } = useLanguage();
  const [patient, setPatient] = useState<PatientOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertSent, setAlertSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await loadOwnPatient();
        if (!cancelled) setPatient(me);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Maternal-specific framing (danger signs, ASHA/ANM contact) is only ever
  // shown once this patient has actually chosen the maternal-care pathway.
  const maternal = isMaternalCarePathway(patient?.care_pathway);
  const ashaPhone = patient?.emergency_contact || FALLBACK_ASHA_PHONE;

  const handleTriggerAlert = useCallback(() => {
    if (!patient) return;
    // Fire-and-forget: the tel: link navigation proceeds regardless of
    // whether the in-app alert call succeeds.
    patientsApi
      .triggerEmergencyAlert(patient.id)
      .then(() => setAlertSent(true))
      .catch(() => {
        /* non-fatal: the tel: dial is what actually matters on a device */
      });
  }, [patient]);

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
            {maternal ? t("emergencyProtocolTitle") : "Emergency Assistance"}
          </span>
          <p className="font-normal text-rose-800">
            {t("aiPreliminaryNotice")}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : maternal ? (
        <>
          {alertSent && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Emergency alert logged and your care team has been notified in-app.</span>
            </div>
          )}

          {/* Main Emergency Card Component — maternal-care pathway only */}
          <EmergencyHelpCard ashaPhone={ashaPhone} onTriggerAlert={handleTriggerAlert} />
        </>
      ) : (
        <>
          {alertSent && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Emergency alert logged and your care team has been notified in-app.</span>
            </div>
          )}

          <GeneralEmergencyHelpCard
            emergencyContact={patient?.emergency_contact || null}
            onTriggerAlert={handleTriggerAlert}
          />
        </>
      )}

      {/* Emergency Symptoms Checklist — maternal danger signs are only
          relevant, and only shown, on the maternal-care pathway. Not
          merely hidden with CSS: the whole section is skipped otherwise. */}
      {maternal && (
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
      )}

      {/* Direct Quick Dial Action Grid — maternal-care pathway only. The
          ASHA/ANM contact card is a maternal-specific concept, so a
          non-maternal patient never sees it (GeneralEmergencyHelpCard above
          already covers their emergency-contact + ambulance + facilities
          needs). */}
      {maternal && (
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
              href={`tel:${ashaPhone}`}
              onClick={handleTriggerAlert}
              className="w-full py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              <PhoneCall className="w-4 h-4" />
              <span>{t("callASHA")} ({ashaPhone})</span>
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
      )}
    </div>
  );
}
