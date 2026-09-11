"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import { authApi, patientsApi, ApiError } from "@/lib/api/client";
import { patientOutToHealthWorkerPatient } from "@/lib/api/adapters";
import type { HealthWorkerPatient } from "@/lib/mockData";
import { Users, Search, Loader2 } from "lucide-react";

// Facility-scoped patient list ("People Expected Today"). Mirrors the
// hw/patients list pattern but scopes to the logged-in facility user's own
// facility_id (via authApi.me()) instead of listing every patient.
export default function FacilityPatientsPage() {
  useLanguage();
  const [patients, setPatients] = useState<HealthWorkerPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
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

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.village.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title="People Expected Today"
        subtitle="Patients registered at this facility"
        roleBadge={<RoleBadge role="Healthcare Facility" />}
      />

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
        <input
          type="text"
          placeholder="Search by name, village, or ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs font-medium bg-transparent focus:outline-none"
        />
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {loading && (
        <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading patients…</span>
        </div>
      )}

      {!loading && filteredPatients.length === 0 && !error && (
        <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700">
          No patients found for this facility.
        </div>
      )}

      <div className="space-y-3">
        {!loading &&
          filteredPatients.map((p) => (
            <div
              key={p.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-sm flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 flex items-center justify-center shrink-0">
                  <Users className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{p.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {p.age > 0 ? `${p.age} yrs` : "-"} • {p.village}
                  </div>
                </div>
              </div>
              <Link
                href={`/hw/patients/${p.id}`}
                className="text-teal-700 font-bold text-xs hover:underline shrink-0"
              >
                View Details
              </Link>
            </div>
          ))}
      </div>
    </div>
  );
}
