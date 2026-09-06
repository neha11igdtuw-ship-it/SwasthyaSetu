"use client";

import React from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { EmergencyHelpCard } from "@/components/patient/EmergencyHelpCard";
import { priyaPatientMock } from "@/lib/mockData";
import { ShieldAlert, AlertTriangle, CheckCircle2, PhoneCall, Building2 } from "lucide-react";

export default function PatientEmergencyHelpPage() {
  const p = priyaPatientMock;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Emergency Help"
        subtitle="Maternal danger signs requiring urgent hospital evaluation"
        roleBadge={<RoleBadge role="Patient" />}
      />

      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
        <div>
          <span className="block text-sm font-extrabold mb-0.5">
            EMERGENCY ASSISTANCE PROTOCOL
          </span>
          <p className="font-normal text-rose-800">
            Clicking call buttons will simulate phone calls to your health worker or emergency services.
          </p>
        </div>
      </div>

      {/* Main Emergency Card Component */}
      <EmergencyHelpCard ashaPhone={p.profile.assignedASHAPhone} />

      {/* Emergency Symptoms Checklist */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <h3 className="font-extrabold text-slate-900 text-base">
            Maternal Danger Signs — Get Help Immediately If You Have:
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-800">
          {p.emergencySymptoms.map((symptom, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-bold">{symptom}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Direct Quick Dial Action Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Health Worker Contact
          </span>
          <h4 className="font-extrabold text-slate-900 text-base">
            ASHA Worker Meena Devi
          </h4>
          <p className="text-xs text-slate-600">
            Assigned frontline health worker for Rampur Village.
          </p>
          <a
            href={`tel:${p.profile.assignedASHAPhone}`}
            className="w-full py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 mt-2"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Call ASHA Worker ({p.profile.assignedASHAPhone})</span>
          </a>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Nearest Hospital
          </span>
          <h4 className="font-extrabold text-slate-900 text-base">
            District Civil Hospital
          </h4>
          <p className="text-xs text-slate-600">
            24/7 Maternal Emergency Unit (8.5 km away).
          </p>
          <a
            href="/patient/facilities"
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 mt-2"
          >
            <Building2 className="w-4 h-4" />
            <span>View Hospital Details</span>
          </a>
        </div>
      </div>
    </div>
  );
}
