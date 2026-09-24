"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { DoctorQueuePanel } from "@/components/care/DoctorQueuePanel";
import { ApiError, doctorQueueApi } from "@/lib/api/client";
import type { DoctorQueueOut } from "@/lib/api/types";
import { ExternalLink, Loader2 } from "lucide-react";

export default function DoctorPatientsToReviewPage() {
  const [queue, setQueue] = useState<DoctorQueueOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    doctorQueueApi.current()
      .then((data) => {
        if (!cancelled) setQueue(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Could not load patients to review.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Patients to Review"
        subtitle="Clinical queue for patients waiting for doctor attention"
        roleBadge={<RoleBadge role="Doctor" />}
      />

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      <DoctorQueuePanel />

      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="font-extrabold text-slate-900 dark:text-white text-lg">Patient records</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Open a patient record for clinical context and review actions.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading queue patients…
          </div>
        ) : queue?.entries.length ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl">
            {queue.entries.map((entry) => (
              <div key={entry.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{entry.patient_name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Patient ID: {entry.patient_id}</p>
                </div>
                <Link
                  href={`/doctor/patients/${entry.patient_id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
                >
                  View Patient Record <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 text-center">
            No patients are currently waiting for review.
          </p>
        )}
      </section>
    </div>
  );
}