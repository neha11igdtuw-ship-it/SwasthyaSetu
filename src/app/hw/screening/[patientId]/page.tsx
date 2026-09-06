"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { DisclaimerCard } from "@/components/shared/DisclaimerCard";
import { hwPatientsList } from "@/lib/mockData";
import { ShieldCheck, Share2 } from "lucide-react";

export default function HWScreeningPage() {
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
    if (bleeding) reasons.push("Vaginal bleeding reported");
    if (convulsions) reasons.push("Convulsions / fits reported");
    if (parseInt(bpSystolic) >= 140) reasons.push(`High blood pressure: ${bpSystolic}/${bpDiastolic} mmHg`);
    if (headacheVision && swelling) reasons.push("Severe headache with blurred vision and swelling");
  } else if (headacheVision || swelling) {
    calculatedRisk = "Watch / Moderate";
    reasons.push("Moderate symptoms: headache or swelling present");
  } else {
    reasons.push("No severe maternal danger signs identified");
  }

  const [validated, setValidated] = useState(false);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={`Initial Health Check: ${patient.name}`}
        subtitle={`Patient ID: ${patient.id} • Assigned Village: ${patient.village}`}
        roleBadge={<RoleBadge role="Health Worker" />}
      />

      <DisclaimerCard
        text="Preliminary health check only. Final assessment must be completed by a qualified doctor or authorised healthcare professional."
        variant="amber"
      />

      {validated && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
          <span>Initial health check validated and saved for {patient.name}.</span>
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
          1. Maternal Danger-Sign Checklist
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={bleeding}
              onChange={(e) => setBleeding(e.target.checked)}
              className="w-4 h-4 accent-teal-700"
            />
            <span className="font-bold text-rose-800">Vaginal Bleeding / Discharge</span>
          </label>

          <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={convulsions}
              onChange={(e) => setConvulsions(e.target.checked)}
              className="w-4 h-4 accent-teal-700"
            />
            <span className="font-bold text-rose-800">Convulsions / Fits</span>
          </label>

          <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={headacheVision}
              onChange={(e) => setHeadacheVision(e.target.checked)}
              className="w-4 h-4 accent-teal-700"
            />
            <span className="font-bold text-slate-800">Severe Headache & Blurred Vision</span>
          </label>

          <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
            <input
              type="checkbox"
              checked={swelling}
              onChange={(e) => setSwelling(e.target.checked)}
              className="w-4 h-4 accent-teal-700"
            />
            <span className="font-bold text-slate-800">Swelling of Face, Hands or Feet</span>
          </label>
        </div>

        {/* Vitals Input */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-2">
            2. Vitals Recorded Today
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Systolic BP (mmHg):</label>
              <input
                type="number"
                value={bpSystolic}
                onChange={(e) => setBpSystolic(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Diastolic BP (mmHg):</label>
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
              Calculated Priority Result
            </span>
            <StatusBadge status={calculatedRisk} />
          </div>

          <div className="space-y-1 text-xs text-teal-950">
            <span className="font-bold block">Noted Reasons:</span>
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
            <span>Confirm Initial Check</span>
          </button>

          <button
            type="button"
            onClick={() => router.push("/hw/referrals")}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Share2 className="w-4 h-4" />
            <span>Create Care Request</span>
          </button>
        </div>
      </div>
    </div>
  );
}
