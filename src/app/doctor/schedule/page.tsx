"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import { authApi, doctorAvailabilityApi, ApiError } from "@/lib/api/client";
import type { DoctorAvailabilityOut } from "@/lib/api/types";
import { Calendar, Clock, Loader2 } from "lucide-react";

export default function DoctorSchedulePage() {
  const { t } = useLanguage();
  const [slots, setSlots] = useState<DoctorAvailabilityOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const me = await authApi.me();
        if (!me.facility_id) {
          if (!cancelled) setSlots([]);
          return;
        }
        const all = await doctorAvailabilityApi.list(me.facility_id);
        const mine = all
          .filter((s) => s.doctor_id === me.id)
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        if (!cancelled) setSlots(mine);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load schedule from server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={t("todaysSchedule")}
        subtitle="Your upcoming availability slots"
        roleBadge={<RoleBadge role="Doctor" />}
      />

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading schedule…</span>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-700" /> {slots.length} slots
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {slots.map((s) => (
              <div key={s.id} className="p-4 flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                  <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  {new Date(s.start_time).toLocaleString()} — {new Date(s.end_time).toLocaleTimeString()}
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded ${
                    s.is_booked
                      ? "bg-amber-100 text-amber-900 border border-amber-200"
                      : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                  }`}
                >
                  {s.is_booked ? "Booked" : "Open"}
                </span>
              </div>
            ))}
            {slots.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">No availability slots recorded.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
