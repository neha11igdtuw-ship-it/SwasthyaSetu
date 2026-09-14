"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import { authApi, patientsApi, diagnosticsApi, ApiError } from "@/lib/api/client";
import type { DiagnosticOrderOut, PatientOut } from "@/lib/api/types";
import { LabReportForm } from "@/components/care/LabReportForm";
import { FlaskConical, Loader2, Plus } from "lucide-react";

// The backend only exposes /diagnostics/orders scoped to a single patient_id
// (see backend/app/api/routes/diagnostics.py) — there is no facility-wide
// diagnostics list endpoint. To show a facility view, we fetch this
// facility's patients then fan out one diagnostics call per patient and
// aggregate the results client-side (same pattern used for care-gaps on the
// hw/dashboard page).
export default function FacilityLabResultsPage() {
  useLanguage();
  const [orders, setOrders] = useState<(DiagnosticOrderOut & { patientName: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const me = await authApi.me();
    const patients: PatientOut[] = await patientsApi.list(me.facility_id ?? undefined);
    const perPatient = await Promise.all(
      patients.map(async (p) => {
        try {
          const orders = await diagnosticsApi.listOrders(p.id);
          return orders.map((o) => ({ ...o, patientName: p.full_name }));
        } catch {
          return [];
        }
      })
    );
    setOrders(perPatient.flat());
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load lab results from server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title="Lab Results"
        subtitle="Diagnostic orders for this facility's patients"
        roleBadge={<RoleBadge role="Healthcare Facility" />}
        action={
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Lab Test / Upload Report
          </button>
        }
      />

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 text-emerald-900 text-xs font-semibold">
          {success}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading lab results…</span>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-teal-700" /> {orders.length} diagnostic orders
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {orders.map((o) => (
              <div key={o.id} className="p-4 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">{o.test_type}</span>
                  <span className="text-slate-500 dark:text-slate-400">{o.patientName} • ({o.id.slice(0, 8)})</span>
                </div>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded ${
                    o.status === "COMPLETED"
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                      : o.status === "CANCELLED"
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      : "bg-amber-100 text-amber-900 border border-amber-200"
                  }`}
                >
                  {o.status}
                </span>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">No diagnostic orders recorded for this facility&apos;s patients.</div>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <LabReportForm
          onClose={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false);
            setSuccess("Report uploaded. The patient will see it on Lab Tests after refresh.");
            try {
              await load();
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Uploaded, but failed to refresh the list.");
            } finally {
              setLoading(false);
            }
          }}
        />
      )}
    </div>
  );
}
