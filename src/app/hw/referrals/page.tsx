"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { hwReferralsList } from "@/lib/mockData";
import { Share2, Clock, ArrowRight } from "lucide-react";

export default function HWReferralsPage() {
  const [activeTab, setActiveTab] = useState<string>("All");

  const filteredReferrals = hwReferralsList.filter((ref) => {
    if (activeTab === "All") return true;
    if (activeTab === "Waiting") return ref.status === "Pending Acceptance";
    if (activeTab === "Accepted") return ref.status === "Accepted";
    if (activeTab === "Completed") return ref.status === "Completed";
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Care Request Management"
        subtitle="Track patient care requests sent from sub-centres to hospitals"
        roleBadge={<RoleBadge role="Health Worker" />}
        action={
          <Link
            href="/hw/patients"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            <span>Create New Care Request</span>
          </Link>
        }
      />

      {/* Tabs Row */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex gap-2 text-xs">
          {["All", "Waiting", "Accepted", "Completed"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl font-bold transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "bg-teal-700 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tab === "Waiting" ? "Waiting for action" : tab}
            </button>
          ))}
        </div>
        <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
          Showing {filteredReferrals.length} Care Requests
        </span>
      </div>

      {/* Referrals Cards Grid */}
      <div className="space-y-4">
        {filteredReferrals.map((ref) => (
          <div
            key={ref.id}
            className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="font-extrabold text-slate-900 text-base">
                  {ref.patientName}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  ({ref.patientId})
                </span>
                <StatusBadge status={ref.status} />
              </div>
              <span className="text-xs font-bold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200">
                {ref.priority} Priority
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block">Care Request Hospital:</span>
                <strong className="text-slate-900 font-bold">{ref.facilityName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Reason:</span>
                <strong className="text-slate-900 font-bold">{ref.reason}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Expected Visit Date:</span>
                <strong className="text-teal-800 font-bold">{ref.expectedVisitDate}</strong>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Created: {ref.createdDate}
              </span>

              <Link
                href={`/hw/patients/${ref.patientId}`}
                className="text-teal-700 font-bold hover:underline inline-flex items-center gap-1"
              >
                <span>View Person Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
