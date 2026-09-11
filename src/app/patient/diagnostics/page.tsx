"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import { patientsApi, diagnosticsApi } from "@/lib/api/client";
import type { DiagnosticOrderOut } from "@/lib/api/types";
import { Stethoscope, Building2, Download, CheckCircle2, Loader2 } from "lucide-react";

export default function PatientDiagnosticsPage() {
  const { t } = useLanguage();
  const [reportMsg, setReportMsg] = useState<string | null>(null);

  // Real diagnostic orders for the logged-in patient. Backend has no
  // scheduling/lab-name/report-summary fields yet, so those columns are
  // simply omitted rather than backfilled with mock text.
  const [orders, setOrders] = useState<DiagnosticOrderOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const patients = await patientsApi.list();
        const me = patients[0];
        if (!me || cancelled) return;
        const list = await diagnosticsApi.listOrders(me.id);
        if (cancelled) return;
        setOrders(list);
      } catch (err) {
        console.warn("patient/diagnostics: failed to load orders", err);
        if (!cancelled) setError("Could not load diagnostics right now.");
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
        title="labTestsTitle"
        subtitle="labTestsSubtitle"
        roleBadge={<RoleBadge role="Patient" />}
      />

      {reportMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{reportMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setReportMsg(null)}
            className="text-[10px] underline font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-10 text-slate-400 dark:text-slate-500 gap-2 text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading diagnostics…</span>
        </div>
      )}

      {!loading && error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-center text-sm text-slate-500 dark:text-slate-400">
          No diagnostic orders on record yet.
        </div>
      )}

      <div className="space-y-4">
        {orders.map((diag) => (
          <div
            key={diag.id}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/30 border border-teal-100 text-teal-700">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    {t("testId")}: {diag.id.slice(0, 8)}
                  </span>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    {diag.test_type}
                  </h3>
                </div>
              </div>
              <StatusBadge status={diag.status} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
              {diag.facility_id && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>{t("healthCenterLab")} <strong>{diag.facility_id.slice(0, 8)}</strong></span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                type="button"
                onClick={() => setReportMsg(`Report retrieval for ${diag.test_type} is not yet available from the backend.`)}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t("viewLabReport")}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
