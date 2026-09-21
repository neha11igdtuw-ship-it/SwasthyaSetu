"use client";

import React, { useCallback, useEffect, useState } from "react";
import { authApi, facilityQueueApi, queueDesksApi, queueApi, ApiError } from "@/lib/api/client";
import type { FacilityQueueOverviewOut, QueueDeskOut } from "@/lib/api/types";
import { AlertTriangle, PauseCircle, Ticket, Loader2 } from "lucide-react";

const POLL_INTERVAL_MS = 25000;

/** Health-worker view: which of their facility's queue desks are paused, plus
 * a quick "join queue on behalf of a linked patient" action. Per-patient live
 * position is visible to the health worker once the patient (or the worker,
 * on their behalf) has joined — see the QueueCard on the patient's own
 * dashboard for that live token/position view. */
export function HealthWorkerQueueSection({
  patients,
}: {
  patients: { id: string; full_name: string; riskLevel?: string }[];
}) {
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [overview, setOverview] = useState<FacilityQueueOverviewOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [desks, setDesks] = useState<QueueDeskOut[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedDeskId, setSelectedDeskId] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);

  const load = useCallback(async (fid: string) => {
    try {
      const [ov, dk] = await Promise.all([
        facilityQueueApi.overview(fid),
        queueDesksApi.list(fid),
      ]);
      setOverview(ov);
      setDesks(dk.filter((d) => d.is_active));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load queue status.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    authApi.me().then((me) => {
      if (cancelled || !me.facility_id) return;
      setFacilityId(me.facility_id);
      load(me.facility_id);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (!facilityId) return;
    const timer = setInterval(() => load(facilityId), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [facilityId, load]);

  const pausedDesks = overview?.desks.filter((d) => d.is_paused) ?? [];
  const highRiskNames = new Set(
    patients.filter((p) => p.riskLevel === "High Risk").map((p) => p.full_name)
  );

  async function handleAssistJoin() {
    if (!selectedPatientId || !selectedDeskId) return;
    setJoining(true);
    setJoinMessage(null);
    try {
      const entry = await queueApi.join({ queue_desk_id: selectedDeskId, patient_id: selectedPatientId });
      setJoinMessage(`Joined — token #${entry.token_number} at ${entry.desk_display_name}.`);
    } catch (e) {
      setJoinMessage(e instanceof ApiError ? e.message : "Could not join the queue for this patient.");
    } finally {
      setJoining(false);
    }
  }

  if (!facilityId) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6 space-y-4">
      <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
        <h2 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
          <Ticket className="w-5 h-5 text-teal-700" /> OPD Queue Status
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Paused doctors and a quick way to join a queue for a patient you&apos;re assisting
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {pausedDesks.length > 0 && (
        <div className="space-y-2">
          {pausedDesks.map((d) => (
            <div
              key={d.queue_desk_id}
              className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2"
            >
              <PauseCircle className="w-4 h-4 shrink-0" />
              {d.display_name} is currently delayed{d.pause_reason ? `: ${d.pause_reason}` : ""}.
            </div>
          ))}
        </div>
      )}

      {highRiskNames.size > 0 && overview && overview.desks.some((d) => d.waiting_count > 0) && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          You have high-risk linked patients — check their queue position from their dashboard so
          they&apos;re ready when called.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end pt-1">
        <div className="sm:col-span-1">
          <label className="text-[11px] font-bold text-slate-600 block mb-1">Patient</label>
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
          <label className="text-[11px] font-bold text-slate-600 block mb-1">Queue desk</label>
          <select
            value={selectedDeskId}
            onChange={(e) => setSelectedDeskId(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
          >
            <option value="">Select desk…</option>
            {desks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.display_name}
              </option>
            ))}
          </select>
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

      {joinMessage && <p className="text-xs font-semibold text-slate-600">{joinMessage}</p>}
    </div>
  );
}
