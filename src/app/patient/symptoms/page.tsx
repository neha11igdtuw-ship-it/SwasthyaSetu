"use client";

import React, { Suspense, useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { DisclaimerCard } from "@/components/shared/DisclaimerCard";
import { useLanguage } from "@/lib/i18n/languageContext";
import { useAppState } from "@/lib/store/AppStateProvider";
import { useSpeechRecognition } from "@/lib/speech/useSpeechRecognition";
import { resolveDuration } from "@/lib/symptoms/duration";
import { assessMaternalRisk, detectSymptomsFromText } from "@/lib/symptoms/assessRisk";
import { loadOwnPatient } from "@/lib/api/ownPatient";
import { isMaternalPathway, hasChosenPathway } from "@/lib/carePathways";
import { Mic, MicOff, Volume2, ArrowRight, AlertTriangle, Plus, X, Radio } from "lucide-react";

function PatientSymptomsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const { updatePatientScreening } = useAppState();

  // Which pathway is this actually for? Determined from the authenticated
  // patient's confirmed care pathway — never assumed to be maternal.
  const [patientId, setPatientId] = useState<string | null>(null);
  const [carePathway, setCarePathway] = useState<string | null>(null);
  const [pathwayLoaded, setPathwayLoaded] = useState(false);
  const isMaternal = isMaternalPathway(carePathway);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await loadOwnPatient();
      if (cancelled) return;
      setPatientId(me?.id || null);
      setCarePathway(me?.care_pathway || null);
      setPathwayLoaded(true);
      if (me && !hasChosenPathway(me.care_pathway)) {
        router.replace("/patient/onboarding");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Read voice assistant URL parameters
  const initialTranscript = searchParams.get("transcript") || "";
  const detected = detectSymptomsFromText(initialTranscript);
  const initialHeadache = searchParams.get("headache") === "yes" || Boolean(detected.headache);

  // Form state — start from normal vitals; do not pre-tick danger signs.
  // Pregnancy week has NO default: it stays null/undefined unless this
  // patient is actually on the Maternal Care pathway.
  const [pregnancyWeek, setPregnancyWeek] = useState<number | "">("");
  const [systolicBp, setSystolicBp] = useState<string>("120");
  const [diastolicBp, setDiastolicBp] = useState<string>("80");

  const [symptoms, setSymptoms] = useState({
    bleeding: Boolean(detected.bleeding),
    abdominalPain: Boolean(detected.abdominalPain),
    headache: initialHeadache,
    blurredVision: searchParams.get("vision") === "yes" || Boolean(detected.blurredVision),
    swelling: searchParams.get("swelling") === "yes" || Boolean(detected.swelling),
    fever: Boolean(detected.fever),
    reducedFetalMovement: Boolean(detected.reducedFetalMovement),
  });

  const [customSymptoms, setCustomSymptoms] = useState<string[]>([]);
  const [newCustomSymptom, setNewCustomSymptom] = useState("");

  const handleAddCustomSymptom = () => {
    const trimmed = newCustomSymptom.trim();
    if (trimmed) {
      setCustomSymptoms((prev) => [...prev, trimmed]);
      setNewCustomSymptom("");
    }
  };

  const handleRemoveCustomSymptom = (idx: number) => {
    setCustomSymptoms((prev) => prev.filter((_, i) => i !== idx));
  };

  const [textSymptomNotes, setTextSymptomNotes] = useState(initialTranscript);
  const notesRef = useRef(textSymptomNotes);
  notesRef.current = textSymptomNotes;

  const { isRecording: voiceRecording, speechError, start: startVoiceRecording, stop: stopVoiceRecording } =
    useSpeechRecognition({
      language,
      getText: () => notesRef.current,
      isPlaceholder: (text) => !text.trim(),
      onText: (text) => setTextSymptomNotes(text),
    });

  const toggleVoiceRecording = () => {
    if (voiceRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  const handleCheckboxChange = (key: keyof typeof symptoms) => {
    setSymptoms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const assessment = assessMaternalRisk({
      systolicBp: parseInt(systolicBp, 10),
      diastolicBp: parseInt(diastolicBp, 10),
      headache: symptoms.headache,
      blurredVision: symptoms.blurredVision,
      swelling: symptoms.swelling,
      bleeding: symptoms.bleeding,
      abdominalPain: symptoms.abdominalPain,
      fever: symptoms.fever,
      reducedFetalMovement: symptoms.reducedFetalMovement,
    });
    const riskLevel = assessment.riskLevel;
    const duration = resolveDuration(searchParams.get("duration"), textSymptomNotes);

    const activeSymptomsList: string[] = [];
    if (symptoms.headache) activeSymptomsList.push("Continuous Headache");
    if (symptoms.blurredVision) activeSymptomsList.push("Blurred Vision");
    if (symptoms.swelling) activeSymptomsList.push("Swelling");
    if (symptoms.bleeding) activeSymptomsList.push("Vaginal Bleeding");
    if (symptoms.abdominalPain) activeSymptomsList.push("Abdominal Pain");
    if (symptoms.fever) activeSymptomsList.push("Fever");
    if (symptoms.reducedFetalMovement) activeSymptomsList.push("Reduced Fetal Movement");
    activeSymptomsList.push(...customSymptoms);

    // This only updates the local health-worker demo view for the matching
    // patient id, if any — it does not touch the authenticated patient's
    // real backend record. Never fall back to another patient's id here.
    if (patientId) {
      updatePatientScreening(patientId, {
        riskLevel,
        bp: `${systolicBp}/${diastolicBp}`,
        week: isMaternal && pregnancyWeek ? Number(pregnancyWeek) : undefined,
        symptoms: activeSymptomsList,
        carePathway: carePathway || undefined,
      });
    }

    const queryParams: Record<string, string> = {
      risk: riskLevel,
      bp: `${systolicBp}/${diastolicBp}`,
      headache: symptoms.headache ? "yes" : "no",
      vision: symptoms.blurredVision ? "yes" : "no",
      swelling: symptoms.swelling ? "yes" : "no",
      bleeding: symptoms.bleeding ? "yes" : "no",
      abdominal: symptoms.abdominalPain ? "yes" : "no",
      fever: symptoms.fever ? "yes" : "no",
      fetal: symptoms.reducedFetalMovement ? "yes" : "no",
      duration,
      notes: textSymptomNotes.slice(0, 400),
      pathway: carePathway || "",
    };
    // Only carry a pregnancy week forward when this is actually a maternal
    // case — general/child/chronic/emergency patients should never see a
    // "Pregnancy Week" figure on their screening result.
    if (isMaternal && pregnancyWeek) {
      queryParams.week = pregnancyWeek.toString();
    }

    const query = new URLSearchParams(queryParams).toString();

    router.push(`/patient/screening?${query}`);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="tellSymptomsVoiceTextTitle"
        subtitle={isMaternal ? "maternalChecklistSubtitle" : "generalChecklistSubtitle"}
        roleBadge={<RoleBadge role="Patient" />}
      />

      <DisclaimerCard
        text={t("aiPreliminaryNotice")}
        variant="amber"
      />

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-6">
        {/* Voice Input Section */}
        <div className="p-4 rounded-xl bg-teal-50/70 dark:bg-teal-900/30 border border-teal-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-900 uppercase tracking-wide flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-teal-700" />
              {t("voiceInput")}
            </span>
            <button
              type="button"
              onClick={toggleVoiceRecording}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer ${
                voiceRecording
                  ? "bg-rose-600 text-white animate-pulse"
                  : "bg-teal-700 text-white hover:bg-teal-800"
              }`}
            >
              {voiceRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{voiceRecording ? t("stopRecording") : t("recordVoiceSymptoms")}</span>
            </button>
          </div>

          {speechError && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-900">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{speechError}</span>
            </div>
          )}

          {voiceRecording ? (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-900">
              <Radio className="w-3.5 h-3.5 text-rose-600 animate-pulse shrink-0" />
              <span>{t("voicePauseOkHint")}</span>
            </div>
          ) : (
            <p className="text-[11px] text-teal-800">{t("voiceAppendHint")}</p>
          )}

          <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-teal-100 text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white block flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-teal-700" />
              {t("voiceMessageRecordedHindi")}
            </span>
            <p className="italic text-slate-800 dark:text-slate-100">“{textSymptomNotes}”</p>
          </div>
        </div>

        {/* Basic Vitals & (Maternal-only) Pregnancy Week Inputs */}
        <div className="space-y-4">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base border-b border-slate-100 dark:border-slate-700 pb-2">
            {isMaternal ? t("vitalsPregnancyMonth") : t("basicVitalsHeading")}
          </h3>

          <div className={`grid grid-cols-1 ${isMaternal ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-4 text-xs`}>
            {isMaternal && (
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {t("pregnancyWeekRange")}
                </label>
                <input
                  type="number"
                  min="1"
                  max="42"
                  value={pregnancyWeek}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPregnancyWeek(val === "" ? "" : parseInt(val, 10) || "");
                  }}
                  placeholder="e.g. 24"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>
            )}

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {t("systolicBpLabel")}
              </label>
              <input
                type="number"
                value={systolicBp}
                onChange={(e) => setSystolicBp(e.target.value)}
                placeholder="120"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {t("diastolicBpLabel")}
              </label>
              <input
                type="number"
                value={diastolicBp}
                onChange={(e) => setDiastolicBp(e.target.value)}
                placeholder="80"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Maternal Danger Signs Checkbox List */}
        <div className="space-y-3">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base border-b border-slate-100 dark:border-slate-700 pb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>{t("selectSymptomsYouFeel")}</span>
          </h3>
          {!pathwayLoaded && (
            <p className="text-[11px] text-slate-400">{t("loadingYourAccount")}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={symptoms.headache}
                onChange={() => handleCheckboxChange("headache")}
                className="w-4 h-4 accent-teal-700"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-100">{t("severeContinuousHeadache")}</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={symptoms.blurredVision}
                onChange={() => handleCheckboxChange("blurredVision")}
                className="w-4 h-4 accent-teal-700"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-100">{t("blurredVisionOrSpots")}</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={symptoms.swelling}
                onChange={() => handleCheckboxChange("swelling")}
                className="w-4 h-4 accent-teal-700"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-100">{t("swellingFaceHandsFeet")}</span>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={symptoms.abdominalPain}
                onChange={() => handleCheckboxChange("abdominalPain")}
                className="w-4 h-4 accent-teal-700"
              />
              <span className="font-semibold text-slate-800 dark:text-slate-100">{t("severeAbdominalPain")}</span>
            </label>

            {isMaternal && (
              <>
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={symptoms.bleeding}
                    onChange={() => handleCheckboxChange("bleeding")}
                    className="w-4 h-4 accent-teal-700"
                  />
                  <span className="font-semibold text-rose-700">{t("vaginalBleedingDischarge")}</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={symptoms.reducedFetalMovement}
                    onChange={() => handleCheckboxChange("reducedFetalMovement")}
                    className="w-4 h-4 accent-teal-700"
                  />
                  <span className="font-semibold text-rose-700">{t("reducedFetalMovement")}</span>
                </label>
              </>
            )}
          </div>

          {/* Custom symptom entries */}
          {customSymptoms.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {customSymptoms.map((sym, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/30 border border-teal-200 text-teal-900"
                >
                  {sym}
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomSymptom(idx)}
                    className="cursor-pointer text-teal-700 hover:text-rose-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={newCustomSymptom}
              onChange={(e) => setNewCustomSymptom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustomSymptom();
                }
              }}
              placeholder={t("addAnotherSymptomPlaceholder")}
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="button"
              onClick={handleAddCustomSymptom}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {t("addAnotherSymptom")}
            </button>
          </div>
        </div>

        {/* Text Area Notes */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
            {t("additionalSymptomNotes")}
          </label>
          <textarea
            rows={2}
            value={textSymptomNotes}
            onChange={(e) => setTextSymptomNotes(e.target.value)}
            placeholder="Type any other symptoms..."
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Submit & Generate Screening Button */}
        <button
          type="submit"
          className="w-full py-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm transition-colors inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          <span>{t("submitInitialHealthCheck")}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

export default function PatientSymptomsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading symptom checklist...</div>}>
      <PatientSymptomsContent />
    </Suspense>
  );
}
