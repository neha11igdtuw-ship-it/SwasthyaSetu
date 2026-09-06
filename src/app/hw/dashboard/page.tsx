import React from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { DashboardCard } from "@/components/DashboardCard";
import { StatusBadge } from "@/components/StatusBadge";
import { mockHealthWorkerData } from "@/lib/mockData";
import {
  Users,
  AlertTriangle,
  Share2,
  Calendar,
  Clock,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export default function HealthWorkerDashboardPage() {
  const hw = mockHealthWorkerData;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Field Dashboard: ${hw.ashaName}`}
        subtitle={`Area: ${hw.subCenter} • Active Caseload Monitoring`}
        roleBadge={<RoleBadge role="Health Worker" />}
        action={
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Records ({hw.unsyncedRecordsCount} Local)</span>
          </button>
        }
      />

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <DashboardCard
          title="Total Patients"
          value={hw.totalPatients}
          subtitle="Registered in sector"
          icon={Users}
        />

        <DashboardCard
          title="High-Risk Cases"
          value={hw.highRiskPatients}
          subtitle="Maternal / ANC priority"
          icon={AlertTriangle}
          highlight
        />

        <DashboardCard
          title="Pending Referrals"
          value={hw.pendingReferrals}
          subtitle="Awaiting facility acceptance"
          icon={Share2}
        />

        <DashboardCard
          title="Follow-ups Today"
          value={hw.followUpsDueToday}
          subtitle="Scheduled home visits"
          icon={Calendar}
        />

        <DashboardCard
          title="Missed Follow-ups"
          value={hw.missedFollowUps}
          subtitle="Escalation required"
          icon={Clock}
        />

        <DashboardCard
          title="Unsynced Records"
          value={hw.unsyncedRecordsCount}
          subtitle="IndexedDB cache pending"
          icon={RefreshCw}
        />
      </div>

      {/* Main Actionable List Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-lg">
                Patients Requiring Action Today
              </h2>
              <p className="text-xs text-slate-500">
                Prioritized by high-risk flags and missed follow-up deadlines
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full w-fit">
            {hw.actionPatients.length} Critical Actions Pending
          </span>
        </div>

        {/* Action Patients List */}
        <div className="divide-y divide-slate-100">
          {hw.actionPatients.map((patient) => (
            <div
              key={patient.id}
              className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors rounded-xl px-2"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-base">
                    {patient.name}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    ({patient.id})
                  </span>
                  <StatusBadge status={patient.riskLevel} />
                </div>
                <p className="text-xs font-semibold text-slate-800">
                  Village: {patient.village} • Action: {patient.actionNeeded}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Due Time: {patient.dueTime}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                >
                  <span>Record Visit / Vitals</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
