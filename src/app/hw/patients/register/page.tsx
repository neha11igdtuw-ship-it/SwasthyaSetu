"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import { useAppState } from "@/lib/store/AppStateProvider";
import { patientsApi, ApiError } from "@/lib/api/client";
import { CheckCircle2, UserPlus, ArrowLeft, Loader2 } from "lucide-react";

type CarePathwayOption = "Maternal Care" | "Hypertension" | "Diabetes" | "General Primary Care";

export default function HWRegisterPatientPage() {
  const { t } = useLanguage();
  const { addPatient } = useAppState();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: "Anita Devi",
    age: "24",
    phone: "+91 98765 11223",
    village: "Rampur",
    preferredLanguage: "Hindi",
    carePathway: "Maternal Care" as CarePathwayOption,
    pregnancyWeek: "24",
    edd: "2026-12-15",
    systolicBp: "128",
    diastolicBp: "84",
    pulse: "78",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const created = await patientsApi.create({
        full_name: formData.fullName,
        phone: formData.phone,
        village: formData.village,
      });

      addPatient({
        id: created.id,
        name: formData.fullName,
        age: parseInt(formData.age) || 24,
        village: formData.village,
        phone: formData.phone,
        carePathway: formData.carePathway,
        pregnancyWeek: formData.carePathway === "Maternal Care" ? parseInt(formData.pregnancyWeek) || 24 : undefined,
        edd: formData.carePathway === "Maternal Care" ? formData.edd : undefined,
        riskLevel: "Low Risk",
        lastVisit: "Today",
        nextFollowUp: "Next Week",
        referralStatus: "None",
        careGaps: [],
        requiredAction: "Routine checkup and vitals log",
        preferredLanguage: formData.preferredLanguage,
        vitals: {
          bp: `${formData.systolicBp}/${formData.diastolicBp}`,
          hemoglobin: "11.5",
        },
        latestSymptoms: ["Routine Checkup"],
        uploadedDocuments: [],
      });

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to register patient with server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={t("registerPatientTitle")}
        subtitle={t("registerPatientSubtitle")}
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

      {submitted ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 border border-slate-200/80 dark:border-slate-700 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            {t("personSuccessfullyRegistered")}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
            {formData.fullName} ({formData.village}) - {t("personRegisteredSuccessMsg")} (Saved to the server).
          </p>

          <div className="pt-4 flex justify-center gap-3">
            <Link
              href="/hw/patients"
              className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors"
            >
              {t("viewAllPeopleRecords")}
            </Link>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              {t("registerAnotherPerson")}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-6">
          {/* Section 1: Basic Personal Details */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base border-b border-slate-100 dark:border-slate-700 pb-2">
              {t("sectionBasicDetails")}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{t("fullNameLabel")}</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{t("ageLabel")}</label>
                <input
                  type="number"
                  required
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{t("phoneLabelFull")}</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{t("villageLabelFull")}</label>
                <input
                  type="text"
                  required
                  value={formData.village}
                  onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{t("preferredLanguageLabelFull")}</label>
                <select
                  value={formData.preferredLanguage}
                  onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                >
                  <option>Hindi</option>
                  <option>Bhojpuri</option>
                  <option>Maithili</option>
                  <option>English</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{t("carePathwayLabelFull")}</label>
                <select
                  value={formData.carePathway}
                  onChange={(e) => setFormData({ ...formData, carePathway: e.target.value as CarePathwayOption })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-teal-800"
                >
                  <option value="Maternal Care">{t("maternalCare")}</option>
                  <option value="Hypertension">{t("hypertension")}</option>
                  <option value="Diabetes">{t("diabetes")}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Maternal Specific Info */}
          {formData.carePathway === "Maternal Care" && (
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base border-b border-slate-100 dark:border-slate-700 pb-2">
                {t("sectionMaternalDetails")}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{t("pregnancyWeekInputLabel")}</label>
                  <input
                    type="number"
                    value={formData.pregnancyWeek}
                    onChange={(e) => setFormData({ ...formData, pregnancyWeek: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{t("eddLabel")}</label>
                  <input
                    type="date"
                    value={formData.edd}
                    onChange={(e) => setFormData({ ...formData, edd: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Baseline Vitals */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base border-b border-slate-100 dark:border-slate-700 pb-2">
              {t("sectionBaselineVitals")}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{t("systolicBpLabel")}</label>
                <input
                  type="number"
                  value={formData.systolicBp}
                  onChange={(e) => setFormData({ ...formData, systolicBp: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{t("diastolicBpLabel")}</label>
                <input
                  type="number"
                  value={formData.diastolicBp}
                  onChange={(e) => setFormData({ ...formData, diastolicBp: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{t("pulseLabel")}</label>
                <input
                  type="number"
                  value={formData.pulse}
                  onChange={(e) => setFormData({ ...formData, pulse: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white font-extrabold text-sm transition-colors inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>{t("completeRegistrationBtn")}</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
