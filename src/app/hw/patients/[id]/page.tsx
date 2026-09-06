"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { hwPatientsList } from "@/lib/mockData";
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
  const params = useParams();
  const router = useRouter();
  const patientId = (params?.id as string) || "P-7821";

  // Find matching patient or fallback to Priya Sharma
  const patient =
    hwPatientsList.find((p) => p.id === patientId) || hwPatientsList[0];

  const [contacted, setContacted] = useState(false);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={`Person Details: ${patient.name}`}
        subtitle={`Patient ID: ${patient.id} • Village: ${patient.village}`}
        roleBadge={<RoleBadge role="Health Worker" />}
        action={
          <Link
            href="/hw/patients"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to People</span>
          </Link>
        }
      />

      {contacted && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
          <span>Home visit or phone contact recorded for {patient.name}.</span>
          <button
            type="button"
            onClick={() => setContacted(false)}
            className="text-[10px] underline font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-bold text-lg">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-slate-900 text-xl">
                  {patient.name}
                </h2>
                <StatusBadge status={patient.riskLevel} />
              </div>
              <p className="text-xs text-slate-500">
                {patient.age} Yrs • Pathway: <strong>{patient.carePathway}</strong>
              </p>
            </div>
          </div>

          {/* Primary Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push(`/hw/screening/${patient.id}`)}
              className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs"
            >
              <Stethoscope className="w-4 h-4" />
              <span>Start Health Check</span>
            </button>

            <Link
              href="/hw/referrals"
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <Share2 className="w-4 h-4" />
              <span>Care Request</span>
            </Link>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Phone Number</span>
            <span className="font-bold text-slate-900 flex items-center gap-1">
              <PhoneCall className="w-3 h-3 text-teal-700" />
              {patient.phone}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Village & Sector</span>
            <span className="font-bold text-slate-900 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-teal-700" />
              {patient.village}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Language</span>
            <span className="font-bold text-slate-900">
              {patient.preferredLanguage}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Next Visit</span>
            <span className="font-bold text-teal-800 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-teal-700" />
              {patient.nextFollowUp}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Care Gaps & Recent Vitals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identified Care Gaps */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-extrabold text-slate-900 text-base">
              Identified Care Gaps
            </h3>
          </div>

          <div className="space-y-2 text-xs">
            {patient.careGaps.map((cg, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-950 font-medium flex items-center gap-2"
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
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-teal-700" />
              <span>Record Contact / Visit Completed</span>
            </button>
          </div>
        </div>

        {/* Vitals & Recent Symptoms */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-700" />
              <h3 className="font-extrabold text-slate-900 text-base">
                Latest Health Vitals
              </h3>
            </div>
            <span className="text-[10px] text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
              Saved on Phone
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">Blood Pressure:</span>
              <span className="text-sm font-extrabold text-rose-700">
                {patient.vitals.bp} mmHg
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block">Hemoglobin Level:</span>
              <span className="text-sm font-extrabold text-rose-700">
                {patient.vitals.hemoglobin}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-1">
            <span className="font-bold text-slate-800 block">Latest Reported Symptoms:</span>
            <p className="text-slate-600 font-medium">
              {patient.latestSymptoms.join(", ")}
            </p>
          </div>
        </div>
      </div>

      {/* Documents & Care Request Status Row */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-700" />
            <h3 className="font-extrabold text-slate-900 text-base">
              Saved Documents & Records
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            {patient.uploadedDocuments.length} Documents Saved
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {patient.uploadedDocuments.map((doc, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
            >
              <span className="font-bold text-slate-800">{doc}</span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Available
              </span>
            </div>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => router.push(`/hw/screening/${patient.id}`)}
            className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-2 shadow-xs"
          >
            <Stethoscope className="w-4 h-4" />
            <span>Perform Initial Health Check</span>
          </button>
        </div>
      </div>
    </div>
  );
}
