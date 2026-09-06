"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { DisclaimerCard } from "@/components/shared/DisclaimerCard";
import { Mic, MicOff, Volume2, ArrowRight, AlertTriangle } from "lucide-react";

export default function PatientSymptomsPage() {
  const router = useRouter();

  // Form state
  const [pregnancyWeek, setPregnancyWeek] = useState<number>(28);
  const [systolicBp, setSystolicBp] = useState<string>("145");
  const [diastolicBp, setDiastolicBp] = useState<string>("92");

  // Checkbox danger signs
  const [symptoms, setSymptoms] = useState({
    bleeding: false,
    abdominalPain: false,
    headache: true,
    blurredVision: true,
    swelling: true,
    fever: false,
    reducedFetalMovement: false,
  });

  const [voiceRecording, setVoiceRecording] = useState(false);
  const [textSymptomNotes, setTextSymptomNotes] = useState(
    "तेज सिरदर्द और धुंधलापन (Severe headache and blurred vision since last night)"
  );

  const handleCheckboxChange = (key: keyof typeof symptoms) => {
    setSymptoms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Determine care priority level
    let risk = "Low Risk";
    if (symptoms.headache || symptoms.blurredVision || symptoms.bleeding || parseInt(systolicBp) >= 140) {
      risk = "High Risk";
    } else if (symptoms.swelling || symptoms.abdominalPain) {
      risk = "Watch / Moderate";
    }

    const query = new URLSearchParams({
      risk,
      week: pregnancyWeek.toString(),
      bp: `${systolicBp}/${diastolicBp}`,
      headache: symptoms.headache ? "yes" : "no",
      vision: symptoms.blurredVision ? "yes" : "no",
      swelling: symptoms.swelling ? "yes" : "no",
    }).toString();

    router.push(`/patient/screening?${query}`);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Tell Symptoms By Voice or Text"
        subtitle="Maternal health symptom checklist and initial health check intake"
        roleBadge={<RoleBadge role="Patient" />}
      />

      <DisclaimerCard
        text="AI provides preliminary assistance only. Final clinical decisions remain with qualified health workers and doctors."
        variant="amber"
      />

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        {/* Voice Input Section */}
        <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-900 uppercase tracking-wide flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-teal-700" />
              Voice Input
            </span>
            <button
              type="button"
              onClick={() => setVoiceRecording(!voiceRecording)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 ${
                voiceRecording
                  ? "bg-rose-600 text-white animate-pulse"
                  : "bg-teal-700 text-white hover:bg-teal-800"
              }`}
            >
              {voiceRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{voiceRecording ? "Stop Recording" : "Record Voice Symptoms"}</span>
            </button>
          </div>

          <div className="p-3 bg-white rounded-lg border border-teal-100 text-xs text-slate-700 space-y-1">
            <span className="font-bold text-slate-900 block flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-teal-700" />
              Voice Message Recorded:
            </span>
            <p className="italic text-slate-800">“{textSymptomNotes}”</p>
          </div>
        </div>

        {/* Basic Vitals & Pregnancy Week Inputs */}
        <div className="space-y-4">
          <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-2">
            1. Vitals & Pregnancy Month
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Pregnancy Week (1-40):
              </label>
              <input
                type="number"
                min="1"
                max="42"
                value={pregnancyWeek}
                onChange={(e) => setPregnancyWeek(parseInt(e.target.value) || 28)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Systolic BP (mmHg):
              </label>
              <input
                type="number"
                value={systolicBp}
                onChange={(e) => setSystolicBp(e.target.value)}
                placeholder="120"
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Diastolic BP (mmHg):
              </label>
              <input
                type="number"
                value={diastolicBp}
                onChange={(e) => setDiastolicBp(e.target.value)}
                placeholder="80"
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Maternal Danger Signs Checkbox List */}
        <div className="space-y-3">
          <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>2. Select Any Symptoms You Feel</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 cursor-pointer">
              <input
                type="checkbox"
                checked={symptoms.headache}
                onChange={() => handleCheckboxChange("headache")}
                className="w-4 h-4 accent-teal-700"
              />
              <span className="font-semibold text-slate-800">Severe Continuous Headache</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 cursor-pointer">
              <input
                type="checkbox"
                checked={symptoms.blurredVision}
                onChange={() => handleCheckboxChange("blurredVision")}
                className="w-4 h-4 accent-teal-700"
              />
              <span className="font-semibold text-slate-800">Blurred Vision or Spots Before Eyes</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 cursor-pointer">
              <input
                type="checkbox"
                checked={symptoms.swelling}
                onChange={() => handleCheckboxChange("swelling")}
                className="w-4 h-4 accent-teal-700"
              />
              <span className="font-semibold text-slate-800">Swelling of Face, Hands or Feet</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 cursor-pointer">
              <input
                type="checkbox"
                checked={symptoms.abdominalPain}
                onChange={() => handleCheckboxChange("abdominalPain")}
                className="w-4 h-4 accent-teal-700"
              />
              <span className="font-semibold text-slate-800">Severe Abdominal Pain</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 cursor-pointer">
              <input
                type="checkbox"
                checked={symptoms.bleeding}
                onChange={() => handleCheckboxChange("bleeding")}
                className="w-4 h-4 accent-teal-700"
              />
              <span className="font-semibold text-rose-700">Vaginal Bleeding or Watery Discharge</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 cursor-pointer">
              <input
                type="checkbox"
                checked={symptoms.reducedFetalMovement}
                onChange={() => handleCheckboxChange("reducedFetalMovement")}
                className="w-4 h-4 accent-teal-700"
              />
              <span className="font-semibold text-rose-700">Reduced or Absent Fetal Movement</span>
            </label>
          </div>
        </div>

        {/* Text Area Notes */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 block">
            3. Additional Symptom Notes (Optional):
          </label>
          <textarea
            rows={2}
            value={textSymptomNotes}
            onChange={(e) => setTextSymptomNotes(e.target.value)}
            placeholder="Type any other symptoms..."
            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Submit & Generate Screening Button */}
        <button
          type="submit"
          className="w-full py-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm transition-colors inline-flex items-center justify-center gap-2 shadow-sm"
        >
          <span>Submit for Initial Health Check</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
