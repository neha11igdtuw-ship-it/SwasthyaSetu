"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { hwPatientsList } from "@/lib/mockData";
import { useLanguage } from "@/lib/i18n/languageContext";
import { Search, UserPlus, ArrowRight, Filter, AlertTriangle } from "lucide-react";

export default function HWPatientListPage() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [pathwayFilter, setPathwayFilter] = useState("All");

  const filteredPatients = hwPatientsList.filter((p) => {
    // Search matching name, village, or ID
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.village.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase());

    // Filter matching risk level
    const matchesRisk =
      riskFilter === "All" ||
      (riskFilter === "High Risk" && p.riskLevel === "High Risk") ||
      (riskFilter === "Watch / Moderate" && p.riskLevel === "Watch / Moderate") ||
      (riskFilter === "Low Risk" && (p.riskLevel === "Low Risk" || p.riskLevel === "Normal"));

    // Filter matching pathway
    const matchesPathway =
      pathwayFilter === "All" || p.carePathway === pathwayFilter;

    return matchesSearch && matchesRisk && matchesPathway;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title={t("patientsListTitle")}
        subtitle={t("patientsListSubtitle")}
        roleBadge={<RoleBadge role="Health Worker" />}
        action={
          <Link
            href="/hw/patients/register"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t("hwRegister")}</span>
          </Link>
        }
      />

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("searchPatientsPlaceholder")}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-bold">
            <Filter className="w-3.5 h-3.5 text-teal-700" />
            <span>{t("filterByPriority")}</span>
          </div>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none font-semibold text-slate-800"
          >
            <option value="All">{t("allPriorities")}</option>
            <option value="High Risk">{t("filterUrgent")}</option>
            <option value="Watch / Moderate">{t("filterModerate")}</option>
            <option value="Low Risk">{t("filterLow")}</option>
          </select>

          <select
            value={pathwayFilter}
            onChange={(e) => setPathwayFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none font-semibold text-slate-800"
          >
            <option value="All">{t("allPathways")}</option>
            <option value="Maternal Care">{t("maternalCare")}</option>
            <option value="Hypertension">{t("hypertension")}</option>
            <option value="Diabetes">{t("diabetes")}</option>
          </select>
        </div>
      </div>

      {/* Patient Cards / Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
          <span>{t("registeredPatientsCount")} ({filteredPatients.length})</span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredPatients.map((p) => (
            <div
              key={p.id}
              className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-slate-900 text-base">
                    {p.name}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    ({p.id})
                  </span>
                  <StatusBadge status={p.riskLevel} />
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-100">
                    {p.carePathway === "Maternal Care" ? t("maternalCare") : p.carePathway}
                  </span>
                </div>

                <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    {t("ageLabel")} <strong>{p.age} {t("ageYears")}</strong>
                  </span>
                  <span>
                    {t("villageLabel")}: <strong>{p.village}</strong>
                  </span>
                  {p.pregnancyWeek && (
                    <span className="text-teal-900 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                      {t("pregnancyWeekLabel")}: <strong>Week {p.pregnancyWeek}</strong> (EDD: {p.edd})
                    </span>
                  )}
                  <span>
                    {t("phoneLabel")}: <strong>{p.phone}</strong>
                  </span>
                </div>

                {/* Vitals, Symptoms and Danger signs summary */}
                <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-700 flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    <strong>{t("bloodPressure")}:</strong> {p.vitals.bp} mmHg
                  </span>
                  <span>
                    <strong>{t("hemoglobinLevel")}:</strong> {p.vitals.hemoglobin} g/dL
                  </span>
                  {p.latestSymptoms.length > 0 && (
                    <span className="flex items-center gap-1 text-rose-800 font-medium">
                      <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                      <strong>{t("reportedSymptoms")}:</strong> {p.latestSymptoms.join(", ")}
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                  <span>
                    {t("lastVisitLabel")}: <strong>{p.lastVisit}</strong>
                  </span>
                  <span>
                    {t("nextVisitLabel")}: <strong>{p.nextFollowUp}</strong>
                  </span>
                  <span>
                    {t("careRequestStatusLabel")}: <strong>{p.referralStatus}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/hw/patients/${p.id}`}
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs"
                >
                  <span>{t("openPatientDetails")}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}

          {filteredPatients.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              {t("noPatientsFound")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
