"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import { authApi, patientsApi, ApiError } from "@/lib/api/client";
import { patientOutToHealthWorkerPatient } from "@/lib/api/adapters";
import type { HealthWorkerPatient } from "@/lib/mockData";
import { Search, Loader2, Plus } from "lucide-react";

export default function DoctorPatientsPage() {
  const { t } = useLanguage();
  const [patients, setPatients] = useState<HealthWorkerPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientAge, setNewPatientAge] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [newPatientVillage, setNewPatientVillage] = useState("");
  const [creatingPatient, setCreatingPatient] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const me = await authApi.me();
        const data = await patientsApi.list(me.facility_id ?? undefined);
        if (!cancelled) setPatients(data.map(patientOutToHealthWorkerPatient));
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
  
      const data = await patientsApi.list(me.facility_id ?? undefined);
      setPatients(data.map(patientOutToHealthWorkerPatient));
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

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.village.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      <PageHeader
  title={t("records")}
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
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("searchPatientsPlaceholder")}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 dark:bg-slate-800 font-medium"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
          <span>{t("registeredPatientsCount")} ({filtered.length})</span>
        </div>

        {loading && (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading patients…</span>
          </div>
        )}

        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {!loading && filtered.map((p) => (
            <div key={p.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-slate-900 dark:text-white text-base">{p.name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">({p.id.slice(0, 8)})</span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
                  <span>{t("ageLabel")} <strong>{p.age}</strong></span>
                  <span>{t("villageLabel")}: <strong>{p.village}</strong></span>
                  <span>{t("phoneLabelFull")}: <strong>{p.phone}</strong></span>
                </div>
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
