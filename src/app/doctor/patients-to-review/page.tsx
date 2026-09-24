"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { DoctorQueuePanel } from "@/components/care/DoctorQueuePanel";
import { ApiError, authApi, doctorQueueApi, patientsApi } from "@/lib/api/client";
import type { DoctorQueueOut } from "@/lib/api/types";
import { ExternalLink, Loader2 } from "lucide-react";

type QueueState = "loading" | "ready" | "unassigned" | "error";

export default function DoctorPatientsToReviewPage() {
  const [queue, setQueue] = useState<DoctorQueueOut | null>(null);
  const [recordAccess, setRecordAccess] = useState<Record<string, boolean>>({});
  const [queueState, setQueueState] = useState<QueueState>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([authApi.me(), doctorQueueApi.current()])
      .then(async ([me, data]) => {
        const patients = me.facility_id ? await patientsApi.list(me.facility_id) : [];
        const authorizedPatientIds = new Set(patients.map((patient) => patient.id));
        const access = data.entries.map((entry) => [
          entry.patient_id,
          authorizedPatientIds.has(entry.patient_id),
        ] as const);

        if (!cancelled) {
          setQueue(data);
          setRecordAccess(Object.fromEntries(access));
          setQueueState("ready");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404 && err.message.includes("queue desk")) {
            setQueueState("unassigned");
            setError(null);
          } else {
            setQueueState("error");
            setError(err instanceof ApiError ? err.message : "Could not load patients to review.");
          }
        }
      })

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

      {queueState === "error" && error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {queueState === "loading" && (
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 p-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading doctor queue…
        </div>
      )}

      {queueState === "unassigned" && (
        <section className="bg-white dark:bg-slate-800 rounded-2xl border border-amber-200 dark:border-amber-800 shadow-sm p-6 space-y-2">
          <h2 className="font-extrabold text-slate-900 dark:text-white text-lg">No queue desk is assigned</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            No queue desk is assigned to this doctor. Patients will appear here once a facility administrator assigns a queue desk.
          </p>
        </section>
      )}

      {queueState === "ready" && <DoctorQueuePanel initialData={queue} />}

      {queueState === "ready" && <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="font-extrabold text-slate-900 dark:text-white text-lg">Patient records</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Open a patient record for clinical context and review actions.
          </p>
        </div>

        {queue?.entries.length ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl">
            {queue.entries.map((entry) => (
              <div key={entry.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{entry.patient_name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Patient ID: {entry.patient_id}</p>
                </div>
                {recordAccess[entry.patient_id] ? (
                  <Link
                    href={`/doctor/patients/${entry.patient_id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
                  >
                    View Patient Record <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Patient record unavailable for this facility
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 text-center">
            No patients are currently waiting for review.
          </p>
        )}
      </section>}
    </div>
  );
}