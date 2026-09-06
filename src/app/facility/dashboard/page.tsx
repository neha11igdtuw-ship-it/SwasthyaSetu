"use client";

import React from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { DashboardCard } from "@/components/DashboardCard";
import { StatusBadge } from "@/components/StatusBadge";
import { mockFacilityData } from "@/lib/mockData";
import {
  Inbox,
  CheckCircle2,
  Users,
  Clock,
  Building2,
  Activity,
  PackageCheck,
  Check,
  X,
  Repeat,
} from "lucide-react";

export default function FacilityDashboardPage() {
  const fac = mockFacilityData;

  return (
    <div className="space-y-6">
      <PageHeader
        title={fac.facilityName}
        subtitle={`${fac.type} • ${fac.district}`}
        roleBadge={<RoleBadge role="Healthcare Facility" />}
      />

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <DashboardCard
          title="New Care Requests"
          value={fac.incomingReferralsCount}
          subtitle="From health workers"
          icon={Inbox}
          highlight
        />

        <DashboardCard
          title="Accepted Requests"
          value={fac.acceptedReferralsCount}
          subtitle="Ready for arrival"
          icon={CheckCircle2}
        />

        <DashboardCard
          title="People Expected Today"
          value={fac.patientsExpectedToday}
          subtitle="Transit in progress"
          icon={Users}
        />

        <DashboardCard
          title="Pending Responses"
          value={fac.pendingFacilityResponsesCount}
          subtitle="Awaiting desk review"
          icon={Clock}
        />

        <DashboardCard
          title="Bed Occupancy"
          value="78%"
          subtitle={fac.bedOccupancyRate}
          icon={Building2}
        />
      </div>

      {/* Incoming Care Requests Desk & Medicine/Service Availability Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incoming Care Requests Management */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-extrabold text-slate-900 text-lg">
                New Care Requests Desk
              </h2>
              <p className="text-xs text-slate-500">
                Accept, redirect, or send feedback on incoming patient transfers
              </p>
            </div>
            <span className="text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 px-3 py-1 rounded-full w-fit">
              {fac.pendingFacilityResponsesCount} Pending Responses
            </span>
          </div>

          <div className="space-y-3">
            {fac.incomingReferrals.map((ref) => (
              <div
                key={ref.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {ref.patientName}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      ({ref.id})
                    </span>
                    <StatusBadge status={ref.status} />
                  </div>
                  <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                    {ref.urgency}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p>
                    <strong>From:</strong> {ref.referringSubCenter} |{" "}
                    <strong>Reason:</strong> {ref.reason}
                  </p>
                </div>

                {ref.status === "Pending Acceptance" && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Accept Care Request
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors inline-flex items-center gap-1"
                    >
                      <Repeat className="w-3.5 h-3.5" /> Redirect
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors inline-flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Send Back to Health Worker
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Available Services & Stock Card */}
        <div className="space-y-6">
          {/* Services Availability */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Activity className="w-5 h-5 text-teal-700" />
              <h3 className="font-bold text-slate-900 text-base">
                Services Available
              </h3>
            </div>

            <div className="space-y-3">
              {fac.availableServices.map((service) => (
                <div
                  key={service.name}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800 block">
                      {service.name}
                    </span>
                    <span className="text-slate-500 block text-[11px]">
                      {service.onDutyStaff}
                    </span>
                  </div>
                  <StatusBadge status={service.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Medicine & Lab Availability */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <PackageCheck className="w-5 h-5 text-teal-700" />
              <h3 className="font-bold text-slate-900 text-base">
                Medicine & Diagnostic Stock
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Blood Bank Stock:</span>
                <span className="font-bold text-slate-900">
                  {fac.stockAvailability.bloodBankUnits} Units
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Maternal ICU Beds:</span>
                <span className="font-bold text-slate-900">
                  {fac.stockAvailability.maternalIcuBeds} Free
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Oxytocin Stock:</span>
                <span className="font-bold text-emerald-700">
                  {fac.stockAvailability.oxytocinAvailability}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Essential ANC Meds:</span>
                <StatusBadge status={fac.stockAvailability.essentialMeds} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
