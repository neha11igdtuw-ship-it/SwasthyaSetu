"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Clock, Ticket, Users, AlertTriangle, RefreshCw } from "lucide-react";
import { queueApi, ApiError } from "@/lib/api/client";
import type { QueueEntryDetailOut } from "@/lib/api/types";

const POLL_INTERVAL_MS = 25000;

const ACTIVE_STATUSES = new Set(["WAITING", "CALLED", "IN_CONSULTATION", "SKIPPED"]);

function friendlyStatus(status: QueueEntryDetailOut["status"]): string {
  switch (status) {
    case "WAITING":
      return "Waiting";
    case "CALLED":
      return "You're being called";
    case "IN_CONSULTATION":
      return "In consultation";
    case "COMPLETED":
      return "Completed";
    case "SKIPPED":
      return "You were missed";
    case "CANCELLED":
      return "Cancelled";
    case "REJOINED":
      return "Rejoined";
    default:
      return status;
  }
}

/** Patient-facing "My OPD Queue" card. Polls GET /queues/me every ~25s so
 * token/position/wait-time stay live without the patient refreshing. */
export function QueueCard() {
  const [entries, setEntries] = useState<QueueEntryDetailOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await queueApi.me();
      setEntries(rows);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load your queue status.");
    }
  }, []);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [load]);

  const active = entries?.find((e) => ACTIVE_STATUSES.has(e.status));

  async function handleCancel(id: string) {
    setBusyId(id);
    try {
      await queueApi.cancel(id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not cancel your queue entry.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRejoin(id: string) {
    setBusyId(id);
    try {
      await queueApi.rejoin(id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not rejoin the queue.");
    } finally {
      setBusyId(null);
    }
  }

  if (entries === null && !error) {
    return null; // avoid a flash of an empty card before the first load resolves
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 border-amber-400/70 shadow-md space-y-4 ring-1 ring-amber-400/20">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
            <Ticket className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">My OPD Queue</h2>
        </div>
        <Link
          href="/patient/queue/join"
          className="text-xs font-extrabold text-teal-700 hover:underline"
        >
          Join a queue
        </Link>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {!active ? (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 text-center font-medium">
          You are not currently in any OPD queue.{" "}
          <Link href="/patient/queue/join" className="text-teal-700 font-extrabold hover:underline">
            Join a queue
          </Link>
          .
        </div>
      ) : active.status === "SKIPPED" ? (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 text-amber-900 text-sm font-bold flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              You were missed. Your token #{active.token_number} has not been deleted — you can
              rejoin the queue.
            </span>
          </div>
          <button
            type="button"
            disabled={busyId === active.id}
            onClick={() => handleRejoin(active.id)}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold disabled:opacity-60"
          >
            {busyId === active.id ? "Rejoining…" : "Rejoin Queue"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {active.desk_display_name}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400">Current token being served</span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {active.current_token_number ?? "—"}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-900/30 border border-teal-200">
              <span className="text-[10px] uppercase font-bold text-teal-700">Your token</span>
              <div className="text-2xl font-extrabold text-teal-900 dark:text-teal-200">
                #{active.token_number}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1.5 font-semibold">
              <Users className="w-4 h-4 text-slate-400" />
              {active.status === "WAITING" ? `${active.patients_ahead} patients ahead` : "—"}
            </span>
            <span className="flex items-center gap-1.5 font-semibold">
              <Clock className="w-4 h-4 text-slate-400" />
              Est. wait: {active.estimated_wait_minutes} min
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-500">
              Doctor status:{" "}
              <strong className={active.desk_is_paused ? "text-amber-700" : "text-emerald-700"}>
                {active.desk_is_paused ? `Delayed (${active.desk_pause_reason || "unavailable"})` : "Available"}
              </strong>
            </span>
            <span className="text-slate-500">
              Queue status: <strong className="text-slate-800 dark:text-slate-100">{friendlyStatus(active.status)}</strong>
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "—"}
            </span>
            {active.status === "WAITING" && (
              <button
                type="button"
                disabled={busyId === active.id}
                onClick={() => handleCancel(active.id)}
                className="text-rose-600 font-extrabold hover:underline disabled:opacity-60"
              >
                {busyId === active.id ? "Cancelling…" : "Cancel Queue"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
