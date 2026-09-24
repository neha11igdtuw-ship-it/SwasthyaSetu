"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import { authApi, patientsApi, referralsApi, ApiError } from "@/lib/api/client";
import type { ReferralOut, PatientOut } from "@/lib/api/types";
import { Share2, CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";

export default function DoctorCareRequestsPage() {
  const { t } = useLanguage();
  const [referrals, setReferrals] = useState<ReferralOut[]>([]);
  const [patientsById, setPatientsById] = useState<Record<string, PatientOut>>({});
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const me = await authApi.me();
      setFacilityId(me.facility_id);
      const [refs, patients] = await Promise.all([
        referralsApi.list(),
        me.facility_id ? patientsApi.list(me.facility_id) : Promise.resolve([]),
      ]);
      const incoming = refs.filter((r) => r.to_facility_id === me.facility_id);
      setReferrals(incoming);
      setPatientsById(Object.fromEntries(patients.map((p) => [p.id, p])));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load care requests from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const visibleReferrals = referrals.filter((referral) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "ACTIONABLE") return referral.status === "PENDING" || referral.status === "CREATED";
    return referral.status === statusFilter;
  });

  const handleTransition = async (r: ReferralOut, status: "ACCEPTED" | "REJECTED") => {
    setActingId(r.id);
    setError(null);
    try {
      await referralsApi.transition(r.id, { base_version: r.version, status });
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update the care request.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title={t("careRequestsTitle")}
        subtitle="Referrals sent to your facility for review"
        roleBadge={<RoleBadge role="Doctor" />}
      />

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {loading && (
        <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading care requests…</span>
        </div>
      )}

      <div className="flex justify-end">
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          Show
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2"
          >
            <option value="ALL">All requests</option>
            <option value="ACTIONABLE">Needs action</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </label>
      </div>

      <div className="space-y-4">
        {!loading && visibleReferrals.map((r) => {
          const patient = patientsById[r.patient_id];
          const canAct = r.status === "PENDING" || r.status === "CREATED";
          const canViewPatient = Boolean(patient && patient.facility_id && patient.facility_id === facilityId);
          const urgency = r.urgency.toUpperCase();
          const urgencyClass = urgency === "EMERGENCY"
            ? "bg-rose-50 dark:bg-rose-900/30 text-rose-800 border-rose-200"
            : urgency === "URGENT"
              ? "bg-amber-50 dark:bg-amber-900/30 text-amber-800 border-amber-200"
              : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600";
          return (
            <div key={r.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-700 flex items-center justify-center shrink-0">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 dark:text-white text-base">
                        {r.patient_name || patient?.full_name || "Unknown patient"}
                      </span>
                      <StatusBadge status={r.status} />
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs border font-bold ${urgencyClass}`}>
                        {urgency}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                      Patient ID: {r.patient_id}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Specialty needed: <span className="font-bold text-slate-800 dark:text-slate-100">{r.specialty_needed || "—"}</span>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700 p-4">
                <span className="block text-[10px] uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">Reason for transfer</span>
                <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">{r.reason || "Not available"}</p>
                {r.notes && <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">Notes: {r.notes}</p>}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                {canViewPatient ? (
                  <Link
                    href={`/doctor/patients/${r.patient_id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
                  >
                    View Patient Details <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Patient record unavailable for this facility
                  </span>
                )}

                <div className="flex items-center gap-2">
                  {canAct && (
                    <>
                      <button
                        type="button"
                        disabled={actingId === r.id}
                        onClick={() => handleTransition(r, "REJECTED")}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition-colors disabled:opacity-60 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button
                        type="button"
                        disabled={actingId === r.id}
                        onClick={() => handleTransition(r, "ACCEPTED")}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors disabled:opacity-60 cursor-pointer"
                      >
                        {actingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Accept
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {!loading && referrals.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            No care requests for your facility{facilityId ? "" : " (no facility assigned)"}.
          </div>
        )}
        {!loading && referrals.length > 0 && visibleReferrals.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            No care requests match this status.
          </div>
        )}
      </div>
    </div>
  );
}
