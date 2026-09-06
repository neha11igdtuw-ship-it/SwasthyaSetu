"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { DisclaimerCard } from "@/components/shared/DisclaimerCard";
import {
  Building2,
  Share2,
  PhoneCall,
  AlertTriangle,
} from "lucide-react";

function ScreeningContent() {
  const searchParams = useSearchParams();

  const risk = searchParams.get("risk") || "High Risk";
  const bp = searchParams.get("bp") || "145/92";
  const week = searchParams.get("week") || "28";

  const reasons = [
    `Higher blood pressure reading: ${bp} mmHg at ${week} weeks gestation`,
    "Reported persistent headache and blurred vision",
    "Swelling in feet recorded",
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Preliminary Health Check Result"
        subtitle="Initial assessment from your reported symptoms"
        roleBadge={<RoleBadge role="Patient" />}
      />

      <DisclaimerCard
        text="This is an initial health check, not a final medical decision. Review by a qualified health worker or doctor is required."
        variant="amber"
      />

      {/* Main Screening Risk Result Box */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Result
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
              Care Priority Category:
            </h2>
          </div>
          <StatusBadge status={risk} className="text-sm px-3 py-1" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-700 block">
            Key Health Indicators Noted:
          </span>
          <div className="space-y-2 text-xs text-slate-700">
            {reasons.map((r, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="font-semibold">{r}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Action Summary */}
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-950 space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-wide text-teal-900 block">
            Recommended Next Step:
          </span>
          <p className="text-sm font-bold leading-relaxed">
            Visit District Hospital for doctor evaluation and lab checks.
          </p>
        </div>

        {/* Action Buttons Grid */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/patient/facilities"
            className="p-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 shadow-xs"
          >
            <Building2 className="w-4 h-4" />
            <span>View Nearby Hospitals</span>
          </Link>

          <Link
            href="/patient/referrals"
            className="p-3.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 shadow-xs"
          >
            <Share2 className="w-4 h-4" />
            <span>Request Care Transfer</span>
          </Link>

          <Link
            href="/patient/emergency-help"
            className="p-3.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 shadow-xs"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Contact Health Worker</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PatientScreeningPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold">Loading health check result...</div>}>
      <ScreeningContent />
    </Suspense>
  );
}
