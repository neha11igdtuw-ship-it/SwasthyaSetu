"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { DisclaimerCard } from "@/components/shared/DisclaimerCard";
import { useLanguage } from "@/lib/i18n/languageContext";
import { Mic, MicOff, Send, ArrowRight, Volume2, Sparkles } from "lucide-react";

export default function VoiceAssistantPage() {
  const { t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [transcript, setTranscript] = useState(
    "मुझे कल रात से तेज सिरदर्द हो रहा है और आंखों के सामने धुंधलापन दिख रहा है। पेट के निचले हिस्से में भी हल्का दर्द है।"
  );

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="multilingualVoiceAssistanceTitle"
        subtitle="multilingualVoiceAssistanceSubtitle"
        roleBadge={<RoleBadge role="Patient" />}
      />

      <DisclaimerCard
        text={t("voiceDisclaimer")}
        variant="amber"
      />

      {/* Voice Interaction Main Box */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm text-center space-y-6">
        <div className="space-y-2 max-w-md mx-auto">
          <span className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
            {t("exampleLabel")}
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
            {t("tellUsWhatFeeling")}
          </h2>
          <p className="text-xs text-slate-500">
            {t("speakInDialectInstructions")}
          </p>
        </div>

        {/* Large Microphone Button */}
        <div className="py-4 flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={toggleRecording}
            aria-label={t("changeLanguage")}
            className={`w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all shadow-md cursor-pointer ${
              isRecording
                ? "bg-rose-600 text-white ring-8 ring-rose-100 animate-pulse"
                : "bg-teal-700 hover:bg-teal-800 text-white ring-8 ring-teal-50 hover:scale-105"
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="w-10 h-10 mb-1" />
                <span className="text-[10px] font-extrabold uppercase">{t("stopRecording")}</span>
              </>
            ) : (
              <>
                <Mic className="w-10 h-10 mb-1" />
                <span className="text-[10px] font-extrabold uppercase">{t("tapAndSpeak")}</span>
              </>
            )}
          </button>
          <span className="text-xs font-semibold text-slate-600 mt-3">
            {isRecording ? t("listeningToVoice") : t("clickToSpeakSymptoms")}
          </span>
        </div>

        {/* Voice Transcript Display */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5 text-teal-800">
              <Volume2 className="w-4 h-4 text-teal-700" />
              {t("voiceMessageRecordedHindi")}
            </span>
            <span className="text-[10px] font-mono text-slate-400">{t("audioPreview")}</span>
          </div>
          <p className="text-sm font-medium text-slate-800 italic bg-white p-3 rounded-lg border border-slate-100 leading-relaxed">
            “{transcript}”
          </p>
          <p className="text-[11px] text-slate-500 italic">
            {t("englishTranslationLabel")} “I have had a severe headache since last night and blurred vision. There is also mild pain in my lower abdomen.”
          </p>
        </div>

        {/* Text Input Fallback */}
        <div className="pt-4 border-t border-slate-100 space-y-2 text-left">
          <label className="text-xs font-bold text-slate-700 block">
            {t("typeSymptomsHere")}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={t("typeSymptomsPlaceholder")}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            />
            <button
              type="button"
              onClick={() => {
                if (textInput.trim()) {
                  setTranscript(textInput);
                  setTextInput("");
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{t("submit")}</span>
            </button>
          </div>
        </div>

        {/* Continue to Symptoms & Screening Button */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{t("readyForCheckup")}</span>
          </div>

          <Link
            href="/patient/symptoms"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm transition-colors inline-flex items-center justify-center gap-2 shadow-sm"
          >
            <span>{t("proceedToSymptomChecklist")}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
