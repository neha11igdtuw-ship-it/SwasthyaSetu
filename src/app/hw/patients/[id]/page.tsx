"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import { patientsApi, ApiError } from "@/lib/api/client";
import { patientOutToHealthWorkerPatient } from "@/lib/api/adapters";
import { derivePatientGaps } from "@/lib/careGaps";
import type { HealthWorkerPatient } from "@/lib/mockData";
import { Loader2 } from "lucide-react";
import {
  User,
  PhoneCall,
  MapPin,
  Calendar,
  AlertTriangle,
  Stethoscope,
  Share2,
  FileText,
  CheckCircle2,
  ArrowLeft,
  Activity,
  Clock,
} from "lucide-react";

export default function HWPatientDetailPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();

  const patientId = params?.id as string;

  const [patient, setPatient] = useState<HealthWorkerPatient | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!patientId) return;
      try {
        const data = await patientsApi.get(patientId);
        if (!cancelled) setPatient(patientOutToHealthWorkerPatient(data));
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof ApiError ? err.message : "Could not load this patient from the server."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const [contacted, setContacted] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 p-8">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading patient…
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
        {loadError || "Patient not found."}
      </div>
    );
  }

  const derivedGaps = derivePatientGaps(patient, [], [], []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={`${t("patientDetailsTitle")}: ${patient.name}`}
        subtitle={`ID: ${patient.id} • ${t("villageLabel")}: ${patient.village}`}
        roleBadge={<RoleBadge role="Health Worker" />}
        action={
          <Link
            href="/hw/patients"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("backToPeopleList")}</span>
          </Link>
        }
      />

      {loadError && (
        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 text-amber-900 text-xs font-semibold">
          {loadError}
        </div>
      )}

      {contacted && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
          <span>{t("visitRecordedSuccess")} ({patient.name})</span>
          <button
            type="button"
            onClick={() => setContacted(false)}
            className="text-[10px] underline font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 border border-teal-100 text-teal-700 flex items-center justify-center font-bold text-lg">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-slate-900 dark:text-white text-xl">
                  {patient.name}
                </h2>
                <StatusBadge status={patient.riskLevel} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {patient.age} {t("ageYears")} • {t("carePathwayLabelFull")}: <strong>{patient.carePathway === "Maternal Care" ? t("maternalCare") : patient.carePathway}</strong>
              </p>
            </div>
          </div>

          {/* Primary Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => router.push(`/hw/screening/${patient.id}`)}
              className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Stethoscope className="w-4 h-4" />
              <span>{t("startHealthCheck")}</span>
            </button>

            <Link
              href="/hw/referrals"
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              <span>{t("createCareRequest")}</span>
            </Link>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-0.5">{t("phoneLabelFull")}</span>
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
              <PhoneCall className="w-3 h-3 text-teal-700" />
              {patient.phone}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-0.5">{t("villageLabelFull")}</span>
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
              <MapPin className="w-3 h-3 text-teal-700" />
              {patient.village}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-0.5">{t("preferredLanguageLabelFull")}</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {patient.preferredLanguage}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block mb-0.5">{t("nextVisitLabel")}</span>
            <span className="font-bold text-teal-800 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-teal-700" />
              {patient.nextFollowUp}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Care Gaps & Recent Vitals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identified Care Gaps (Derived Live) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              {t("careGapsTitle")} (Derived Live)
            </h3>
          </div>

          <div className="space-y-2 text-xs">
            {derivedGaps.map((cg, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-900/30 border border-amber-200 text-amber-950 font-medium flex items-center gap-2"
              >
                <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>{cg}</span>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setContacted(true)}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-100 text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-teal-700" />
              <span>{t("recordVisitCompleted")}</span>
            </button>
          </div>
        </div>

        {/* Vitals & Recent Symptoms */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-700" />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                {t("latestHealthVitals")}
              </h3>
            </div>
            <span className="text-[10px] text-teal-800 font-bold bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded border border-teal-100">
              {t("savedOnThisDevice")}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400 block">{t("bloodPressure")}</span>
              <span className="text-sm font-extrabold text-rose-700">
                {patient.vitals?.bp || "120/80"} mmHg
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400 block">{t("hemoglobinLevel")}</span>
              <span className="text-sm font-extrabold text-rose-700">
                {patient.vitals?.hemoglobin || "11.0"} g/dL
              </span>
            </div>
          </div>

          {/* Maternal Details section shown ONLY for Maternal Care pathway */}
          {patient.carePathway === "Maternal Care" && patient.pregnancyWeek && (
            <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-900/30 border border-teal-100 text-xs space-y-1">
              <span className="font-bold text-teal-900 block">{t("sectionMaternalDetails")}:</span>
              <p className="text-teal-800">
                {t("pregnancyWeekLabel")}: <strong>Week {patient.pregnancyWeek}</strong> (EDD: {patient.edd})
              </p>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-xs space-y-1">
            <span className="font-bold text-slate-800 dark:text-slate-100 block">{t("reportedSymptoms")}</span>
            <p className="text-slate-600 dark:text-slate-300 font-medium">
              {patient.latestSymptoms?.join(", ") || "None"}
            </p>
          </div>
        </div>
      </div>

      {/* Documents & Screening Action Row */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-700" />
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              {t("savedDocumentsAndRecords")}
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {patient.uploadedDocuments?.length || 0} Documents Saved
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {patient.uploadedDocuments?.map((doc, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
            >
              <span className="font-bold text-slate-800 dark:text-slate-100">{doc}</span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-200">
                {t("available")}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => router.push(`/hw/screening/${patient.id}`)}
            className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Stethoscope className="w-4 h-4" />
            <span>{t("performHealthCheckBtn")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
