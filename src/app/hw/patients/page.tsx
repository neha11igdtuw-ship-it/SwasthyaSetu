"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { hwPatientsList } from "@/lib/mockData";
import { Search, UserPlus, ArrowRight, Filter } from "lucide-react";

export default function HWPatientListPage() {
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
        title="People Records & Caseload"
        subtitle="Search and manage registered patients across assigned sub-centre villages"
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

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, village, or ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-bold">
            <Filter className="w-3.5 h-3.5 text-teal-700" />
            <span>Filters:</span>
          </div>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none font-semibold text-slate-800"
          >
            <option value="All">All Care Priorities</option>
            <option value="High Risk">High Priority</option>
            <option value="Watch / Moderate">Watch / Moderate</option>
            <option value="Low Risk">Low Priority / Normal</option>
          </select>

          <select
            value={pathwayFilter}
            onChange={(e) => setPathwayFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none font-semibold text-slate-800"
          >
            <option value="All">All Pathways</option>
            <option value="Maternal Care">Maternal Care</option>
            <option value="Hypertension">Hypertension</option>
            <option value="Diabetes">Diabetes</option>
          </select>
        </div>
      </div>

      {/* Patient Cards / Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
          <span>Registered People ({filteredPatients.length})</span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredPatients.map((p) => (
            <div
              key={p.id}
              className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-base">
                    {p.name}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    ({p.id})
                  </span>
                  <StatusBadge status={p.riskLevel} />
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-100">
                    {p.carePathway}
                  </span>
                </div>

                <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    Age: <strong>{p.age} Yrs</strong>
                  </span>
                  <span>
                    Village: <strong>{p.village}</strong>
                  </span>
                  {p.pregnancyWeek && (
                    <span>
                      Pregnancy: <strong>Week {p.pregnancyWeek}</strong>
                    </span>
                  )}
                  <span>
                    Phone: <strong>{p.phone}</strong>
                  </span>
                </div>

                <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                  <span>
                    Last Visit: <strong>{p.lastVisit}</strong>
                  </span>
                  <span>
                    Next Visit: <strong>{p.nextFollowUp}</strong>
                  </span>
                  <span>
                    Care Request: <strong>{p.referralStatus}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/hw/patients/${p.id}`}
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs"
                >
                  <span>Open Person Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}

          {filteredPatients.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              No records match the selected search criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
