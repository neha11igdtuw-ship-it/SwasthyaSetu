"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { doctorQueueApi, queueApi, queueDesksApi, ApiError } from "@/lib/api/client";
import type { DoctorQueueOut } from "@/lib/api/types";
import { Loader2, PhoneCall, Play, CheckCircle2, SkipForward, PauseCircle, PlayCircle } from "lucide-react";

const POLL_INTERVAL_MS = 20000;

interface DoctorQueuePanelProps {
  initialData?: DoctorQueueOut | null;
}

/** Doctor-facing live queue: "Now Serving" + ordered queue + lifecycle actions.
 * Deliberately omits medical detail beyond a coarse risk flag — full clinical
 * context lives on the patient/encounter screens, not the public queue view. */
export function DoctorQueuePanel({ initialData }: DoctorQueuePanelProps) {
  const [data, setData] = useState<DoctorQueueOut | null>(initialData ?? null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await doctorQueueApi.current();
      setData(result);
      setError(null);
    } catch (e) {
      setData(null);
      setError(e instanceof ApiError ? e.message : "Could not load your queue.");
    }
  }, []);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setError(null);
      return;
    }

    load();
    timerRef.current = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [initialData, load]);

  async function withBusy(id: string, fn: () => Promise<unknown>) {
    setBusy(id);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  if (error && !data) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6 text-xs text-slate-500">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm p-6">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading queue…
      </div>
    );
  }

  const { summary, entries } = data;
  const current = entries.find((e) => e.status === "CALLED" || e.status === "IN_CONSULTATION");
  const waiting = entries.filter((e) => e.status === "WAITING");

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
        <div>
          <h2 className="font-extrabold text-slate-900 dark:text-white text-lg">OPD Queue</h2>
          <p className="text-xs text-slate-500">
            {summary.waiting_count} waiting · {summary.completed_today} completed today ·{" "}
            {summary.skipped_today} skipped today
          </p>
        </div>
        {summary.is_paused ? (
          <button
            type="button"
            disabled={busy === "resume"}
            onClick={() => withBusy("resume", () => queueDesksApi.resume(summary.queue_desk_id))}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold"
          >
            <PlayCircle className="w-4 h-4" /> Resume Queue
          </button>
        ) : (
          <button
            type="button"
            disabled={busy === "pause"}
            onClick={() =>
              withBusy("pause", () => queueDesksApi.pause(summary.queue_desk_id, "Doctor temporarily unavailable"))
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold"
          >
            <PauseCircle className="w-4 h-4" /> Mark Delayed
          </button>
        )}
      </div>

      {summary.is_paused && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 text-amber-900 text-xs font-bold">
          Queue paused — patients are seeing a delayed status until you resume.
        </div>
      )}

      <div className="rounded-2xl bg-teal-900 text-white p-5 flex items-center justify-between">
        <span className="text-xs uppercase font-bold text-teal-300">Now Serving</span>
        <span className="text-3xl font-extrabold">
          Token #{summary.current_token_number ?? "—"}
        </span>
      </div>

      {!current && (
        <button
          type="button"
          disabled={!waiting.length || busy === "call-next" || summary.is_paused}
          onClick={() => withBusy("call-next", () => doctorQueueApi.callNext(summary.queue_desk_id))}
          className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-extrabold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <PhoneCall className="w-4 h-4" /> Call Next Patient
        </button>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {entries.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 text-center">
            No patients in the queue.
          </div>
        ) : (
          entries.map((e) => (
            <div
              key={e.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 font-extrabold flex items-center justify-center text-sm">
                  #{e.token_number}
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {e.patient_name}
                    {e.risk_flag && e.risk_flag !== "LOW" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                        {e.risk_flag} risk
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {e.status.replace("_", " ")} · waiting {e.wait_minutes} min
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {e.status === "CALLED" && (
                  <button
                    type="button"
                    disabled={busy === e.id}
                    onClick={() => withBusy(e.id, () => queueApi.startConsultation(e.id))}
                    className="p-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white"
                    title="Start Consultation"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}
                {(e.status === "CALLED" || e.status === "IN_CONSULTATION") && (
                  <>
                    <button
                      type="button"
                      disabled={busy === e.id}
                      onClick={() => withBusy(e.id, () => queueApi.complete(e.id))}
                      className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                      title="Complete"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={busy === e.id}
                      onClick={() => withBusy(e.id, () => queueApi.skip(e.id, "Patient not present when called"))}
                      className="p-2 rounded-lg bg-slate-500 hover:bg-slate-600 text-white"
                      title="Skip"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
