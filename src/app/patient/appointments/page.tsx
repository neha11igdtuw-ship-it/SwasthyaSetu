"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { EmptyState } from "@/components/EmptyState";
import { useLanguage } from "@/lib/i18n/languageContext";
import { appointmentsApi, facilitiesApi, doctorAvailabilityApi, ApiError } from "@/lib/api/client";
import { loadOwnPatient } from "@/lib/api/ownPatient";
import type { AppointmentOut, AvailableSlotOut, FacilityOut, PatientOut } from "@/lib/api/types";
import { calculateHaversineDistance } from "@/lib/geo";
import {
  Calendar,
  Clock,
  Building2,
  Stethoscope,
  Loader2,
  X,
  Plus,
  MapPin,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Video,
} from "lucide-react";

const VISIT_REASONS = [
  "Antenatal checkup",
  "General checkup",
  "Vaccination",
  "Follow-up visit",
  "Symptom / illness",
  "Other",
];

const WIZARD_STEPS = ["Facility", "Reason", "Date", "Time slot", "Confirm"] as const;
type Slot = { id: string | null; start_time: string; end_time: string };

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Fixed 9am-5pm, 30-min slots used only when a facility has no real availability data.
 *  Kept as local wall-clock strings (no timezone conversion) to match how the rest of
 *  this form sends scheduled_at ("YYYY-MM-DDTHH:MM:00"). */
function simulatedSlotsForDate(dateStr: string): Slot[] {
  const slots: Slot[] = [];
  for (let hour = 9; hour < 17; hour++) {
    for (const minute of [0, 30]) {
      const startMinutes = hour * 60 + minute;
      const endMinutes = startMinutes + 30;
      const start = `${dateStr}T${pad(Math.floor(startMinutes / 60))}:${pad(startMinutes % 60)}:00`;
      const end = `${dateStr}T${pad(Math.floor(endMinutes / 60))}:${pad(endMinutes % 60)}:00`;
      slots.push({ id: null, start_time: start, end_time: end });
    }
  }
  return slots;
}

function formatSlotTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function isValidCoordinate(lat: unknown, lon: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180
  );
}

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
  const [customReason, setCustomReason] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  const [step, setStep] = useState(0);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [usingSimulatedSlots, setUsingSimulatedSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

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

    let defaultFacilityId = "";
    if (isValidCoordinate(own.latitude, own.longitude)) {
      // Patient has real coordinates: pick the geographically closest facility.
      let nearest: FacilityOut | undefined;
      let nearestKm = Infinity;
      for (const f of facs) {
        if (!isValidCoordinate(f.latitude, f.longitude)) continue;
        const km = calculateHaversineDistance(own.latitude!, own.longitude!, f.latitude!, f.longitude!);
        if (km < nearestKm) {
          nearestKm = km;
          nearest = f;
        }
      }
      defaultFacilityId = nearest?.id || "";
    }
    if (!defaultFacilityId) {
      // No usable coordinates on the patient (older account): fall back to a village name match.
      const patientVillage = own.village?.trim().toLowerCase();
      const nearestByAddress = patientVillage
        ? facs.find((f) => {
            const facVillage = f.village?.trim().toLowerCase();
            return facVillage && (patientVillage.includes(facVillage) || facVillage.includes(patientVillage));
          })
        : undefined;
      defaultFacilityId = nearestByAddress?.id || "";
    }
    setFacilityId((current) => current || own.facility_id || defaultFacilityId || facs[0]?.id || "");
  }, []);

  const facilitiesWithDistance = useMemo(() => {
    const canCalc = isValidCoordinate(patient?.latitude, patient?.longitude);
    const withDistance = facilities.map((f) => ({
      facility: f,
      km:
        canCalc && isValidCoordinate(f.latitude, f.longitude)
          ? calculateHaversineDistance(patient!.latitude!, patient!.longitude!, f.latitude!, f.longitude!)
          : null,
    }));
    if (canCalc) {
      withDistance.sort((a, b) => {
        if (a.km == null) return 1;
        if (b.km == null) return -1;
        return a.km - b.km;
      });
    }
    return withDistance;
  }, [facilities, patient]);

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

  const resetWizard = () => {
    setStep(0);
    setReason("");
    setCustomReason("");
    setDate("");
    setNotes("");
    setSlots([]);
    setSelectedSlot(null);
    setUsingSimulatedSlots(false);
  };

  const openForm = () => {
    resetWizard();
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetWizard();
  };

  // Fetch real availability whenever facility + date are both chosen (entering step 4);
  // fall back to fixed simulated slots when the facility has no availability data yet.
  useEffect(() => {
    if (step !== 3 || !facilityId || !date) return;
    let cancelled = false;
    setSlotsLoading(true);
    setSelectedSlot(null);
    doctorAvailabilityApi
      .available(facilityId, date)
      .then((real: AvailableSlotOut[]) => {
        if (cancelled) return;
        if (real.length > 0) {
          setSlots(real.map((s) => ({ id: s.id, start_time: s.start_time, end_time: s.end_time })));
          setUsingSimulatedSlots(false);
        } else {
          setSlots(simulatedSlotsForDate(date));
          setUsingSimulatedSlots(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSlots(simulatedSlotsForDate(date));
          setUsingSimulatedSlots(true);
        }
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [step, facilityId, date]);

  const finalReason = reason === "Other" ? customReason.trim() : reason;

  const canGoNext = (() => {
    if (step === 0) return Boolean(facilityId);
    if (step === 1) return Boolean(finalReason);
    if (step === 2) return Boolean(date);
    if (step === 3) return Boolean(selectedSlot);
    return true;
  })();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient || !selectedSlot) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await appointmentsApi.create({
        patient_id: patient.id,
        facility_id: facilityId || null,
        availability_id: selectedSlot.id || null,
        scheduled_at: selectedSlot.start_time,
        reason: finalReason || "Clinic visit",
        notes: notes.trim() || null,
      });
      closeForm();
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
            onClick={openForm}
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
          onAction={openForm}
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
            <div className="flex flex-wrap items-center gap-4">
              {app.status === "SCHEDULED" && (
                <Link
                  href={`/patient/consult/${app.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold cursor-pointer"
                >
                  <Video className="w-3.5 h-3.5" />
                  {t("joinVideoConsult")}
                </Link>
              )}
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
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Book Appointment</h3>
              <button type="button" onClick={closeForm} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ORS-style step progress */}
            <div className="flex items-center gap-1.5">
              {WIZARD_STEPS.map((label, idx) => (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold border-2 ${
                        idx < step
                          ? "bg-teal-700 border-teal-700 text-white"
                          : idx === step
                          ? "border-teal-700 text-teal-700"
                          : "border-slate-200 dark:border-slate-700 text-slate-400"
                      }`}
                    >
                      {idx < step ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wide hidden sm:block ${
                        idx <= step ? "text-teal-800 dark:text-teal-200" : "text-slate-400"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {idx < WIZARD_STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 -mt-4 ${idx < step ? "bg-teal-700" : "bg-slate-200 dark:bg-slate-700"}`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-4 text-xs">
              {/* Step 1: Facility */}
              {step === 0 && (
                <div className="space-y-2">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Choose a facility</p>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {facilitiesWithDistance.map(({ facility: f, km }) => (
                      <button
                        type="button"
                        key={f.id}
                        onClick={() => setFacilityId(f.id)}
                        className={`w-full text-left p-3 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                          facilityId === f.id
                            ? "border-teal-600 bg-teal-50 dark:bg-teal-900/30"
                            : "border-slate-200 dark:border-slate-700 hover:border-teal-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className="w-4 h-4 text-teal-700 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate">{f.name}</div>
                            {f.village && <div className="text-[10px] text-slate-500 truncate">{f.village}</div>}
                          </div>
                        </div>
                        {km != null && (
                          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-white dark:bg-slate-800 border border-teal-200 px-2 py-0.5 rounded-full">
                            <MapPin className="w-3 h-3" /> {km} km
                          </span>
                        )}
                      </button>
                    ))}
                    {facilitiesWithDistance.length === 0 && (
                      <p className="text-slate-500 text-center py-6">No facilities available right now.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Reason */}
              {step === 1 && (
                <div className="space-y-2">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Reason for visit</p>
                  <div className="flex flex-wrap gap-2">
                    {VISIT_REASONS.map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setReason(r)}
                        className={`px-3 py-2 rounded-xl border font-bold cursor-pointer transition-colors ${
                          reason === r
                            ? "border-teal-600 bg-teal-50 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200"
                            : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-teal-300"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  {reason === "Other" && (
                    <input
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Describe the reason"
                      className={inputClass}
                    />
                  )}
                </div>
              )}

              {/* Step 3: Date */}
              {step === 2 && (
                <div className="space-y-2">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Preferred date</p>
                  <input
                    type="date"
                    value={date}
                    min={toDateInputValue(new Date())}
                    onChange={(e) => setDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}

              {/* Step 4: Time slot */}
              {step === 3 && (
                <div className="space-y-2">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Available time slots</p>
                  {usingSimulatedSlots && !slotsLoading && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 rounded-lg px-2.5 py-1.5">
                      No confirmed doctor schedule yet — pick a preferred time and the facility will confirm it.
                    </p>
                  )}
                  {slotsLoading ? (
                    <div className="flex items-center gap-2 text-slate-500 py-6 justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading slots…
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1">
                      {slots.map((s) => (
                        <button
                          type="button"
                          key={s.start_time}
                          onClick={() => setSelectedSlot(s)}
                          className={`px-2 py-2 rounded-lg border font-bold cursor-pointer transition-colors ${
                            selectedSlot?.start_time === s.start_time
                              ? "border-teal-600 bg-teal-700 text-white"
                              : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-300"
                          }`}
                        >
                          {formatSlotTime(s.start_time)}
                        </button>
                      ))}
                      {slots.length === 0 && (
                        <p className="col-span-full text-slate-500 text-center py-6">No slots for this date.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Review & confirm */}
              {step === 4 && (
                <div className="space-y-3">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Review & confirm</p>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 overflow-hidden">
                    <div className="p-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-teal-700 shrink-0" />
                      <span>{facilityNames[facilityId] || facilities.find((f) => f.id === facilityId)?.name}</span>
                    </div>
                    <div className="p-3 flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-teal-700 shrink-0" />
                      <span>{finalReason}</span>
                    </div>
                    <div className="p-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-teal-700 shrink-0" />
                      <span>
                        {date && new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                        {selectedSlot ? `, ${formatSlotTime(selectedSlot.start_time)}` : ""}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Notes (optional)</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} placeholder="Anything the doctor should know" />
                  </div>
                  <p className="text-[11px] text-slate-500">After you submit, status is Requested. The facility confirms the slot.</p>
                </div>
              )}

              <div className="flex justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => (step === 0 ? closeForm() : setStep((s) => s - 1))}
                  className="inline-flex items-center gap-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> {step === 0 ? "Cancel" : "Back"}
                </button>
                {step < WIZARD_STEPS.length - 1 ? (
                  <button
                    type="button"
                    disabled={!canGoNext}
                    onClick={() => setStep((s) => s + 1)}
                    className="inline-flex items-center gap-1 px-5 py-2.5 rounded-xl bg-teal-700 text-white font-extrabold disabled:opacity-40 cursor-pointer"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting || !selectedSlot}
                    className="px-5 py-2.5 rounded-xl bg-teal-700 text-white font-extrabold disabled:opacity-60 cursor-pointer"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm booking"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
