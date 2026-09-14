"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { DisclaimerCard } from "@/components/shared/DisclaimerCard";
import { useLanguage } from "@/lib/i18n/languageContext";
import { useSpeechRecognition } from "@/lib/speech/useSpeechRecognition";
import { loadOwnPatient } from "@/lib/api/ownPatient";
import { patientsApi } from "@/lib/api/client";
import type { PatientOut } from "@/lib/api/types";
import {
  CARE_PATHWAYS,
  CarePathway,
  classifyPathwayFromText,
} from "@/lib/carePathways";
import {
  Stethoscope,
  Baby,
  Users,
  HeartPulse,
  AlertOctagon,
  MoreHorizontal,
  Mic,
  MicOff,
  Loader2,
  Sparkles,
  Check,
  RotateCcw,
} from "lucide-react";

type Step = "choose" | "confirm" | "saving";

const CATEGORY_OPTIONS: Array<{
  pathway: CarePathway;
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  defaultTitle: string;
  descKey: string;
  defaultDesc: string;
}> = [
  {
    pathway: CARE_PATHWAYS.GENERAL,
    icon: Stethoscope,
    titleKey: "onboardingCategoryGeneral",
    defaultTitle: "General Health Problem",
    descKey: "onboardingCategoryGeneralDesc",
    defaultDesc: "Fever, cough, pain, or any everyday health concern.",
  },
  {
    pathway: CARE_PATHWAYS.MATERNAL,
    icon: Baby,
    titleKey: "onboardingCategoryMaternal",
    defaultTitle: "Pregnancy / Maternal Care",
    descKey: "onboardingCategoryMaternalDesc",
    defaultDesc: "Pregnancy checkups, danger signs, or postnatal care.",
  },
  {
    pathway: CARE_PATHWAYS.CHILD,
    icon: Users,
    titleKey: "onboardingCategoryChild",
    defaultTitle: "Child Healthcare",
    descKey: "onboardingCategoryChildDesc",
    defaultDesc: "Health concerns for your child.",
  },
  {
    pathway: CARE_PATHWAYS.CHRONIC,
    icon: HeartPulse,
    titleKey: "onboardingCategoryChronic",
    defaultTitle: "Chronic Condition",
    descKey: "onboardingCategoryChronicDesc",
    defaultDesc: "Ongoing care for diabetes, blood pressure, and similar conditions.",
  },
  {
    pathway: CARE_PATHWAYS.EMERGENCY,
    icon: AlertOctagon,
    titleKey: "onboardingCategoryEmergency",
    defaultTitle: "Emergency",
    descKey: "onboardingCategoryEmergencyDesc",
    defaultDesc: "Urgent, immediate help is needed right now.",
  },
  {
    pathway: CARE_PATHWAYS.OTHER,
    icon: MoreHorizontal,
    titleKey: "onboardingCategoryOther",
    defaultTitle: "Other",
    descKey: "onboardingCategoryOtherDesc",
    defaultDesc: "Something else not listed here.",
  },
];

