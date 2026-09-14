"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { useLanguage } from "@/lib/i18n/languageContext";
import { diagnosticsApi, ApiError } from "@/lib/api/client";
import { loadOwnPatient } from "@/lib/api/ownPatient";
import type { DiagnosticOrderOut, PatientOut } from "@/lib/api/types";
import { Stethoscope, Building2, Download, CheckCircle2, Loader2, X, Plus } from "lucide-react";

function labStatus(order: DiagnosticOrderOut): string {
  if (order.report_id || order.result_summary) {
    return order.status === "COMPLETED" ? "Reviewed" : "Report Uploaded";
  }
  if (order.status === "COLLECTED") return "Sample Collected";
  if (order.status === "COMPLETED") return "Reviewed";
  if (order.status === "CANCELLED") return "Cancelled";
  return "Recommended";
}

function nextActor(order: DiagnosticOrderOut): string {
  if (order.report_id) return "Next: you can view the report. Doctor may still review it.";
  if (order.status === "COLLECTED") return "Next: facility or doctor will upload the report.";
  if (order.status === "ORDERED") return "Next: facility collects the sample.";
  return "Next: doctor or facility will update this test.";
}

const COMMON_TESTS = ["Blood pressure check", "Urine protein", "Hemoglobin", "Blood sugar", "Ultrasound"];

const inputClass =
  "w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-100";

export default function PatientDiagnosticsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [patient, setPatient] = useState<PatientOut | null>(null);
  const [orders, setOrders] = useState<DiagnosticOrderOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reportMsg, setReportMsg] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testType, setTestType] = useState(COMMON_TESTS[0]);
  const [customTest, setCustomTest] = useState("");

  const load = useCallback(async () => {
    const me = await loadOwnPatient();
    if (!me) {
      setError("No patient record linked to this login yet.");
      return;
    }
    setPatient(me);
    setOrders(await diagnosticsApi.me());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch {
        if (!cancelled) setError("Could not load diagnostics right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const viewReport = async (order: DiagnosticOrderOut) => {
    setReportLoading(order.id);
    try {
      if (order.report_id) {
        const report = await diagnosticsApi.getReport(order.report_id);
        setReportMsg(report.result_summary || report.result_data || `Report on file for ${order.test_type}.`);
      } else if (order.result_summary) {
        setReportMsg(order.result_summary);
      } else {
        setReportMsg(`No lab report is on file yet for ${order.test_type}.`);
      }
    } catch (err) {
      setReportMsg(err instanceof Error ? err.message : `Could not load report for ${order.test_type}.`);
    } finally {
      setReportLoading(null);
    }
  };

  const requestCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const name = customTest.trim() || testType;
      await diagnosticsApi.createOrder({ patient_id: patient.id, test_type: name });
      setShowForm(false);
      setSuccess("Health check requested. A doctor or facility will collect the sample and upload the report.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Could not request the test.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="labTestsTitle"
        subtitle="labTestsSubtitle"
        roleBadge={<RoleBadge role="Patient" />}
        action={
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Request Health Check
          </button>
        }
      />

      {reportMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{reportMsg}</span>
          </div>
          <button type="button" onClick={() => setReportMsg(null)} className="text-[10px] underline font-bold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}
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
      {loading && (
        <div className="flex items-center justify-center py-10 text-slate-400 gap-2 text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading diagnostics…</span>
        </div>
      )}

      {!loading && orders.length === 0 && !error && (
        <EmptyState
          icon={Stethoscope}
          title="No lab tests yet"
          description="No lab tests recommended yet. Doctor or facility recommended tests will appear here."
          actionLabel="Request Health Check"
          onAction={() => setShowForm(true)}
          secondaryLabel="Tell Symptoms"
          onSecondary={() => router.push("/patient/symptoms")}
        />
      )}

      <div className="space-y-4">
        {orders.map((diag) => {
          const hasReport = Boolean(diag.report_id || diag.result_summary);
          return (
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
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {t("testId")}: {diag.id.slice(0, 8)}
                    </span>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{diag.test_type}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasReport && (
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Report Available
                    </span>
                  )}
                  <StatusBadge status={labStatus(diag)} />
                </div>
              </div>
              {diag.facility_id && (
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <Building2 className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>{t("healthCenterLab")}</span>
                </div>
              )}
              <p className="text-[11px] text-slate-500">{nextActor(diag)}</p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                <button
                  type="button"
                  onClick={() => viewReport(diag)}
                  disabled={!hasReport || reportLoading === diag.id}
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{hasReport ? t("viewLabReport") : "Waiting for report"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-500">
        Feeling unwell? <Link href="/patient/symptoms" className="text-teal-700 font-bold hover:underline">Tell Symptoms</Link>
      </p>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Request Health Check</h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded-lg text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={requestCheck} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Recommended test</label>
                <select value={testType} onChange={(e) => setTestType(e.target.value)} className={inputClass}>
                  {COMMON_TESTS.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">Or type a test name</label>
                <input value={customTest} onChange={(e) => setCustomTest(e.target.value)} className={inputClass} placeholder="Optional" />
              </div>
              <p className="text-[11px] text-slate-500">A doctor or facility uploads the report after the sample is collected.</p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-xl bg-teal-700 text-white font-extrabold disabled:opacity-60 cursor-pointer">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
