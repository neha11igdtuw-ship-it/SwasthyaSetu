"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import { authApi, doctorAvailabilityApi, ApiError } from "@/lib/api/client";
import type { DoctorAvailabilityOut } from "@/lib/api/types";
import { Calendar, Clock, Loader2, Plus, X } from "lucide-react";

function isTodayLocal(value: string) {
  const date = new Date(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
}

export default function DoctorSchedulePage() {
  const { t } = useLanguage();
  const [slots, setSlots] = useState<DoctorAvailabilityOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [scheduleNote, setScheduleNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAddSchedule = async () => {
    if (!scheduleDate || !startTime || !endTime) {
      setError("Please select a date, start time, and end time.");
      return;
    }

    if (endTime <= startTime) {
      setError("End time must be later than start time.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const me = await authApi.me();

      if (!me.id || !me.facility_id) {
        throw new Error("Doctor or facility information is missing.");
      }

      const startDateTime = `${scheduleDate}T${startTime}:00`;
      const endDateTime = `${scheduleDate}T${endTime}:00`;

      await doctorAvailabilityApi.create({
        doctor_id: me.id,
        facility_id: me.facility_id,
        start_time: startDateTime,
        end_time: endDateTime,
        note: scheduleNote.trim() || null,
      });

      setScheduleDate("");
      setStartTime("");
      setEndTime("");
      setScheduleNote("");
      setShowAddForm(false);

      const all = await doctorAvailabilityApi.list(me.facility_id);
      const mine = all
        .filter((s) => s.doctor_id === me.id && isTodayLocal(s.start_time))
        .sort(
          (a, b) =>
            new Date(a.start_time).getTime() -
            new Date(b.start_time).getTime()
        );

      setSlots(mine);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to add schedule."
      );
    } finally {
      setSaving(false);
    }
  };

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
          .filter((s) => s.doctor_id === me.id && isTodayLocal(s.start_time))
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

  <button
    type="button"
    onClick={() => {
      setShowAddForm((current) => !current);
      setError(null);
    }}
    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 text-white hover:bg-teal-800 transition-colors"
  >
    {showAddForm ? (
      <>
        <X className="w-3.5 h-3.5" />
        Cancel
      </>
    ) : (
      <>
        <Plus className="w-3.5 h-3.5" />
        Add Schedule
      </>
    )}
  </button>
</div>

{showAddForm && (
  <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        Date
        <input
          type="date"
          value={scheduleDate}
          onChange={(e) => setScheduleDate(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
        />
      </label>

      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        Note / Description
        <input
          type="text"
          value={scheduleNote}
          onChange={(e) => setScheduleNote(e.target.value)}
          placeholder="Optional schedule note"
          className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
        />
      </label>

      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        Start time
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
        />
      </label>

      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        End time
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm"
        />
      </label>
    </div>

    <div className="mt-4 flex justify-end">
      <button
        type="button"
        onClick={handleAddSchedule}
        disabled={saving}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-60 transition-colors"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? "Saving..." : "Save Schedule"}
      </button>
    </div>
  </div>
)}
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {slots.map((s) => (
              <div key={s.id} className="p-4 flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <span className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                    <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    {new Date(s.start_time).toLocaleString()} — {new Date(s.end_time).toLocaleTimeString()}
                  </span>
                  {s.note && <p className="pl-5 text-slate-500 dark:text-slate-400">{s.note}</p>}
                </div>
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
