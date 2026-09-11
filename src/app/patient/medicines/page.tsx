"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import { patientsApi, prescriptionsApi } from "@/lib/api/client";
import type { PrescriptionOut } from "@/lib/api/types";
import { Pill, Clock, Loader2 } from "lucide-react";

export default function PatientMedicinesPage() {
  const { t } = useLanguage();

  // Real prescriptions for the logged-in patient. The backend links a
  // prescription to an inventory_item_id (name/stock live in the inventory
  // table, not exposed via a patient-readable endpoint, and there is no
  // patient-facing "mark received" endpoint), so we show quantity/dosage/
  // status as returned and drop the mock receive-toggle affordance.
  const [prescriptions, setPrescriptions] = useState<PrescriptionOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const patients = await patientsApi.list();
        const me = patients[0];
        if (!me || cancelled) return;
        const list = await prescriptionsApi.list(me.id);
        if (!cancelled) setPrescriptions(list);
      } catch (err) {
        console.warn("patient/medicines: failed to load prescriptions", err);
        if (!cancelled) setError("Could not load medicines right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="prescribedMedicinesTitle"
        subtitle="medicinesSubtitle"
        roleBadge={<RoleBadge role="Patient" />}
      />

      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span>{t("medicineUpdated")} <strong>{t("todayAt")} 8:00 AM</strong></span>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10 text-slate-400 dark:text-slate-500 gap-2 text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading medicines…</span>
        </div>
      )}

      {!loading && error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {!loading && !error && prescriptions.length === 0 && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-center text-sm text-slate-500 dark:text-slate-400">
          No prescriptions on record yet.
        </div>
      )}

      {/* Prescriptions List */}
      <div className="space-y-4">
        {prescriptions.map((rx) => (
          <div
            key={rx.id}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/30 border border-teal-100 text-teal-700">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    {rx.id.slice(0, 8)}
                  </span>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Qty {rx.quantity}
                  </h3>
                </div>
              </div>
              <StatusBadge status={rx.status} />
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-100 block">{t("howToTake")}</span>
                <p className="text-slate-700 dark:text-slate-300 font-medium">
                  {rx.dosage_instructions || "See health worker for dosage"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
