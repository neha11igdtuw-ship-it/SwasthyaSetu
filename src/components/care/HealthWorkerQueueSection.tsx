"use client";

import React, { useCallback, useEffect, useState } from "react";
import { authApi, facilitiesApi, queueDesksApi, queueApi, ApiError } from "@/lib/api/client";
import type { QueueDeskOut } from "@/lib/api/types";
import { AlertTriangle, PauseCircle, Ticket, Loader2 } from "lucide-react";

const POLL_INTERVAL_MS = 25000;

function describeApiError(e: unknown, fallback: string): string {
  if (!(e instanceof ApiError)) return fallback;
  if (Array.isArray(e.details)) {
    const messages = (e.details as { loc?: unknown[]; msg?: string }[])
      .map((d) => {
        const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : undefined;
        return field ? `${field}: ${d.msg}` : d.msg;
      })
      .filter(Boolean);
    if (messages.length) return messages.join("; ");
  }
  return e.message || fallback;
}

/** Health-worker view: join a home-facility or referred-to-facility OPD desk
 * on behalf of a linked patient. Destination desks come from the patient's
 * active referral (`to_facility_id`), not the worker's own sub-centre. */
export function HealthWorkerQueueSection({
  patients,
}: {
  patients: { id: string; full_name: string; riskLevel?: string }[];
}) {
  const [ready, setReady] = useState(false);
  const [desks, setDesks] = useState<QueueDeskOut[]>([]);
  const [facilityNames, setFacilityNames] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [desksLoading, setDesksLoading] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedDeskId, setSelectedDeskId] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await authApi.me();
        const facilities = await facilitiesApi.list().catch(() => []);
        if (cancelled) return;
        setFacilityNames(new Map(facilities.map((f) => [f.id, f.name])));
        setError(null);
      } catch (e) {
        if (!cancelled) setError(describeApiError(e, "Could not load health worker profile."));
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadDesks = useCallback(async (patientId: string) => {
    if (!patientId) {
      setDesks([]);
      setDesksLoading(false);
      return;
    }
    setDesksLoading(true);
    try {
      const dk = await queueDesksApi.list(undefined, patientId);
      setDesks(dk.filter((d) => d.is_active));
      setError(null);
    } catch (e) {
      setDesks([]);
      setError(describeApiError(e, "Could not load queue desks for this patient."));
    } finally {
      setDesksLoading(false);
    }
  }, []);

  useEffect(() => {
    setSelectedDeskId("");
    setJoinMessage(null);
    setJoinError(null);
    loadDesks(selectedPatientId);
  }, [selectedPatientId, loadDesks]);

  useEffect(() => {
    if (!selectedPatientId) return;
    const timer = setInterval(() => loadDesks(selectedPatientId), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [selectedPatientId, loadDesks]);

  const pausedDesks = desks.filter((d) => d.is_paused);
  const highRiskNames = new Set(
    patients.filter((p) => p.riskLevel === "High Risk").map((p) => p.full_name)
  );

  async function handleAssistJoin() {
    if (!selectedPatientId || !selectedDeskId) return;
    setJoining(true);
    setJoinMessage(null);
    setJoinError(null);
    try {
      const entry = await queueApi.join({
        queue_desk_id: selectedDeskId,
        patient_id: selectedPatientId,
      });
      setJoinMessage(`Joined — token #${entry.token_number} at ${entry.desk_display_name}.`);
      await loadDesks(selectedPatientId);
    } catch (e) {
      setJoinError(describeApiError(e, "Could not join the queue for this patient."));
    } finally {
      setJoining(false);
    }
  }

  const deskEmptyMessage = !selectedPatientId
    ? "Select a patient with an active referral (or a home-facility desk) to see available OPD desks."
    : "No open OPD desk is available for this patient’s referral facility.";

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6 space-y-4">
      <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
        <h2 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
          <Ticket className="w-5 h-5 text-teal-700" /> OPD Queue Status
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Join an open OPD desk for a patient you&apos;re assisting — including referred hospital desks
        </p>
      </div>

      {!ready && (
        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading queue desk…
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {pausedDesks.length > 0 && (
        <div className="space-y-2">
          {pausedDesks.map((d) => (
            <div
              key={d.id}
              className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2"
            >
              <PauseCircle className="w-4 h-4 shrink-0" />
              {d.display_name} is currently delayed{d.pause_reason ? `: ${d.pause_reason}` : ""}.
            </div>
          ))}
        </div>
      )}

      {highRiskNames.size > 0 && desks.some((d) => d.is_paused) && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          You have high-risk linked patients — check their queue position from their dashboard so
          they&apos;re ready when called.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end pt-1">
        <div className="sm:col-span-1">
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Patient</label>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
          >
            <option value="">Select patient…</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-1">
          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">Queue desk</label>
          {desksLoading ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 p-2.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading desks…
            </div>
          ) : (
            <select
              value={selectedDeskId}
              onChange={(e) => setSelectedDeskId(e.target.value)}
              disabled={!selectedPatientId || desks.length === 0}
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs disabled:opacity-60"
            >
              <option value="">Select desk…</option>
              {desks.map((d) => {
                const facilityName = facilityNames.get(d.facility_id);
                const hours =
                  d.opd_start_time && d.opd_end_time
                    ? ` · ${String(d.opd_start_time).slice(0, 5)}–${String(d.opd_end_time).slice(0, 5)}`
                    : "";
                return (
                  <option key={d.id} value={d.id}>
                    {d.display_name}
                    {facilityName ? ` · ${facilityName}` : ""}
                    {hours}
                  </option>
                );
              })}
            </select>
          )}
        </div>
        <button
          type="button"
          disabled={!selectedPatientId || !selectedDeskId || joining}
          onClick={handleAssistJoin}
          className="py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {joining && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Join queue for patient
        </button>
      </div>

      {selectedPatientId && !desksLoading && desks.length === 0 && !error && (
        <p className="text-xs font-semibold text-amber-800 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 rounded-lg p-2.5">
          {deskEmptyMessage}
        </p>
      )}
      {!selectedPatientId && ready && (
        <p className="text-xs text-slate-500">{deskEmptyMessage}</p>
      )}

      {joinMessage && (
        <p className="text-xs font-extrabold text-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 rounded-lg p-2.5">
          {joinMessage}
        </p>
      )}
      {joinError && (
        <p className="text-xs font-semibold text-rose-800 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 rounded-lg p-2.5">
          {joinError}
        </p>
      )}
    </div>
  );
}
