import React from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { DashboardCard } from "@/components/DashboardCard";
import { StatusBadge } from "@/components/StatusBadge";
import { mockDoctorData } from "@/lib/mockData";
import {
  Stethoscope,
  AlertTriangle,
  Share2,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function DoctorDashboardPage() {
  const doc = mockDoctorData;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Clinical Review: ${doc.doctorName}`}
        subtitle={`${doc.qualification} • ${doc.facility}`}
        roleBadge={<RoleBadge role="Doctor" />}
      />

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <DashboardCard
          title="Cases Awaiting Review"
          value={doc.casesAwaitingReview}
          subtitle="Pending clinical validation"
          icon={Stethoscope}
          highlight
        />

        <DashboardCard
          title="High-Risk Cases"
          value={doc.highRiskCases}
          subtitle="Maternal / ANC priority"
          icon={AlertTriangle}
        />

        <DashboardCard
          title="Pending Referrals"
          value={doc.pendingReferrals}
          subtitle="From sub-centres / ASHAs"
          icon={Share2}
        />

        <DashboardCard
          title="Today's Follow-ups"
          value={doc.todaysFollowUpsCount}
          subtitle="Teleconsult & OPD queue"
          icon={Calendar}
        />
      </div>

      {/* Doctor Cases Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-extrabold text-slate-900 text-lg">
              Referred & Assigned Patient Cases
            </h2>
            <p className="text-xs text-slate-500">
              Review preliminary AI triage summaries and validate care recommendations
            </p>
          </div>
          <span className="text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200 px-3 py-1 rounded-full w-fit">
            {doc.recentCases.length} Cases Requiring Validation
          </span>
        </div>

        {/* Case Cards List */}
        <div className="space-y-4">
          {doc.recentCases.map((c) => (
            <div
              key={c.id}
              className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-extrabold text-slate-900 text-base">
                    {c.patientName}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    ({c.id}, {c.age} yrs)
                  </span>
                  <StatusBadge status={c.preliminaryRisk} />
                </div>
                <div className="text-xs text-slate-500">
                  Referred by:{" "}
                  <span className="font-bold text-slate-800">{c.referredBy}</span>
                </div>
              </div>

              {/* AI Draft Summary Placeholder Box */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-950 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>AI-generated draft; doctor validation required</span>
                </div>
                <p className="text-xs leading-relaxed">{c.aiSummaryDraft}</p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  <span>Status: <strong className="text-slate-900">{c.status}</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>Validate & Add Prescription</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
