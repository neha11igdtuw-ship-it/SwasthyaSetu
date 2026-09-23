"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import { authApi, encountersApi, patientsApi, pregnanciesApi, referralsApi, ApiError } from "@/lib/api/client";
import { patientOutToHealthWorkerPatient } from "@/lib/api/adapters";
import type { ReferralOut, PregnancyOut, ScreeningOut, PatientOut } from "@/lib/api/types";
import type { HealthWorkerPatient } from "@/lib/mockData";
import { Search, Loader2, Plus, ArrowUpDown, ExternalLink } from "lucide-react";

type PatientRisk = "High Risk" | "Watch / Moderate" | "Low Risk" | "Normal";

interface DoctorPatientRow {
  patient: PatientOut;
  view: HealthWorkerPatient;
  pregnancy: PregnancyOut | null;
  gestationalWeek: number | null;
  lastVisit: string | null;
  referral: ReferralOut | null;
  risk: PatientRisk;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

function pregnancyStage(week: number | null | undefined) {
  if (!week) return "Not recorded";
  if (week <= 13) return "1st trimester";
  if (week <= 27) return "2nd trimester";
  return "3rd trimester";
}

function riskFromData(pregnancy: PregnancyOut | null, screenings: ScreeningOut[]): PatientRisk {
  if (pregnancy?.risk_level === "HIGH" || screenings.some((screening) => screening.risk_level === "HIGH")) {
    return "High Risk";
  }
  if (pregnancy?.risk_level === "MEDIUM" || screenings.some((screening) => screening.risk_level === "MEDIUM")) {
    return "Watch / Moderate";
  }
  return pregnancy ? "Low Risk" : "Normal";
}

export default function DoctorPatientsPage() {
  const { t } = useLanguage();
  const [patients, setPatients] = useState<DoctorPatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientAge, setNewPatientAge] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [newPatientVillage, setNewPatientVillage] = useState("");
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [pregnancyFilter, setPregnancyFilter] = useState("ALL");
  const [referralFilter, setReferralFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("name");

  const loadPatients = async (facilityId?: string | null) => {
    const [patientData, referrals] = await Promise.all([
      patientsApi.list(facilityId ?? undefined),
      referralsApi.list(),
    ]);

    const rows = await Promise.all(patientData.map(async (patient) => {
      const [pregnancies, encounters] = await Promise.all([
        pregnanciesApi.listForPatient(patient.id).catch(() => []),
        encountersApi.list(patient.id).catch(() => []),
      ]);
      const screenings = (await Promise.all(
        encounters.map((encounter) => encountersApi.listScreenings(encounter.id).catch(() => [])),
      )).flat();
      const latestEncounter = [...encounters].sort(
        (a, b) => new Date(b.encounter_date).getTime() - new Date(a.encounter_date).getTime(),
      )[0];
      const activePregnancy = [...pregnancies].sort((a, b) => {
        if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
        if (a.status !== "ACTIVE" && b.status === "ACTIVE") return 1;
        return 0;
      })[0] ?? null;
      const patientReferrals = referrals.filter((referral) => referral.patient_id === patient.id);
      const latestReferral = [...patientReferrals].sort((a, b) => b.version - a.version)[0] ?? null;

      return {
        patient,
        view: patientOutToHealthWorkerPatient(patient),
        pregnancy: activePregnancy,
        gestationalWeek: patient.pregnancy_week,
        lastVisit: latestEncounter?.encounter_date ?? null,
        referral: latestReferral,
        risk: riskFromData(activePregnancy, screenings),
      } satisfies DoctorPatientRow;
    }));

    setPatients(rows);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const me = await authApi.me();
        await loadPatients(me.facility_id);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load patients from server.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const handleCreatePatient = async () => {
    if (!newPatientName.trim() || !newPatientAge || !newPatientPhone.trim() || !newPatientVillage.trim()) {
      setError("Please fill in all patient details.");
      return;
    }
  
    try {
      setCreatingPatient(true);
      setError(null);
  
      const me = await authApi.me();
  
      await patientsApi.create({
        full_name: newPatientName.trim(),
        age: parseInt(newPatientAge, 10),
        phone: newPatientPhone.trim(),
        village: newPatientVillage.trim(),
        facility_id: me.facility_id,
      });
  
      setNewPatientName("");
      setNewPatientAge("");
      setNewPatientPhone("");
      setNewPatientVillage("");
      setShowAddForm(false);
  
      await loadPatients(me.facility_id);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to register patient."
      );
    } finally {
      setCreatingPatient(false);
    }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filtered = patients
    .filter(({ patient, referral, risk, gestationalWeek }) => {
      const matchesSearch = [patient.full_name, patient.id, patient.phone, patient.village]
        .some((value) => (value || "").toLowerCase().includes(normalizedSearch));
      const matchesRisk = riskFilter === "ALL" || risk === riskFilter;
      const matchesPregnancy = pregnancyFilter === "ALL" || pregnancyStage(gestationalWeek) === pregnancyFilter;
      const matchesReferral = referralFilter === "ALL"
        || (referralFilter === "PENDING" && (referral?.status === "PENDING" || referral?.status === "CREATED"))
        || referral?.status === referralFilter;
      return matchesSearch && matchesRisk && matchesPregnancy && matchesReferral;
    })
    .sort((a, b) => {
      if (sortBy === "lastVisit") return (b.lastVisit ? new Date(b.lastVisit).getTime() : 0) - (a.lastVisit ? new Date(a.lastVisit).getTime() : 0);
      if (sortBy === "risk") return ["High Risk", "Watch / Moderate", "Low Risk", "Normal"].indexOf(a.risk) - ["High Risk", "Watch / Moderate", "Low Risk", "Normal"].indexOf(b.risk);
      if (sortBy === "gestationalWeek") return (b.gestationalWeek ?? 0) - (a.gestationalWeek ?? 0);
      if (sortBy === "edd") return (a.pregnancy?.expected_delivery_date || "9999").localeCompare(b.pregnancy?.expected_delivery_date || "9999");
      return a.patient.full_name.localeCompare(b.patient.full_name);
    });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      <PageHeader
  title="Patient Record"
  subtitle={t("registerPatientSubtitle")}
  roleBadge={<RoleBadge role="Doctor" />}
  action={
    <button
      type="button"
      onClick={() => setShowAddForm(true)}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 text-white hover:bg-teal-800 transition-colors text-xs font-semibold"
    >
      <Plus className="w-4 h-4" />
      Add New Patient
    </button>
  }
/>

{showAddForm && (
  <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-sm">
    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
      Add New Patient
    </h2>
    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
      Enter the patient&apos;s basic details to register them.
    </p>

    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        Full name
        <input
          type="text"
          value={newPatientName}
          onChange={(e) => setNewPatientName(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm"
          placeholder="Patient name"
        />
      </label>

      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        Age
        <input
          type="number"
          value={newPatientAge}
          onChange={(e) => setNewPatientAge(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm"
          placeholder="Age"
        />
      </label>

      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        Phone
        <input
          type="text"
          value={newPatientPhone}
          onChange={(e) => setNewPatientPhone(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm"
          placeholder="Phone number"
        />
      </label>

      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        Village
        <input
          type="text"
          value={newPatientVillage}
          onChange={(e) => setNewPatientVillage(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-sm"
          placeholder="Village"
        />
      </label>
    </div>
    <div className="mt-4 flex justify-end gap-2">
  <button
    type="button"
    onClick={() => setShowAddForm(false)}
    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
  >
    Cancel
  </button>

  <button
    type="button"
    onClick={handleCreatePatient}
    disabled={creatingPatient}
    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-60 text-xs font-semibold"
  >
    {creatingPatient && <Loader2 className="w-4 h-4 animate-spin" />}
    {creatingPatient ? "Saving..." : "Save Patient"}
  </button>
</div>
  </div>
)}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
        <div className="relative w-full xl:w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search patients by name, ID, phone or village"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 dark:bg-slate-800 font-medium"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 flex-1">
          <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-medium">
            <option value="ALL">All risk levels</option>
            <option>High Risk</option><option>Watch / Moderate</option><option>Low Risk</option><option>Normal</option>
          </select>
          <select value={pregnancyFilter} onChange={(e) => setPregnancyFilter(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-medium">
            <option value="ALL">All pregnancy stages</option>
            <option>1st trimester</option><option>2nd trimester</option><option>3rd trimester</option><option>Not recorded</option>
          </select>
          <select value={referralFilter} onChange={(e) => setReferralFilter(e.target.value)} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-medium">
            <option value="ALL">All referral statuses</option><option value="PENDING">Pending review</option><option>ACCEPTED</option><option>REJECTED</option><option>COMPLETED</option>
          </select>
          <label className="relative">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 pr-3 py-2 text-xs font-medium">
              <option value="name">Sort by name</option><option value="lastVisit">Sort by last visit</option><option value="risk">Sort by risk</option><option value="gestationalWeek">Sort by gestational week</option><option value="edd">Sort by EDD</option>
            </select>
          </label>
        </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
          <span>Registered Patients ({filtered.length})</span>
        </div>

        {loading && (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading patients…</span>
          </div>
        )}

        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {!loading && filtered.map(({ patient, view, pregnancy, gestationalWeek, lastVisit, referral, risk }) => (
            <div key={patient.id} className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-slate-900 dark:text-white text-base">{patient.full_name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">({patient.id})</span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
                  <span>{t("ageLabel")} <strong>{view.age || "—"}</strong></span>
                  <span>{t("villageLabel")}: <strong>{patient.village || "—"}</strong></span>
                  <span>{t("phoneLabelFull")}: <strong>{patient.phone || "—"}</strong></span>
                  <span>Last visit: <strong>{formatDate(lastVisit)}</strong></span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Risk: <strong>{risk}</strong></span>
                  <span>Pregnancy: <strong>{gestationalWeek ? `${pregnancyStage(gestationalWeek)} (${gestationalWeek} weeks)` : "—"}</strong></span>
                  <span>EDD: <strong>{formatDate(pregnancy?.expected_delivery_date)}</strong></span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex flex-col items-start xl:items-end gap-1">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">Referral status</span>
                  <strong className="text-xs text-slate-700 dark:text-slate-200">{referral?.status || "None"}</strong>
                </div>
                <Link href={`/doctor/patients/${patient.id}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 text-white hover:bg-teal-800 transition-colors text-xs font-semibold">
                  View Record <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}

          {!loading && filtered.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">{t("noPatientsFound")}</div>
          )}
        </div>
      </div>
    </div>
  );
}
