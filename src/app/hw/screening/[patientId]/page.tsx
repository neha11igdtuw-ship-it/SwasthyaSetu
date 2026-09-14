"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { DisclaimerCard } from "@/components/shared/DisclaimerCard";
import { hwPatientsList } from "@/lib/mockData";
import { useLanguage } from "@/lib/i18n/languageContext";
import { ShieldCheck, Share2 } from "lucide-react";
import { patientsApi, encountersApi, ApiError } from "@/lib/api/client";
import type { PatientOut } from "@/lib/api/types";

export default function HWScreeningPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const patientId = (params?.patientId as string) || "P-7821";

  const patient =
    hwPatientsList.find((p) => p.id === patientId) || hwPatientsList[0];

  // Real backend patient (screening page is keyed by real UUID when reached
  // from hw/patients/[id]); mock `patient` above still supplies display-only
  // fields (village etc.) the backend patient schema doesn't have yet.
  const [realPatient, setRealPatient] = useState<PatientOut | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [referralId, setReferralId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await patientsApi.get(patientId);
        if (!cancelled) setRealPatient(p);
      } catch (err) {
        console.warn("hw/screening: could not load real patient", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  // Display name/id/village should reflect the real backend patient whenever
  // one was successfully loaded — the mock `patient` lookup above almost
  // always falls back to hwPatientsList[0] ("Priya Sharma") because real
  // patients are keyed by backend UUID, not mock IDs like "P-7821". Showing
  // the mock name here was a real bug: the health worker would see the wrong
  // patient's name on the header and on the "saved successfully" banner even
  // though the correct patient's data was saved to the server.
  const displayName = realPatient?.full_name || patient.name;
  const displayVillage = realPatient?.village || patient.village;
  const displayId = realPatient?.id || patient.id;

  const [bleeding, setBleeding] = useState(false);
  const [convulsions, setConvulsions] = useState(false);
  const [bpSystolic, setBpSystolic] = useState("145");
  const [bpDiastolic, setBpDiastolic] = useState("92");
  const [headacheVision, setHeadacheVision] = useState(true);
  const [swelling, setSwelling] = useState(true);

  // Simple mock rule-based screening logic
  let calculatedRisk = "Low Risk";
  const reasons: string[] = [];

  if (bleeding || convulsions || parseInt(bpSystolic) >= 140 || (headacheVision && swelling)) {
    calculatedRisk = "High Risk";
    if (bleeding) reasons.push(t("vaginalBleedingCheck"));
    if (convulsions) reasons.push(t("convulsionsFitsCheck"));
    if (parseInt(bpSystolic) >= 140) reasons.push(`${t("bloodPressure")}: ${bpSystolic}/${bpDiastolic} mmHg`);
    if (headacheVision && swelling) reasons.push(`${t("severeHeadacheCheck")} & ${t("bodySwellingCheck")}`);
  } else if (headacheVision || swelling) {
    calculatedRisk = "Watch / Moderate";
    reasons.push(t("severeHeadacheCheck"));
  } else {
    reasons.push("No severe maternal danger signs identified");
  }

  const [validated, setValidated] = useState(false);

  const riskLevelForApi: "LOW" | "MEDIUM" | "HIGH" =
    calculatedRisk === "High Risk" ? "HIGH" : calculatedRisk === "Watch / Moderate" ? "MEDIUM" : "LOW";

  async function handleConfirm() {
    if (!realPatient) {
      // No matching backend patient (e.g. mock-only demo id) — fall back to
      // local-only confirmation, same as before this page was wired.
      setValidated(true);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const encounter = await encountersApi.create({
        patient_id: realPatient.id,
        encounter_type: "SCREENING",
        notes: "Maternal danger-sign screening",
      });
      await encountersApi.addVital(encounter.id, {
        encounter_id: encounter.id,
        systolic_bp: parseInt(bpSystolic, 10) || undefined,
        diastolic_bp: parseInt(bpDiastolic, 10) || undefined,
      });
      if (bleeding || convulsions || headacheVision || swelling) {
        await encountersApi.addSymptom(encounter.id, {
          encounter_id: encounter.id,
          description: [
            bleeding && "Vaginal bleeding",
            convulsions && "Convulsions/fits",
            headacheVision && "Severe headache/vision changes",
            swelling && "Body swelling",
          ]
            .filter(Boolean)
            .join(", "),
        });
      }
      const screening = await encountersApi.addScreening(encounter.id, {
        encounter_id: encounter.id,
        screening_type: "maternal_danger_signs",
        risk_level: riskLevelForApi,
        result: reasons.join("; "),
        create_referral: riskLevelForApi === "HIGH",
        referral_reason: reasons.join("; "),
        referral_specialty_needed: "Obstetrics",
      });
      setReferralId(screening.referral_id ?? null);
      setValidated(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Failed to save screening to server");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={`${t("healthCheckTitle")}: ${displayName}`}
        subtitle={`ID: ${displayId} • ${t("villageLabel")}: ${displayVillage}`}
        roleBadge={<RoleBadge role="Health Worker" />}
      />

      <DisclaimerCard
        text={t("healthCheckDisclaimer")}
        variant="amber"
      />

      {validated && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
          <span>
            {t("healthCheckSavedSuccess")} ({displayName})
            {referralId && ` — referral created (${referralId.slice(0, 8)})`}
          </span>
          <button
            type="button"
            onClick={() => setValidated(false)}
            className="text-[10px] underline font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-900 text-xs font-semibold">
          {saveError}
        </div>
      )}

      {/* Danger Sign Checklist & Intake Form */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-6">
        <h3 className="font-extrabold text-slate-900 dark:text-white text-base border-b border-slate-100 dark:border-slate-700 pb-2">
          {t("maternalDangerSignsSection")}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={bleeding}
              onChange={(e) => setBleeding(e.target.checked)}
              className="w-4 h-4 accent-teal-700"
            />
            <span className="font-bold text-rose-800">{t("vaginalBleedingCheck")}</span>
          </label>

          <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={convulsions}
              onChange={(e) => setConvulsions(e.target.checked)}
              className="w-4 h-4 accent-teal-700"
            />
            <span className="font-bold text-rose-800">{t("convulsionsFitsCheck")}</span>
          </label>

          <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={headacheVision}
              onChange={(e) => setHeadacheVision(e.target.checked)}
              className="w-4 h-4 accent-teal-700"
            />
            <span className="font-bold text-slate-800 dark:text-slate-100">{t("severeHeadacheCheck")}</span>
          </label>

          <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={swelling}
              onChange={(e) => setSwelling(e.target.checked)}
              className="w-4 h-4 accent-teal-700"
            />
            <span className="font-bold text-slate-800 dark:text-slate-100">{t("bodySwellingCheck")}</span>
          </label>
        </div>

        {/* Vitals Input */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base border-b border-slate-100 dark:border-slate-700 pb-2">
            {t("vitalsTodaySection")}
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{t("systolicBpLabel")}</label>
              <input
                type="number"
                value={bpSystolic}
                onChange={(e) => setBpSystolic(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{t("diastolicBpLabel")}</label>
              <input
                type="number"
                value={bpDiastolic}
                onChange={(e) => setBpDiastolic(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              />
            </div>
          </div>
        </div>

        {/* Outcome Card */}
        <div className="p-5 rounded-2xl bg-teal-50/70 dark:bg-teal-900/30 border border-teal-200/80 space-y-3">
          <div className="flex items-center justify-between border-b border-teal-200/60 pb-2">
            <span className="text-xs font-extrabold text-teal-900 uppercase tracking-wide">
              {t("calculatedPriorityResult")}
            </span>
            <StatusBadge status={calculatedRisk} />
          </div>

          <div className="space-y-1 text-xs text-teal-950">
            <span className="font-bold block">{t("notedReasons")}</span>
            <ul className="list-disc pl-4 space-y-1">
              {reasons.map((r, idx) => (
                <li key={idx}>{r}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-60"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{saving ? "Saving..." : t("confirmHealthCheckBtn")}</span>
          </button>

          <button
            type="button"
            onClick={() => router.push("/hw/referrals")}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Share2 className="w-4 h-4" />
            <span>{t("createNewCareRequestBtn")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
