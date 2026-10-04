"use client";

import React, { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { DisclaimerCard } from "@/components/shared/DisclaimerCard";
import { EmergencyHelpCard, GeneralEmergencyHelpCard } from "@/components/patient/EmergencyHelpCard";
import { loadOwnPatient } from "@/lib/api/ownPatient";
import { patientsApi } from "@/lib/api/client";
import type { PatientOut } from "@/lib/api/types";
import { isMaternalCarePathway } from "@/lib/carePathway";
import { useLanguage } from "@/lib/i18n/languageContext";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

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
  // Only the signed-in patient's own saved contact — never a placeholder.
  const emergencyContact = patient?.emergency_contact || null;

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

      <DisclaimerCard variant="rose" />

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
          <EmergencyHelpCard emergencyContact={emergencyContact} onTriggerAlert={handleTriggerAlert} />
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
            emergencyContact={emergencyContact}
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
    </div>
  );
}
