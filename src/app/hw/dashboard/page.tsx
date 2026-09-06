"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { DashboardCard } from "@/components/DashboardCard";
import { StatusBadge } from "@/components/StatusBadge";
import {
  mockHealthWorkerData,
  hwPatientsList,
  hwReferralsList,
} from "@/lib/mockData";
import {
  Users,
  AlertTriangle,
  Share2,
  Calendar,
  Clock,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  UserPlus,
  AlertOctagon,
  WifiOff,
  CheckCircle2,
} from "lucide-react";

export default function HealthWorkerDashboardPage() {
  const hw = mockHealthWorkerData;
  const [filterRisk, setFilterRisk] = useState<string>("All");

  const highRiskSectionPatients = hwPatientsList.filter((p) => {
    if (filterRisk === "All") return true;
    if (filterRisk === "High Risk") return p.riskLevel === "High Risk";
    if (filterRisk === "Medium Risk") return p.riskLevel === "Watch / Moderate";
    if (filterRisk === "Low Risk") return p.riskLevel === "Low Risk" || p.riskLevel === "Normal";
    if (filterRisk === "Follow-up Missed") return p.careGaps.some((cg) => cg.includes("overdue") || cg.includes("pending") || cg.includes("waiting"));
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <PageHeader
        title={`Welcome, Sunita Devi`}
        subtitle={`Assigned Village: Rampur Block • Sub-Centre Area 2 • Date: ${hw.currentDate}`}
        roleBadge={<RoleBadge role="Health Worker" />}
        action={
          <Link
            href="/hw/patients/register"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register Person</span>
          </Link>
        }
      />

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <DashboardCard
          title="Total People"
          value={hw.totalPatients}
          subtitle="Registered in village sector"
          icon={Users}
        />

        <DashboardCard
          title="High Priority Cases"
          value={hw.highRiskPatients}
          subtitle="Maternal & NCD priority"
          icon={AlertTriangle}
          highlight
        />

        <DashboardCard
          title="Care Requests"
          value={hw.pendingReferrals}
          subtitle="Waiting for hospital review"
          icon={Share2}
        />

        <DashboardCard
          title="Visits Due Today"
          value={hw.followUpsDueToday}
          subtitle="Scheduled home & clinic visits"
          icon={Calendar}
        />

        <DashboardCard
          title="Visits Missed"
          value={hw.missedFollowUps}
          subtitle="Follow-up required"
          icon={Clock}
        />

        <DashboardCard
          title="Unsent Records"
          value={hw.unsyncedRecordsCount}
          subtitle="Information waiting to be sent"
          icon={RefreshCw}
        />
      </div>

      {/* Priority Action List: People Needing Urgent Attention */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-lg">
                People Needing Urgent Attention Today
              </h2>
              <p className="text-xs text-slate-500">
                Prioritized by high care priority and missed visit deadlines
              </p>
            </div>
          </div>

          <span className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full w-fit">
            {hw.actionPatients.length} Actions Due Today
          </span>
        </div>

        {/* Priority Action Patients List */}
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
                  Village: {patient.village} • Action Needed: {patient.actionNeeded}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Deadline: {patient.dueTime}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/hw/patients/${patient.id}`}
                  className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                >
                  <span>Open Person Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* High-Risk Patient Section with Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-extrabold text-slate-900 text-lg">
              High Care Priority List
            </h2>
            <p className="text-xs text-slate-500">
              Filter registered mothers and patients by priority category and care status
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs">
            {["All", "High Risk", "Medium Risk", "Low Risk", "Follow-up Missed"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilterRisk(f)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                  filterRisk === f
                    ? "bg-teal-700 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {highRiskSectionPatients.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{p.name}</h4>
                  <span className="text-[11px] text-slate-500">
                    {p.age} Yrs • Village: {p.village}
                  </span>
                </div>
                <StatusBadge status={p.riskLevel} />
              </div>

              <div className="text-xs space-y-1 text-slate-600">
                {p.pregnancyWeek && (
                  <p>
                    <strong>Pregnancy:</strong> Week {p.pregnancyWeek} (EDD: {p.edd})
                  </p>
                )}
                <p>
                  <strong>Required Action:</strong> {p.requiredAction}
                </p>
                <p>
                  <strong>Care Request:</strong> {p.referralStatus}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-teal-800">
                  Next Visit: {p.nextFollowUp}
                </span>
                <Link
                  href={`/hw/patients/${p.id}`}
                  className="text-xs font-bold text-teal-700 hover:underline inline-flex items-center gap-1"
                >
                  <span>Details</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Care Request & Care Gap Summary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Care Request Summary Box */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-teal-700" />
              <h3 className="font-extrabold text-slate-900 text-base">
                Care Request Progress
              </h3>
            </div>
            <Link
              href="/hw/referrals"
              className="text-xs font-bold text-teal-700 hover:underline"
            >
              View All ({hwReferralsList.length})
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-amber-800 font-semibold block">Waiting for hospital response</span>
              <span className="text-xl font-extrabold text-amber-950 mt-1 block">2 Requests</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-emerald-800 font-semibold block">Accepted & Confirmed</span>
              <span className="text-xl font-extrabold text-emerald-950 mt-1 block">4 Requests</span>
            </div>
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200">
              <span className="text-sky-800 font-semibold block">Waiting for person visit</span>
              <span className="text-xl font-extrabold text-sky-950 mt-1 block">3 People</span>
            </div>
            <div className="p-3 rounded-xl bg-teal-50 border border-teal-200">
              <span className="text-teal-800 font-semibold block">Completed Treatment</span>
              <span className="text-xl font-extrabold text-teal-950 mt-1 block">8 Requests</span>
            </div>
          </div>
        </div>

        {/* Care-Gap Summary Box */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <AlertOctagon className="w-5 h-5 text-rose-600" />
            <h3 className="font-extrabold text-slate-900 text-base">
              Identified Care Gaps
            </h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-between">
              <div>
                <span className="font-bold text-rose-900 block">Care Request Not Accepted / Delayed</span>
                <span className="text-rose-700 text-[11px]">Pooja Sharma (P-9012) • Kalyanpur</span>
              </div>
              <span className="text-xs font-extrabold text-rose-800">Waiting &gt; 24h</span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between">
              <div>
                <span className="font-bold text-amber-900 block">Visit Overdue & Person Unreachable</span>
                <span className="text-amber-800 text-[11px]">Ramesh Chandra (P-4410) • Rampur</span>
              </div>
              <span className="text-xs font-extrabold text-amber-900">High BP</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Recommended Test Not Completed</span>
                <span className="text-slate-600 text-[11px]">Asha Devi (P-5521) • Sundarpur</span>
              </div>
              <span className="text-xs font-semibold text-slate-700">Test Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Device Records Banner */}
      <div className="p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-teal-400 flex items-center justify-center shrink-0">
            <WifiOff className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <span>Saved on Device Center</span>
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Last updated: Today at 9:00 AM • Information is saved on this device and sent automatically when internet returns.
            </p>
          </div>
        </div>

        <Link
          href="/hw/sync"
          className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Device Records</span>
        </Link>
      </div>
    </div>
  );
}
