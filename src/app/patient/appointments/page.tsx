"use client";

import React, { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { EmptyState } from "@/components/EmptyState";
import { useLanguage } from "@/lib/i18n/languageContext";
import { appointmentsApi, facilitiesApi, ApiError } from "@/lib/api/client";
import { loadOwnPatient } from "@/lib/api/ownPatient";
import type { AppointmentOut, FacilityOut, PatientOut } from "@/lib/api/types";
import { Calendar, Clock, Building2, Stethoscope, Loader2, X, Plus } from "lucide-react";

function appointmentLabel(status: AppointmentOut["status"]): string {
  switch (status) {
    case "SCHEDULED":
      return "Requested";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "NO_SHOW":
      return "No-show";
    default:
      return status;
  }
}

function nextActor(status: AppointmentOut["status"]): string {
  if (status === "SCHEDULED") return "Next: facility or doctor will confirm this visit.";
  if (status === "COMPLETED") return "Next: follow any instructions from your doctor.";
  if (status === "CANCELLED") return "Next: you can book a new appointment.";
  return "Next: contact your health worker if you still need care.";
}

const inputClass =
  "w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-100";

export default function PatientAppointmentsPage() {
  const { t } = useLanguage();
  const [patient, setPatient] = useState<PatientOut | null>(null);
  const [appointments, setAppointments] = useState<AppointmentOut[]>([]);
  const [facilities, setFacilities] = useState<FacilityOut[]>([]);
  const [facilityNames, setFacilityNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const [facilityId, setFacilityId] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    const own = await loadOwnPatient();
    if (!own) {
      setError("No patient record linked to this login yet.");
      return;
    }
    const [list, facs] = await Promise.all([appointmentsApi.me(), facilitiesApi.list()]);
    const names: Record<string, string> = {};
    for (const f of facs) names[f.id] = f.name;
    setPatient(own);
    setAppointments(list);
    setFacilities(facs);
    setFacilityNames(names);
    setFacilityId((current) => current || own.facility_id || facs[0]?.id || "");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load appointments.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      if (!date || !time) throw new Error("Choose a preferred date and time.");
      await appointmentsApi.create({
        patient_id: patient.id,
        facility_id: facilityId || null,
        scheduled_at: `${date}T${time}:00`,
        reason: reason.trim() || "Clinic visit",
        notes: notes.trim() || null,
      });
      setShowForm(false);
      setReason("");
      setNotes("");
      setSuccess("Appointment requested. The facility will confirm the slot.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Could not book appointment.");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelAppt = async (app: AppointmentOut) => {
    setActingId(app.id);
    setError(null);
    try {
      await appointmentsApi.updateStatus(app.id, { base_version: app.version, status: "CANCELLED" });
      setSuccess("Appointment cancelled.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel appointment.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="bookManageAppointmentsTitle"
        subtitle="bookManageAppointmentsSubtitle"
        roleBadge={<RoleBadge role="Patient" />}
        action={
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Book Appointment
          </button>
        }
      />

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading appointments…
        </div>
      )}
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 text-emerald-900 text-xs font-semibold">
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}
      {!loading && !error && appointments.length === 0 && (
        <EmptyState
          icon={Calendar}
          title="No appointments yet"
          description="No appointments scheduled yet. Book your next visit with a doctor or facility."
          actionLabel="Book Appointment"
          onAction={() => setShowForm(true)}
        />
      )}

      <div className="space-y-4">
        {appointments.map((app) => (
          <div
            key={app.id}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/30 border border-teal-100 text-teal-700">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {t("appointmentId")}: {app.id.slice(0, 8)}
                  </span>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                    {app.reason || t("maternalCare")}
                  </h4>
                </div>
              </div>
              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {appointmentLabel(app.status)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-700 shrink-0" />
                <span>
                  Status: <strong>{appointmentLabel(app.status)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-700 shrink-0" />
                <span>
                  {t("hospital")}:{" "}
                  <strong>
                    {app.facility_id ? facilityNames[app.facility_id] || "Selected facility" : "To be assigned"}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2 text-teal-900 dark:text-teal-200 font-bold bg-teal-50 dark:bg-teal-900/30 p-2.5 rounded-xl border border-teal-100">
                <Clock className="w-4 h-4 text-teal-700 shrink-0" />
                <span>
                  {t("dateTime")}: {new Date(app.scheduled_at).toLocaleString()}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{nextActor(app.status)}</p>
            {app.status === "SCHEDULED" && (
              <button
                type="button"
                disabled={actingId === app.id}
                onClick={() => cancelAppt(app)}
                className="text-xs font-bold text-rose-700 hover:underline cursor-pointer"
              >
                {actingId === app.id ? "Cancelling…" : "Cancel appointment"}
              </button>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Book Appointment</h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Facility / doctor</label>
                <select value={facilityId} onChange={(e) => setFacilityId(e.target.value)} className={inputClass} required>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Appointment reason</label>
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Antenatal checkup" className={inputClass} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Preferred date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} required />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Preferred time</label>
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} required />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} placeholder="Anything the doctor should know" />
              </div>
              <p className="text-[11px] text-slate-500">After you submit, status is Requested. The facility confirms the slot.</p>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-xl bg-teal-700 text-white font-extrabold disabled:opacity-60 cursor-pointer">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
