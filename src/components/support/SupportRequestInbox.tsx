"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquare, RefreshCw, User } from "lucide-react";
import { supportRequestsApi } from "@/lib/api/client";
import type { SupportRequestOut, SupportRequestStatus } from "@/lib/api/types";
import { SupportRequestStatusBadge } from "./SupportRequestStatusBadge";

const REASON_LABELS: Record<string, string> = {
  HEALTH_CONCERN: "I have a health concern",
  UNDERSTANDING_HELP: "I need help understanding instructions",
  CANNOT_TRAVEL: "I cannot travel",
  CALLBACK: "I need a callback",
  OTHER: "Other",
};

const STATUS_OPTIONS: SupportRequestStatus[] = [
  "SUBMITTED",
  "ASSIGNED",
  "CALLBACK_PENDING",
  "CONTACTED",
  "RESOLVED",
];

const POLL_INTERVAL_MS = 30000;

export function SupportRequestInbox() {
  const [requests, setRequests] = useState<SupportRequestOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await supportRequestsApi.listForFacility();
      setRequests(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load support requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const handleStatusChange = async (req: SupportRequestOut, status: SupportRequestStatus) => {
    setUpdatingId(req.id);
    try {
      const updated = await supportRequestsApi.updateStatus(req.id, req.version, status);
      setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...updated, patient_name: r.patient_name } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500 gap-2 text-sm">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading support requests…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Requests from patients at your facility, newest first.
        </p>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:underline"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="p-10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
          <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No support requests</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Requests patients submit via &ldquo;Get Support&rdquo; will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      {req.patient_name || "Patient"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(req.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <SupportRequestStatusBadge status={req.status} />
              </div>

              <div className="text-sm text-slate-700 dark:text-slate-200">
                <span className="font-semibold">{REASON_LABELS[req.reason] || req.reason}</span>
                {req.message && (
                  <p className="text-slate-600 dark:text-slate-300 mt-1">{req.message}</p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-500">Update status:</span>
                <select
                  value={req.status}
                  disabled={updatingId === req.id || req.status === "RESOLVED"}
                  onChange={(e) => handleStatusChange(req, e.target.value as SupportRequestStatus)}
                  className="text-xs border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 bg-transparent disabled:opacity-60"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                {updatingId === req.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
