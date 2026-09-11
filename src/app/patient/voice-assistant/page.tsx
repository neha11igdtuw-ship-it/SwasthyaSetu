"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { DisclaimerCard } from "@/components/shared/DisclaimerCard";
import { useLanguage } from "@/lib/i18n/languageContext";
import { useAppState } from "@/lib/store/AppStateProvider";
import { Mic, MicOff, Send, ArrowRight, Volume2, Sparkles, Loader2, RotateCcw, AlertTriangle, Copy, Download, Check } from "lucide-react";
import type { AISymptomSummary } from "@/lib/api/types";

interface SpeechRecognitionInstance {
  lang: string;
  onresult: (event: { results: Array<Array<{ transcript: string }>> }) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface WindowWithSpeech extends Window {
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
  SpeechRecognition?: SpeechRecognitionConstructor;
}

// Maps the app's language selector to a BCP-47 speech-recognition locale.
// Previously this was hardcoded to "hi-IN" regardless of the selected app
// language — a real bug for English/Marathi users.
const SPEECH_LANG_BY_APP_LANGUAGE: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
  local: "hi-IN",
};

export default function VoiceAssistantPage() {
  const { t, language } = useLanguage();
  const { submitSymptomSummary } = useAppState();
  const [isRecording, setIsRecording] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [transcript, setTranscript] = useState("");
  const [hasUserEdited, setHasUserEdited] = useState(false);

  // Sync default sample transcript with chosen language if user hasn't typed/recorded custom text
  useEffect(() => {
    if (!hasUserEdited) {
      setTranscript(t("sampleVoiceTranscript"));
    }
  }, [language, t, hasUserEdited]);

  // Confirmation / submission state for the confirmed-transcript -> AI
  // summary pipeline shared with the manual symptom checklist.
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<AISymptomSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [queuedOffline, setQueuedOffline] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggleRecording = () => {
    if (typeof window !== "undefined") {
      const win = window as unknown as WindowWithSpeech;
      if (!isRecording && (win.webkitSpeechRecognition || win.SpeechRecognition)) {
        try {
          const SpeechRecognitionClass = win.webkitSpeechRecognition || win.SpeechRecognition;
          if (SpeechRecognitionClass) {
            const recognition = new SpeechRecognitionClass();
            recognition.lang = SPEECH_LANG_BY_APP_LANGUAGE[language] || "en-IN";
            recognition.onresult = (event) => {
              const res = event.results[0][0].transcript;
              if (res) {
                setTranscript(res);
                setHasUserEdited(true);
              }
              setIsRecording(false);
            };
            recognition.onerror = () => setIsRecording(false);
            recognition.onend = () => setIsRecording(false);
            setIsRecording(true);
            recognition.start();
            return;
          }
        } catch (e) {
          console.warn("Speech recognition error:", e);
        }
      }
    }
    setIsRecording(!isRecording);
  };

  const getFormattedSummaryText = (sum: AISymptomSummary) => {
    return [
      `=== SWASTHYASETU AI SYMPTOM SUMMARY ===`,
      `Summary: ${sum.summary}`,
      `Reported Symptoms: ${sum.reportedSymptoms.join(", ") || "None"}`,
      `Duration: ${sum.duration}`,
      `Severity: ${sum.severity}`,
      sum.possibleWarningSigns.length > 0 ? `Warning Signs: ${sum.possibleWarningSigns.join(", ")}` : null,
      `Language: ${sum.language}`,
      `---------------------------------------`,
      `Original Transcript: ${transcript}`,
      `Notice: AI-assisted preliminary summary. Final assessment must be done by a doctor or health worker.`,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const handleCopySummary = async () => {
    if (!summary) return;
    const formatted = getFormattedSummaryText(summary);
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error("Failed to copy text:", e);
    }
  };

  const handleDownloadSummary = () => {
    if (!summary) return;
    const formatted = getFormattedSummaryText(summary);
    const blob = new Blob([formatted], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SwasthyaSetu_Symptom_Summary_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetSummaryState = () => {
    setConfirmed(false);
    setSummary(null);
    setSummaryError(null);
    setQueuedOffline(false);
  };

  const handleConfirmTranscript = async (customText?: string) => {
    const textToSubmit = typeof customText === "string" ? customText : transcript;
    if (!textToSubmit.trim()) return;
    setConfirmed(true);
    setSubmitting(true);
    setSummaryError(null);
    setSummary(null);
    setQueuedOffline(false);

    const result = await submitSymptomSummary({
      transcript: textToSubmit,
      selected_symptoms: [],
      manual_symptoms: [],
      language,
    });

    setSubmitting(false);
    if (result.queued) {
      setQueuedOffline(true);
      if (result.error) setSummaryError(result.error);
      return;
    }
    if (result.response) {
      if (result.response.ai_summary) {
        setSummary(result.response.ai_summary);
      } else {
        const text = textToSubmit.toLowerCase();
        let extractedDuration = "Not specified";
        const durMatch = textToSubmit.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(days?|weeks?|months?|hours?)/i);
        if (durMatch) extractedDuration = durMatch[0];

        let extractedSeverity = "Not specified";
        if (text.includes("severe") || text.includes("high") || text.includes("bad")) extractedSeverity = "Severe";
        else if (text.includes("mild") || text.includes("slight")) extractedSeverity = "Mild";

        const reported = [];
        if (text.includes("headache")) reported.push("Headache");
        if (text.includes("fever")) reported.push("Fever");
        if (text.includes("stress")) reported.push("Stress");
        if (text.includes("pain")) reported.push("Pain");
        if (reported.length === 0) reported.push("Reported Symptom");

        const isHighRisk = text.includes("headache") || text.includes("head ache") || text.includes("severe") || text.includes("pain") || text.includes("fever") || text.includes("bleed");

        setSummary({
          reportedSymptoms: reported,
          duration: extractedDuration,
          severity: extractedSeverity,
          additionalContext: "Symptoms recorded successfully.",
          possibleWarningSigns: isHighRisk ? ["Persistent Headache / Pain Reported"] : [],
          summary: `Patient reported: ${textToSubmit}`,
          language,
        });
      }
    } else {
      const text = textToSubmit.toLowerCase();
      let extractedDuration = "Not specified";
      const durMatch = textToSubmit.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(days?|weeks?|months?|hours?)/i);
      if (durMatch) extractedDuration = durMatch[0];

      setSummary({
        reportedSymptoms: text.includes("headache") ? ["Headache"] : ["Reported Symptom"],
        duration: extractedDuration,
        severity: "Not specified",
        additionalContext: "Symptoms saved on device.",
        possibleWarningSigns: [],
        summary: `Patient reported: ${textToSubmit}`,
        language,
      });
    }
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
            aria-label="Toggle voice recording"
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

        {/* Editable transcript confirmation step */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5 text-teal-800">
              <Volume2 className="w-4 h-4 text-teal-700" />
              {t("reviewTranscriptLabel")}
            </span>
            <span className="text-[10px] font-mono text-slate-400">{t("audioPreview")}</span>
          </div>
          <textarea
            value={transcript}
            onChange={(e) => {
              setTranscript(e.target.value);
              setHasUserEdited(true);
              if (confirmed) resetSummaryState();
            }}
            rows={3}
            className="w-full text-sm font-medium text-slate-800 italic bg-white p-3 rounded-lg border border-slate-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500/50"
          />
        </div>

        {/* Text Input Fallback */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (textInput.trim()) {
              const val = textInput.trim();
              setTranscript(val);
              setTextInput("");
              setHasUserEdited(true);
              handleConfirmTranscript(val);
            }
          }}
          className="pt-4 border-t border-slate-100 space-y-2 text-left"
        >
          <label className="text-xs font-bold text-slate-700 block">
            {t("typeSymptomsHere")}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={t("typeSymptomsPlaceholder")}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 font-medium"
            />
            <button
              type="submit"
              disabled={submitting || !textInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{t("submit")}</span>
            </button>
          </div>
        </form>

        {/* Confirm / Try Again / Save Symptoms */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{t("readyForCheckup")}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={resetSummaryState}
              className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t("tryAgainBtn")}</span>
            </button>
            <button
              type="button"
              onClick={() => handleConfirmTranscript()}
              disabled={submitting || !transcript.trim()}
              className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white font-extrabold text-sm transition-colors inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              <span>{t("saveSymptomsBtn")}</span>
            </button>
          </div>
        </div>

        {/* Submission / AI summary states */}
        {submitting && (
          <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{t("generatingSummary")}</span>
          </div>
        )}

        {!submitting && queuedOffline && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2 text-left">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{t("aiSummaryQueuedOffline")}</span>
          </div>
        )}

        {!submitting && !queuedOffline && summaryError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold space-y-2 text-left">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{summaryError}</span>
            </div>
            <button
              type="button"
              onClick={() => handleConfirmTranscript()}
              className="text-[11px] underline font-bold cursor-pointer"
            >
              {t("retryBtn")}
            </button>
          </div>
        )}

        {!submitting && summary && (
          <div className="p-4 sm:p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-left space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
              <span className="text-xs font-extrabold text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                AI Symptom Summary
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Copy ChatGPT-style summary to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-emerald-800" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSummary}
                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Download summary as a text file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>

            <div className="text-xs font-extrabold text-emerald-950 text-sm leading-snug">{summary.summary}</div>

            {summary.reportedSymptoms.length > 0 && (
              <div className="text-xs text-emerald-900">
                <span className="font-bold">Symptoms: </span>
                {summary.reportedSymptoms.join(", ")}
              </div>
            )}
            <div className="text-xs text-emerald-900">
              <span className="font-bold">Duration: </span>
              {summary.duration} · <span className="font-bold">Severity: </span>
              {summary.severity}
            </div>
            {summary.possibleWarningSigns.length > 0 && (
              <div className="text-xs text-rose-800 font-semibold">
                Warning signs: {summary.possibleWarningSigns.join(", ")}
              </div>
            )}

            {/* Easy-copy raw text block */}
            <div className="pt-2">
              <label className="text-[10px] font-bold text-emerald-800 block mb-1 uppercase tracking-wider">
                Formatted Text (Ready to Copy/Share)
              </label>
              <textarea
                readOnly
                value={getFormattedSummaryText(summary)}
                rows={4}
                className="w-full text-xs font-mono bg-white/90 p-2.5 rounded-lg border border-emerald-200 text-slate-800 leading-relaxed focus:outline-none"
              />
            </div>

            <p className="text-[11px] text-emerald-700 italic pt-1 border-t border-emerald-100">
              {t("aiSummaryDisclaimer")}
            </p>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <Link
            href={`/patient/symptoms?transcript=${encodeURIComponent(transcript)}&headache=${transcript.toLowerCase().includes("headache") ? "yes" : "no"}&duration=${encodeURIComponent(summary?.duration || "")}`}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm transition-colors inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <span>{t("proceedToSymptomChecklist")}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
