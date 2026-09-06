"use client";

import React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { hwPatientsList } from "@/lib/mockData";
import { ShieldAlert, PhoneCall, ArrowRight, Stethoscope } from "lucide-react";

export default function HWHighRiskPage() {
  const highRiskPatients = hwPatientsList.filter(
    (p) => p.riskLevel === "High Risk"
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="High Priority Cases"
        subtitle="Maternal care patients requiring urgent follow-up, visits, or hospital transfers"
        roleBadge={<RoleBadge role="Health Worker" />}
      />

      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 text-xs font-bold flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-700 shrink-0" />
          <span>{highRiskPatients.length} High priority patients in your village sector</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {highRiskPatients.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-base">{p.name}</h3>
                  <StatusBadge status={p.riskLevel} />
                </div>
                <span className="text-xs text-slate-500">
                  {p.age} Yrs • Village: {p.village}
                </span>
              </div>
              <a
                href={`tel:${p.phone}`}
                className="p-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200"
                title="Call Patient"
              >
                <PhoneCall className="w-4 h-4" />
              </a>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 space-y-1">
                <span className="font-bold text-rose-900 block">Care Priority Reasons:</span>
                <p className="text-rose-800">
                  BP: {p.vitals.bp} mmHg • Hemoglobin: {p.vitals.hemoglobin} • Reported: {p.latestSymptoms.join(", ")}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-800 block">Required Action:</span>
                <p className="text-slate-700">{p.requiredAction}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-teal-800">
                Next Visit: {p.nextFollowUp}
              </span>

              <div className="flex items-center gap-2">
                <Link
                  href={`/hw/screening/${p.id}`}
                  className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-1"
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Check</span>
                </Link>

                <Link
                  href={`/hw/patients/${p.id}`}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors inline-flex items-center gap-1"
                >
                  <span>Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
