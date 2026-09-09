"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { DisclaimerCard } from "@/components/shared/DisclaimerCard";
import { hwPatientsList } from "@/lib/mockData";
import { useLanguage } from "@/lib/i18n/languageContext";
import { ShieldCheck, Share2 } from "lucide-react";

export default function HWScreeningPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const patientId = (params?.patientId as string) || "P-7821";

  const patient =
    hwPatientsList.find((p) => p.id === patientId) || hwPatientsList[0];

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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={`${t("healthCheckTitle")}: ${patient.name}`}
        subtitle={`ID: ${patient.id} • ${t("villageLabel")}: ${patient.village}`}
        roleBadge={<RoleBadge role="Health Worker" />}
      />

      <DisclaimerCard
        text={t("healthCheckDisclaimer")}
        variant="amber"
      />

      {validated && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
          <span>{t("healthCheckSavedSuccess")} ({patient.name})</span>
          <button
            type="button"
            onClick={() => setValidated(false)}
            className="text-[10px] underline font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Danger Sign Checklist & Intake Form */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-2">
          {t("maternalDangerSignsSection")}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={bleeding}
              onChange={(e) => setBleeding(e.target.checked)}
              className="w-4 h-4 accent-teal-700"
            />
            <span className="font-bold text-rose-800">{t("vaginalBleedingCheck")}</span>
          </label>

          <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={convulsions}
              onChange={(e) => setConvulsions(e.target.checked)}
              className="w-4 h-4 accent-teal-700"
            />
            <span className="font-bold text-rose-800">{t("convulsionsFitsCheck")}</span>
          </label>

          <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={headacheVision}
              onChange={(e) => setHeadacheVision(e.target.checked)}
              className="w-4 h-4 accent-teal-700"
            />
            <span className="font-bold text-slate-800">{t("severeHeadacheCheck")}</span>
          </label>

          <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={swelling}
              onChange={(e) => setSwelling(e.target.checked)}
              className="w-4 h-4 accent-teal-700"
            />
            <span className="font-bold text-slate-800">{t("bodySwellingCheck")}</span>
          </label>
        </div>

        {/* Vitals Input */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-2">
            {t("vitalsTodaySection")}
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">{t("systolicBpLabel")}</label>
              <input
                type="number"
                value={bpSystolic}
                onChange={(e) => setBpSystolic(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">{t("diastolicBpLabel")}</label>
              <input
                type="number"
                value={bpDiastolic}
                onChange={(e) => setBpDiastolic(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold"
              />
            </div>
          </div>
        </div>

        {/* Outcome Card */}
        <div className="p-5 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-3">
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
            onClick={() => setValidated(true)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 shadow-xs"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{t("confirmHealthCheckBtn")}</span>
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
