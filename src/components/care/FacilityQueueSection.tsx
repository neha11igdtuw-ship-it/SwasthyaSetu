"use client";

import React, { useCallback, useEffect, useState } from "react";
import { facilitiesApi, facilityQueueApi, queueDesksApi, ApiError } from "@/lib/api/client";
import type { FacilityQueueOverviewOut, FacilityDoctorOut } from "@/lib/api/types";
import { Plus, QrCode, Loader2, PauseCircle, PlayCircle, X } from "lucide-react";

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

const POLL_INTERVAL_MS = 25000;

export function FacilityQueueSection({ facilityId }: { facilityId: string }) {
  const [overview, setOverview] = useState<FacilityQueueOverviewOut | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [qrDeskId, setQrDeskId] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrPayload, setQrPayload] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await facilityQueueApi.overview(facilityId);
      setOverview(result);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load queue overview.");
    }
  }, [facilityId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  async function togglePause(desk: { queue_desk_id: string; is_paused: boolean }) {
    try {
      if (desk.is_paused) {
        await queueDesksApi.resume(desk.queue_desk_id);
      } else {
        await queueDesksApi.pause(desk.queue_desk_id, "Paused by facility admin");
      }
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Action failed.");
    }
  }

  async function showQr(deskId: string) {
    setQrDeskId(deskId);
    setQrImage(null);
    setQrPayload(null);
    try {
      const qr = await queueDesksApi.qr(deskId);
      setQrPayload(qr.qr_payload);
      setQrImage(qr.qr_image_base64);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load QR code.");
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
        <div>
          <h2 className="font-extrabold text-slate-900 dark:text-white text-lg">OPD Queue Desks</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Grouped by department, room and doctor — live token, waiting count and delay status
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="shrink-0 py-2 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> New Queue Desk
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {showForm && (
        <CreateDeskForm
          facilityId={facilityId}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {!overview ? (
        <div className="flex items-center gap-2 text-slate-500 text-xs p-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : overview.desks.length === 0 ? (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 text-center font-medium">
          No queue desks set up yet for this facility.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {overview.desks.map((d) => (
            <div
              key={d.queue_desk_id}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white text-sm">{d.display_name}</span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    d.is_paused ? "bg-amber-100 text-amber-900 border border-amber-200" : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                  }`}
                >
                  {d.is_paused ? "Delayed" : "Running"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {d.department} {d.room_number ? `· Room ${d.room_number}` : ""}
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-700 dark:text-slate-300">
                <span>Now serving: <strong>#{d.current_token_number ?? "—"}</strong></span>
                <span>Waiting: <strong>{d.waiting_count}</strong></span>
                <span>Avg wait: <strong>{d.average_wait_minutes} min</strong></span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => togglePause(d)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:underline"
                >
                  {d.is_paused ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
                  {d.is_paused ? "Resume" : "Pause"}
                </button>
                <button
                  type="button"
                  onClick={() => showQr(d.queue_desk_id)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:underline"
                >
                  <QrCode className="w-3.5 h-3.5" /> QR code
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {qrDeskId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-xs w-full space-y-3 relative">
            <button
              type="button"
              onClick={() => setQrDeskId(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Queue Desk QR Code</h3>
            {qrImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- base64 data URI, not a next/image candidate
              <img
                src={`data:image/png;base64,${qrImage}`}
                alt="Queue desk QR code"
                className="w-full rounded-xl border border-slate-200"
              />
            ) : qrPayload ? (
              <p className="text-[11px] font-mono break-all text-slate-500">{qrPayload}</p>
            ) : (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            )}
            <p className="text-[11px] text-slate-500">
              Print this at the OPD counter/room. It only identifies the queue desk — no patient data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateDeskForm({
  facilityId,
  onCreated,
  onCancel,
}: {
  facilityId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [department, setDepartment] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [doctors, setDoctors] = useState<FacilityDoctorOut[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [avgMinutes, setAvgMinutes] = useState(10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    facilitiesApi
      .doctors(facilityId)
      .then(setDoctors)
      .catch(() => setDoctors([]))
      .finally(() => setDoctorsLoading(false));
  }, [facilityId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!doctorId) {
      setError("Select which doctor this queue desk belongs to.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await queueDesksApi.create({
        facility_id: facilityId,
        department,
        room_number: roomNumber || undefined,
        doctor_id: doctorId,
        display_name: displayName || `${department} - OPD`,
        average_consultation_minutes: avgMinutes,
      });
      onCreated();
    } catch (e) {
      setError(describeApiError(e, "Could not create queue desk."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3"
    >
      {error && (
        <div className="sm:col-span-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}
      <LabeledInput label="Department" value={department} onChange={setDepartment} required />
      <LabeledInput label="Room number" value={roomNumber} onChange={setRoomNumber} />
      <div>
        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">Doctor</label>
        {doctorsLoading ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 p-2.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading doctors…
          </div>
        ) : doctors.length === 0 ? (
          <p className="text-[11px] text-amber-700 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
            No doctor accounts are registered at this facility yet. Ask an admin to register one first.
          </p>
        ) : (
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            required
            className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
          >
            <option value="">Select doctor…</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name} ({d.email})
              </option>
            ))}
          </select>
        )}
      </div>
      <LabeledInput label="Display name" value={displayName} onChange={setDisplayName} placeholder="e.g. Cardiology - Dr. Rao" />
      <div>
        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
          Avg. consultation minutes
        </label>
        <input
          type="number"
          min={1}
          value={avgMinutes}
          onChange={(e) => setAvgMinutes(Number(e.target.value))}
          className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
        />
      </div>
      <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !department || !doctorId}
          className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold disabled:opacity-50"
        >
          {saving ? "Saving…" : "Create Desk"}
        </button>
      </div>
    </form>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
      />
    </div>
  );
}
