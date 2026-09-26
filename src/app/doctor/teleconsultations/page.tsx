"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import { appointmentsApi, ApiError } from "@/lib/api/client";
import type { AppointmentOut } from "@/lib/api/types";
import { CheckCircle2, Loader2, Video, XCircle } from "lucide-react";

type Tab = "requests" | "upcoming" | "history";

function statusLabel(status: AppointmentOut["status"]) {
  switch (status) {
    case "REQUESTED":
      return "Pending Acceptance";
    case "SCHEDULED":
      return "Accepted";
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

export default function DoctorTeleconsultationsPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>("requests");
  const [upcomingRows, setUpcomingRows] = useState<AppointmentOut[]>([]);
  const [historyRows, setHistoryRows] = useState<AppointmentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [upcoming, history] = await Promise.all([
        appointmentsApi.doctorMe(false),
        appointmentsApi.doctorMe(true),
      ]);
      setUpcomingRows(upcoming.filter((a) => a.mode === "TELECONSULT"));
      setHistoryRows(history.filter((a) => a.mode === "TELECONSULT"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load teleconsultations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const respond = async (appointment: AppointmentOut, status: "SCHEDULED" | "CANCELLED") => {
    try {
      setActingId(appointment.id);
      await appointmentsApi.updateStatus(appointment.id, {
        base_version: appointment.version,
        status,
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update the request.");
    } finally {
      setActingId(null);
    }
  };

  const requests = upcomingRows.filter((a) => a.status === "REQUESTED");
  const upcoming = upcomingRows.filter((a) => a.status === "SCHEDULED");
  const rows = tab === "requests" ? requests : tab === "upcoming" ? upcoming : historyRows;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Teleconsultations"
        subtitle="Incoming teleconsultation requests, upcoming video visits, and history"
        roleBadge={<RoleBadge role="Doctor" />}
      />

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        {(
          [
            { key: "requests" as const, label: `Requests${requests.length ? ` (${requests.length})` : ""}` },
            { key: "upcoming" as const, label: "Upcoming" },
            { key: "history" as const, label: "History" },
          ]
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              tab === item.key
                ? "bg-teal-700 text-white"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading…</span>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {rows.map((app) => (
              <div key={app.id} className="p-4 flex items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {app.patient_name || "Patient"}
                  </span>
                  <p className="text-slate-500 dark:text-slate-400">
                    {new Date(app.scheduled_at).toLocaleString()}
                  </p>
                  {app.reason && <p className="text-slate-500 dark:text-slate-400">{app.reason}</p>}
                  <StatusBadge status={statusLabel(app.status)} />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {app.status === "REQUESTED" && (
                    <>
                      <button
                        type="button"
                        disabled={actingId === app.id}
                        onClick={() => void respond(app, "SCHEDULED")}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold disabled:opacity-60 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={actingId === app.id}
                        onClick={() => void respond(app, "CANCELLED")}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold disabled:opacity-60 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Decline
                      </button>
                    </>
                  )}
                  {app.status === "SCHEDULED" && (
                    <Link
                      href={`/doctor/consult/${app.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5" />
                      {t("startVideoConsult")}
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {rows.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                {tab === "requests"
                  ? "No pending teleconsultation requests."
                  : tab === "upcoming"
                    ? "No upcoming teleconsultations."
                    : "No past teleconsultations yet."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
