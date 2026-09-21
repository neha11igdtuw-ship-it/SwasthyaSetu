"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { facilitiesApi, queueDesksApi, queueApi, ApiError } from "@/lib/api/client";
import type { FacilityOut, QueueDeskOut } from "@/lib/api/types";
import { QrCode, ListChecks, Loader2, CheckCircle2, CameraOff } from "lucide-react";

type Tab = "manual" | "qr";

export default function JoinQueuePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("manual");

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PageHeader title="Join OPD Queue" subtitle="Skip the physical line — join from here" roleBadge={<RoleBadge role="Patient" />} />

      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setTab("manual")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 ${
            tab === "manual" ? "bg-white dark:bg-slate-700 shadow-sm text-teal-800" : "text-slate-500"
          }`}
        >
          <ListChecks className="w-4 h-4" /> Manual selection
        </button>
        <button
          type="button"
          onClick={() => setTab("qr")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 ${
            tab === "qr" ? "bg-white dark:bg-slate-700 shadow-sm text-teal-800" : "text-slate-500"
          }`}
        >
          <QrCode className="w-4 h-4" /> Scan QR code
        </button>
      </div>

      {tab === "manual" ? (
        <ManualJoin onJoined={() => router.push(`/patient/dashboard`)} />
      ) : (
        <QrJoin onJoined={() => router.push(`/patient/dashboard`)} />
      )}
    </div>
  );
}

function ManualJoin({ onJoined }: { onJoined: (entryId: string) => void }) {
  const [facilities, setFacilities] = useState<FacilityOut[]>([]);
  const [facilityId, setFacilityId] = useState("");
  const [desks, setDesks] = useState<QueueDeskOut[]>([]);
  const [desksLoading, setDesksLoading] = useState(false);
  const [deskId, setDeskId] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    facilitiesApi.list().then(setFacilities).catch(() => setFacilities([]));
  }, []);

  useEffect(() => {
    if (!facilityId) {
      setDesks([]);
      setDeskId("");
      return;
    }
    setDesksLoading(true);
    queueDesksApi
      .list(facilityId)
      .then((rows) => setDesks(rows.filter((d) => d.is_active)))
      .catch(() => setDesks([]))
      .finally(() => setDesksLoading(false));
  }, [facilityId]);

  const selectedDesk = desks.find((d) => d.id === deskId);
  // "department" and "room" are properties of a desk, so once a facility is
  // picked the desk list itself is the department -> room -> doctor drill-down.
  const departments = Array.from(new Set(desks.map((d) => d.department)));
  const [department, setDepartment] = useState("");
  const roomsForDepartment = desks.filter((d) => d.department === department);

  async function handleJoin() {
    if (!deskId) return;
    setJoining(true);
    setError(null);
    try {
      const entry = await queueApi.join({ queue_desk_id: deskId });
      onJoined(entry.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not join the queue.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6 space-y-5">
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      <Field label="1. Select Facility">
        <select
          value={facilityId}
          onChange={(e) => {
            setFacilityId(e.target.value);
            setDepartment("");
            setDeskId("");
          }}
          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
        >
          <option value="">Choose a facility…</option>
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </Field>

      {facilityId && (
        <Field label="2. Select Department">
          {desksLoading ? (
            <LoadingRow />
          ) : departments.length === 0 ? (
            <EmptyRow text="No active OPD queues at this facility yet." />
          ) : (
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setDeskId("");
              }}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
            >
              <option value="">Choose a department…</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}

      {department && (
        <Field label="3. Select Room / Doctor">
          <select
            value={deskId}
            onChange={(e) => setDeskId(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm"
          >
            <option value="">Choose a room / doctor…</option>
            {roomsForDepartment.map((d) => (
              <option key={d.id} value={d.id}>
                {d.display_name} {d.room_number ? `(Room ${d.room_number})` : ""}
                {d.is_paused ? " — delayed" : ""}
              </option>
            ))}
          </select>
        </Field>
      )}

      {selectedDesk && (
        <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-900/30 border border-teal-200 text-xs text-teal-900 space-y-1">
          <p className="font-extrabold">{selectedDesk.display_name}</p>
          <p>Department: {selectedDesk.department}</p>
          {selectedDesk.room_number && <p>Room: {selectedDesk.room_number}</p>}
          <p>Average consultation time: {selectedDesk.average_consultation_minutes} min</p>
          {selectedDesk.is_paused && (
            <p className="text-amber-700 font-bold">Doctor currently delayed: {selectedDesk.pause_reason}</p>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={!deskId || joining}
        onClick={handleJoin}
        className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-extrabold disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        {joining ? "Joining…" : "Join Queue"}
      </button>
    </div>
  );
}

function QrJoin({ onJoined }: { onJoined: (entryId: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const [payload, setPayload] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (payload) return; // already scanned — no need to keep the camera running
    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled || !containerRef.current) return;
        const scanner = new Html5Qrcode(containerRef.current.id);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 220 },
          (decodedText) => {
            setPayload(decodedText);
            scanner.stop().catch(() => {});
          },
          () => {
            // per-frame decode failures are expected while framing the code; ignore
          }
        );
      } catch {
        setCameraError(
          "Could not access the camera. Please allow camera permission, or use manual selection instead."
        );
      }
    })();

    return () => {
      cancelled = true;
      scannerRef.current?.stop().catch(() => {});
    };
  }, [payload]);

  async function handleConfirmJoin() {
    if (!payload) return;
    setJoining(true);
    setJoinError(null);
    try {
      const entry = await queueApi.joinByQr({ qr_payload: payload });
      onJoined(entry.id);
    } catch (e) {
      setJoinError(e instanceof ApiError ? e.message : "This QR code did not match an active queue.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6 space-y-4">
      {!payload ? (
        <>
          <p className="text-xs text-slate-500 font-medium">
            Point your camera at the QR code displayed at the OPD counter / queue desk.
          </p>
          {cameraError ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 text-amber-900 text-xs font-semibold flex items-start gap-2">
              <CameraOff className="w-4 h-4 mt-0.5 shrink-0" />
              {cameraError}
            </div>
          ) : (
            <div
              id="queue-qr-reader"
              ref={containerRef}
              className="w-full aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden bg-slate-900"
            />
          )}
        </>
      ) : (
        <div className="space-y-4">
          {joinError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
              {joinError}
            </div>
          )}
          <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-900/30 border border-teal-200 text-teal-900 text-xs space-y-1">
            <p className="font-extrabold">QR code scanned.</p>
            <p>Tap Confirm Join Queue to take a token at this desk.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPayload(null)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-600"
            >
              Scan again
            </button>
            <button
              type="button"
              disabled={joining}
              onClick={handleConfirmJoin}
              className="flex-1 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold disabled:opacity-60"
            >
              {joining ? "Joining…" : "Confirm Join Queue"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-600 dark:text-slate-300">{label}</label>
      {children}
    </div>
  );
}

function LoadingRow() {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <div className="text-xs text-slate-400 p-2">{text}</div>;
}
