"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { hwReferralsList, hwPatientsList, HWReferral } from "@/lib/mockData";
import { useLanguage } from "@/lib/i18n/languageContext";
import { Share2, Clock, ArrowRight, Plus, CheckCircle2, X } from "lucide-react";

export default function HWReferralsPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>("All");
  const [referrals, setReferrals] = useState<HWReferral[]>(hwReferralsList);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  // Modal form state
  const [selectedPatientId, setSelectedPatientId] = useState("P-7821");
  const [facilityName, setFacilityName] = useState("District Civil Hospital & Maternal Care Centre");
  const [reason, setReason] = useState("Pre-eclampsia screening & Anemia Management");
  const [priority, setPriority] = useState<"High" | "Medium" | "Routine">("High");
  const [expectedDate, setExpectedDate] = useState("2026-09-08");

  const filteredReferrals = referrals.filter((ref) => {
    if (activeTab === "All") return true;
    if (activeTab === "Waiting") return ref.status === "Pending Acceptance";
    if (activeTab === "Accepted") return ref.status === "Accepted";
    if (activeTab === "Completed") return ref.status === "Completed";
    return true;
  });

  const handleCreateReferral = (e: React.FormEvent) => {
    e.preventDefault();
    const p = hwPatientsList.find((item) => item.id === selectedPatientId) || hwPatientsList[0];

    const newRef: HWReferral = {
      id: `REF-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      patientId: p.id,
      patientName: p.name,
      facilityName,
      reason,
      priority,
      createdDate: "Today",
      expectedVisitDate: expectedDate,
      status: "Pending Acceptance",
      currentStep: "Created",
    };

    setReferrals([newRef, ...referrals]);
    setShowCreateModal(false);
    setSuccessMsg(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title={t("careRequestsTitle")}
        subtitle={t("careRequestsSubtitle")}
        roleBadge={<RoleBadge role="Health Worker" />}
        action={
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t("createNewCareRequestBtn")}</span>
          </button>
        }
      />

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{t("careRequestSubmittedSuccess")}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(false)}
            className="text-[10px] underline font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs Row */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex gap-2 text-xs">
          {[
            { id: "All", label: t("filterAll") },
            { id: "Waiting", label: t("waitingHospitalResponse") },
            { id: "Accepted", label: t("acceptedAndConfirmed") },
            { id: "Completed", label: t("completedTreatment") },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl font-bold transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-teal-700 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
          Showing {filteredReferrals.length} {t("newCareRequests")}
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
              <div className="flex items-center gap-2.5 flex-wrap">
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
                <span className="text-slate-400 block">{t("careRequestHospital")}</span>
                <strong className="text-slate-900 font-bold">{ref.facilityName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">{t("reasonForTransfer")}</span>
                <strong className="text-slate-900 font-bold">{ref.reason}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">{t("expectedVisitDate")}</span>
                <strong className="text-teal-800 font-bold">{ref.expectedVisitDate}</strong>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {t("createdDate")}: {ref.createdDate}
              </span>

              <Link
                href={`/hw/patients/${ref.patientId}`}
                className="text-teal-700 font-bold hover:underline inline-flex items-center gap-1"
              >
                <span>{t("viewPatientDetails")}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Create Care Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <Share2 className="w-5 h-5 text-teal-700" />
                <span>{t("createReferralModalTitle")}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReferral} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{t("selectPatient")}</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                >
                  {hwPatientsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id}) - {p.village}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{t("selectHospital")}</label>
                <select
                  value={facilityName}
                  onChange={(e) => setFacilityName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-800"
                >
                  <option>District Civil Hospital & Maternal Care Centre</option>
                  <option>Community Health Centre (CHC) Kalyanpur</option>
                  <option>Sub-Centre Rampur</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{t("referralReason")}</label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{t("priorityLevel")}</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as "High" | "Medium" | "Routine")}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-rose-800"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Routine">Routine</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">{t("expectedVisitDate")}</label>
                  <input
                    type="date"
                    required
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold transition-colors shadow-xs"
                >
                  {t("submitCareRequestBtn")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
