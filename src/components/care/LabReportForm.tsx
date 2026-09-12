"use client";

import React, { useEffect, useState } from "react";
import { diagnosticsApi, patientsApi, ApiError } from "@/lib/api/client";
import type { DiagnosticOrderOut, PatientOut } from "@/lib/api/types";
import { FlaskConical, Loader2, X } from "lucide-react";

const inputClass =
  "w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-100";

const TEST_OPTIONS = ["Urine protein", "Hemoglobin", "Blood sugar", "Ultrasound", "Blood pressure check"];

interface LabReportFormProps {
  onClose: () => void;
  onSaved: () => void;
}

export function LabReportForm({ onClose, onSaved }: LabReportFormProps) {
  const [patients, setPatients] = useState<PatientOut[]>([]);
  const [orders, setOrders] = useState<DiagnosticOrderOut[]>([]);
  const [patientId, setPatientId] = useState("");
  const [orderId, setOrderId] = useState("new");
  const [testName, setTestName] = useState(TEST_OPTIONS[0]);
  const [summary, setSummary] = useState("");
  const [resultStatus, setResultStatus] = useState("Report Uploaded");
  const [notes, setNotes] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await patientsApi.list();
        if (cancelled) return;
        setPatients(list);
        if (list[0]) setPatientId(list[0].id);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load patients.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await diagnosticsApi.listOrders(patientId);
        if (cancelled) return;
        setOrders(list);
        const open = list.find((o) => !o.report_id);
        setOrderId(open?.id || "new");
        if (open) setTestName(open.test_type);
      } catch {
        if (!cancelled) setOrders([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      let targetOrderId = orderId;
      if (orderId === "new") {
        const created = await diagnosticsApi.createOrder({ patient_id: patientId, test_type: testName });
        targetOrderId = created.id;
      }
      const resultData = [notes.trim(), fileName ? `Uploaded file: ${fileName}` : ""].filter(Boolean).join("\n") || null;
      await diagnosticsApi.createReport({
        diagnostic_order_id: targetOrderId,
        result_summary: summary.trim() || null,
        result_data: resultData,
        result_status: resultStatus,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Could not upload report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-teal-700" /> Add Lab Test / Upload Report
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading patients…
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 text-xs">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 font-semibold">
                {error}
              </div>
            )}
            <div>
              <label className="font-bold block mb-1">Select patient</label>
              <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className={inputClass} required>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} {p.village ? `• ${p.village}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold block mb-1">Existing order or new test</label>
              <select value={orderId} onChange={(e) => setOrderId(e.target.value)} className={inputClass}>
                <option value="new">New test</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.test_type} ({o.status}{o.report_id ? ", report on file" : ""})
                  </option>
                ))}
              </select>
            </div>
            {orderId === "new" && (
              <div>
                <label className="font-bold block mb-1">Test name</label>
                <input value={testName} onChange={(e) => setTestName(e.target.value)} list="lab-tests" className={inputClass} required />
                <datalist id="lab-tests">
                  {TEST_OPTIONS.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
            )}
            <div>
              <label className="font-bold block mb-1">Report summary</label>
              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} className={inputClass} />
            </div>
            <div>
              <label className="font-bold block mb-1">Result status</label>
              <select value={resultStatus} onChange={(e) => setResultStatus(e.target.value)} className={inputClass}>
                <option>Sample Collected</option>
                <option>Report Uploaded</option>
                <option>Reviewed</option>
              </select>
            </div>
            <div>
              <label className="font-bold block mb-1">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} />
            </div>
            <div>
              <label className="font-bold block mb-1">Upload file (stored as a note, not a server file)</label>
              <input
                type="file"
                onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
                className="w-full text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-xl bg-teal-700 text-white font-extrabold disabled:opacity-60 cursor-pointer">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mark report as uploaded"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
