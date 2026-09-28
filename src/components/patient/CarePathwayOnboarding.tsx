"use client";

import React, { useState } from "react";
import {
  Stethoscope,
  Baby,
  Activity,
  HeartPulse,
  AlertOctagon,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { patientsApi } from "@/lib/api/client";
import type { PatientOut } from "@/lib/api/types";
import { CARE_PATHWAY_OPTIONS } from "@/lib/carePathway";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "General Health Problem": Stethoscope,
  "Pregnancy / Maternal Care": Baby,
  "Child Healthcare": Activity,
  "Chronic Condition": HeartPulse,
  Emergency: AlertOctagon,
  Other: HelpCircle,
};

interface CarePathwayOnboardingProps {
  /** The signed-in patient's own record (base_version is required to save). */
  patient: PatientOut;
  /** Called with the freshly-updated patient record once a pathway is saved. */
  onSelected: (updated: PatientOut) => void;
}

/**
 * First-time onboarding screen shown to a patient whose backend record has
 * `care_pathway = null` (i.e. every brand-new registration). Nothing here
 * reads from mock/seed data — the choice is written straight to the
 * authenticated patient's own record via PATCH /patients/me, so it is
 * completely isolated to this account.
 */
export function CarePathwayOnboarding({ patient, onSelected }: CarePathwayOnboardingProps) {
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (value: string) => {
    if (saving) return;
    setSaving(value);
    setError(null);
    try {
      const updated = await patientsApi.updateMe({
        base_version: patient.version,
        care_pathway: value,
      });
      onSelected(updated);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save your choice. Please check your connection and try again."
      );
      setSaving(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 sm:py-10 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          What brings you to SwasthyaSetu?
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Choose the option that best describes why you&apos;re here. This helps us
          personalize your care journey — you can update this later from your profile.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-rose-900 dark:text-rose-200 text-xs font-bold text-center">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CARE_PATHWAY_OPTIONS.map((opt) => {
          const Icon = ICONS[opt.value] || HelpCircle;
          const isSaving = saving === opt.value;
          const isDisabled = saving !== null && !isSaving;

          return (
            <button
              key={opt.value}
              type="button"
              disabled={saving !== null}
              onClick={() => handleSelect(opt.value)}
              aria-busy={isSaving}
              className={`text-left p-5 rounded-2xl border-2 bg-white dark:bg-slate-800 transition-all space-y-2 cursor-pointer ${
                isDisabled
                  ? "opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-700"
                  : "border-slate-200 dark:border-slate-700 hover:border-teal-500 hover:shadow-md"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                {opt.label}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {opt.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
