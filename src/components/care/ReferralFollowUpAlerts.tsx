"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { notificationsApi } from "@/lib/api/client";
import type { NotificationOut } from "@/lib/api/types";

/**
 * Health-worker dashboard section listing patient-reported referral problems
 * that still need follow-up. Uses the existing notifications system: the
 * backend only creates these alerts for unsuccessful outcomes, addressed to
 * the responsible health worker, so GET /notifications/me already returns just
 * this worker's alerts. "Mark reviewed" flips the notification to READ.
 */
export function ReferralFollowUpAlerts() {
  const [alerts, setAlerts] = useState<NotificationOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const all = await notificationsApi.me();
    setAlerts(all.filter((n) => n.referral_id && n.status !== "READ"));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load alerts.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const markReviewed = async (id: string) => {
    setActingId(id);
    setError(null);
    try {
      await notificationsApi.markRead(id);
      setAlerts((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this alert.");
    } finally {
      setActingId(null);
    }
  };

  if (loading) return null;
  if (alerts.length === 0 && !error) return null;

  return (
    <section
      aria-label="Referral outcomes needing follow-up"
      className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-5 space-y-3"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-700" />
        <h3 className="font-extrabold text-amber-950 dark:text-amber-100 text-base">
          Referral outcomes needing follow-up ({alerts.length})
        </h3>
      </div>
      {error && (
        <p role="alert" className="text-xs font-semibold text-rose-700">
          {error}
        </p>
      )}
      <ul className="space-y-2">
        {alerts.map((n) => (
          <li
            key={n.id}
            className="bg-white dark:bg-slate-800 rounded-xl border border-amber-200 p-3 text-xs space-y-1.5"
          >
            <p className="font-extrabold text-slate-900 dark:text-white">{n.title}</p>
            <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{n.body}</p>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-slate-500">
                Reported {new Date((n.sent_at ?? n.scheduled_at) + "Z").toLocaleString()}
              </span>
              <div className="flex items-center gap-3">
                <Link href="/hw/referrals" className="font-bold text-teal-700 hover:underline">
                  View care requests
                </Link>
                <button
                  type="button"
                  disabled={actingId === n.id}
                  onClick={() => markReviewed(n.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold disabled:opacity-60 cursor-pointer"
                >
                  {actingId === n.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Mark reviewed
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
