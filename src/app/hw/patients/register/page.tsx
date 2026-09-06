"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import { CheckCircle2, UserPlus, ArrowLeft } from "lucide-react";

export default function HWRegisterPatientPage() {
  const { t } = useLanguage();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "Anita Devi",
    age: "24",
    gender: "Female",
    phone: "+91 98765 11223",
    village: "Rampur",
    preferredLanguage: "Hindi",
    carePathway: "Maternal Care",
    pregnancyWeek: "24",
    edd: "2026-12-15",
    systolicBp: "128",
    diastolicBp: "84",
    pulse: "78",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
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
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("backToPeopleList")}</span>
          </Link>
        }
      />

      {submitted ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">
            {t("personSuccessfullyRegistered")}
          </h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            {formData.fullName} ({formData.village}) - {t("personRegisteredSuccessMsg")}
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
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              {t("registerAnotherPerson")}
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          {/* Section 1: Basic Personal Details */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-2">
              {t("sectionBasicDetails")}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{t("fullNameLabel")}</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{t("ageLabel")}</label>
                <input
                  type="number"
                  required
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{t("phoneLabelFull")}</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{t("villageLabelFull")}</label>
                <input
                  type="text"
                  required
                  value={formData.village}
                  onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{t("preferredLanguageLabelFull")}</label>
                <select
                  value={formData.preferredLanguage}
                  onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                >
                  <option>Hindi</option>
                  <option>Bhojpuri</option>
                  <option>Maithili</option>
                  <option>English</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{t("carePathwayLabelFull")}</label>
                <select
                  value={formData.carePathway}
                  onChange={(e) => setFormData({ ...formData, carePathway: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-teal-800"
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
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-2">
                {t("sectionMaternalDetails")}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{t("pregnancyWeekInputLabel")}</label>
                  <input
                    type="number"
                    value={formData.pregnancyWeek}
                    onChange={(e) => setFormData({ ...formData, pregnancyWeek: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">{t("eddLabel")}</label>
                  <input
                    type="date"
                    value={formData.edd}
                    onChange={(e) => setFormData({ ...formData, edd: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Baseline Vitals */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-2">
              {t("sectionBaselineVitals")}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{t("systolicBpLabel")}</label>
                <input
                  type="number"
                  value={formData.systolicBp}
                  onChange={(e) => setFormData({ ...formData, systolicBp: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{t("diastolicBpLabel")}</label>
                <input
                  type="number"
                  value={formData.diastolicBp}
                  onChange={(e) => setFormData({ ...formData, diastolicBp: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{t("pulseLabel")}</label>
                <input
                  type="number"
                  value={formData.pulse}
                  onChange={(e) => setFormData({ ...formData, pulse: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-sm transition-colors inline-flex items-center justify-center gap-2 shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t("completeRegistrationBtn")}</span>
          </button>
        </form>
      )}
    </div>
  );
}
