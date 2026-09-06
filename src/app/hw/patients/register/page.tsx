"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { CheckCircle2, UserPlus, ArrowLeft } from "lucide-react";

export default function HWRegisterPatientPage() {
  const [submitted, setRequested] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "Anita Devi",
    age: "24",
    gender: "Female",
    phone: "+91 98765 11223",
    village: "Rampur",
    preferredLanguage: "Hindi",
    emergencyContact: "+91 98765 99887",
    carePathway: "Maternal Care",
    pregnancyWeek: "24",
    edd: "2026-12-15",
    systolicBp: "128",
    diastolicBp: "84",
    pulse: "78",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRequested(true);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Register Person"
        subtitle="ASHA/ANM offline-first person intake and registration form"
        roleBadge={<RoleBadge role="Health Worker" />}
        action={
          <Link
            href="/hw/patients"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to People List</span>
          </Link>
        }
      />

      {submitted ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Person Successfully Registered!
          </h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            {formData.fullName} ({formData.village}) has been registered and saved on this phone. Record will send automatically when connected.
          </p>

          <div className="pt-4 flex justify-center gap-3">
            <Link
              href="/hw/patients"
              className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors"
            >
              View All People Records
            </Link>
            <button
              type="button"
              onClick={() => setRequested(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
            >
              Register Another Person
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          {/* Section 1: Basic Demographics */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-2">
              1. Basic Personal Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name:</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Age (Years):</label>
                <input
                  type="number"
                  required
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Phone Number:</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Assigned Village:</label>
                <input
                  type="text"
                  required
                  value={formData.village}
                  onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Preferred Spoken Language:</label>
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
                <label className="font-bold text-slate-700 block mb-1">Care Pathway:</label>
                <select
                  value={formData.carePathway}
                  onChange={(e) => setFormData({ ...formData, carePathway: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-teal-800"
                >
                  <option>Maternal Care</option>
                  <option>Hypertension</option>
                  <option>Diabetes</option>
                  <option>General Primary Care</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Maternal Specific Info */}
          {formData.carePathway === "Maternal Care" && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-2">
                2. Antenatal Care (ANC) Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pregnancy Month / Week:</label>
                  <input
                    type="number"
                    value={formData.pregnancyWeek}
                    onChange={(e) => setFormData({ ...formData, pregnancyWeek: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Expected Delivery Date (EDD):</label>
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
              3. Baseline Health Vitals
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Systolic BP (mmHg):</label>
                <input
                  type="number"
                  value={formData.systolicBp}
                  onChange={(e) => setFormData({ ...formData, systolicBp: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Diastolic BP (mmHg):</label>
                <input
                  type="number"
                  value={formData.diastolicBp}
                  onChange={(e) => setFormData({ ...formData, diastolicBp: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Pulse (bpm):</label>
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
            <span>Complete Person Registration</span>
          </button>
        </form>
      )}
    </div>
  );
}