export default function PatientOnboardingPage() {
  const router = useRouter();
  const { t, language } = useLanguage();

  const [patient, setPatient] = useState<PatientOut | null>(null);
  const [loadingPatient, setLoadingPatient] = useState(true);

  const [step, setStep] = useState<Step>("choose");
  const [description, setDescription] = useState("");
  const notesRef = useRef(description);
  notesRef.current = description;

  const [suggestion, setSuggestion] = useState<{
    care_pathway: CarePathway;
    confidence: number;
    reason: string;
  } | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { isRecording, speechError, start, stop } = useSpeechRecognition({
    language,
    getText: () => notesRef.current,
    isPlaceholder: (text) => !text.trim(),
    onText: (text) => setDescription(text),
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await loadOwnPatient();
      if (cancelled) return;
      setPatient(me);
      setLoadingPatient(false);
      // Already onboarded — nothing to do here.
      if (me?.care_pathway) {
        router.replace("/patient/dashboard");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const toggleRecording = () => {
    if (isRecording) stop();
    else start();
  };

  const handleSelectCategory = (pathway: CarePathway) => {
    setSuggestion({
      care_pathway: pathway,
      confidence: 1,
      reason: t("onboardingManualSelectionReason"),
    });
    setStep("confirm");
  };

  const handleDescribeContinue = async () => {
    const text = description.trim();
    if (!text) return;

    setClassifying(true);
    try {
      const result = await patientsApi.classifyPathway({ description: text, language });
      setSuggestion(result);
    } catch (err) {
      console.warn("onboarding: classify-pathway API failed, using local fallback", err);
      setSuggestion(classifyPathwayFromText(text));
    } finally {
      setClassifying(false);
      setStep("confirm");
    }
  };

  const handleChooseAnother = () => {
    setStep("choose");
  };

  const handleConfirm = async () => {
    if (!suggestion || !patient) return;
    setStep("saving");
    setSaveError(null);
    try {
      await patientsApi.updateMe({
        base_version: patient.version,
        care_pathway: suggestion.care_pathway,
      });
      router.replace("/patient/dashboard");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Could not save your care pathway. Please try again."
      );
      setStep("confirm");
    }
  };

  if (loadingPatient) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 gap-2 text-sm">
        <Loader2 className="w-5 h-5 animate-spin" />
        {t("loadingYourAccount") || "Loading your account…"}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="onboardingTitle"
        subtitle="onboardingSubtitle"
        roleBadge={<RoleBadge role="Patient" />}
      />

      <DisclaimerCard text={t("onboardingDisclaimer")} variant="info" />

      {step === "choose" && (
        <div className="space-y-6">
          {/* Option A — select category */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              {t("onboardingSelectCaseTitle")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CATEGORY_OPTIONS.map(({ pathway, icon: Icon, titleKey, defaultTitle, descKey, defaultDesc }) => (
                <button
                  key={pathway}
                  type="button"
                  onClick={() => handleSelectCategory(pathway)}
                  className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 hover:border-teal-400 hover:bg-teal-50/70 dark:hover:bg-teal-900/30 transition-colors cursor-pointer flex items-start gap-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="block font-bold text-sm text-slate-900 dark:text-white">
                      {t(titleKey) !== titleKey ? t(titleKey) : defaultTitle}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {t(descKey) !== descKey ? t(descKey) : defaultDesc}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Option B — describe in own words */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              {t("onboardingDescribeTitle")}
            </h3>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-900 dark:text-teal-300 uppercase tracking-wide flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-teal-700" />
                {t("voiceInput")}
              </span>
              <button
                type="button"
                onClick={toggleRecording}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer ${
                  isRecording ? "bg-rose-600 text-white animate-pulse" : "bg-teal-700 text-white hover:bg-teal-800"
                }`}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isRecording ? t("stopRecording") : t("recordVoiceSymptoms")}</span>
              </button>
            </div>

            {speechError && (
              <div className="text-[11px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-900">
                {speechError}
              </div>
            )}

            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("onboardingDescribePlaceholder")}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />

            <button
              type="button"
              disabled={!description.trim() || classifying}
              onClick={handleDescribeContinue}
              className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm transition-colors inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {classifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t("onboardingClassifying")}</span>
                </>
              ) : (
                <span>{t("continueLabel") || "Continue"}</span>
              )}
            </button>
          </div>
        </div>
      )}

      {(step === "confirm" || step === "saving") && suggestion && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-700" />
            <span className="text-xs font-extrabold uppercase tracking-wide text-teal-800">
              {t("onboardingSuggestionLabel")}
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-teal-50 dark:bg-teal-900/30 border border-teal-200 text-center space-y-2">
            <span className="block text-2xl font-extrabold text-teal-950 dark:text-teal-100">
              {suggestion.care_pathway}
            </span>
            <p className="text-xs text-teal-900 dark:text-teal-200 font-medium">{suggestion.reason}</p>
          </div>

          {saveError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
              {saveError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              disabled={step === "saving"}
              onClick={handleConfirm}
              className="py-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white font-extrabold text-sm transition-colors inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {step === "saving" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{t("onboardingConfirmContinue")}</span>
            </button>
            <button
              type="button"
              disabled={step === "saving"}
              onClick={handleChooseAnother}
              className="py-3.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-60 text-slate-800 dark:text-slate-100 font-extrabold text-sm transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t("onboardingChooseAnother")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
