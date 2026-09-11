"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import { authApi, patientsApi, referralsApi, facilitiesApi, ApiError } from "@/lib/api/client";
import { referralOutToHWReferral } from "@/lib/api/adapters";
import type { PatientOut, FacilityOut, ReferralOut } from "@/lib/api/types";
import { Share2, ArrowRight, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function FacilityCareRequestsPage() {
  const { t } = useLanguage();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [rawReferrals, setRawReferrals] = useState<ReferralOut[]>([]);
  const [referrals, setReferrals] = useState<ReturnType<typeof referralOutToHWReferral>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const me = await authApi.me();
      setFacilityId(me.facility_id);
      const [patientList, facilityList, referralList] = await Promise.all([
        patientsApi.list(),
        facilitiesApi.list(),
        referralsApi.list(),
      ]);
      const patientNameById = new Map<string, string>(patientList.map((p: PatientOut) => [p.id, p.full_name]));
      const facilityNameById = new Map<string, string>(facilityList.map((f: FacilityOut) => [f.id, f.name]));
      const incoming = referralList.filter((r) => r.to_facility_id === me.facility_id);
      setRawReferrals(incoming);
      setReferrals(
        incoming.map((r) =>
          referralOutToHWReferral(
            r,
            patientNameById.get(r.patient_id) || "Unknown Patient",
            facilityNameById.get(r.to_facility_id || "") || "Unknown Facility"
          )
        )
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load care requests from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTransition = async (id: string, version: number, status: "ACCEPTED" | "REJECTED") => {
    setActingId(id);
    setError(null);
    try {
      await referralsApi.transition(id, { base_version: version, status });
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
        subtitle="Referrals sent to this facility"
        roleBadge={<RoleBadge role="Healthcare Facility" />}
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

      <div className="space-y-4">
        {!loading && referrals.map((ref, idx) => {
          const raw = rawReferrals[idx];
          const canAct = raw.status === "PENDING" || raw.status === "CREATED";
          return (
            <div key={ref.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <Share2 className="w-4 h-4 text-teal-700" />
                  <span className="font-extrabold text-slate-900 dark:text-white text-base">{ref.patientName}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">({ref.patientId.slice(0, 8)})</span>
                  <StatusBadge status={ref.status} />
                </div>
                <span className="text-xs font-bold text-rose-800 bg-rose-50 dark:bg-rose-900/30 px-2.5 py-0.5 rounded border border-rose-200">
                  {ref.priority} Priority
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block">{t("reasonForTransfer")}</span>
                  <strong className="text-slate-900 dark:text-white font-bold">{ref.reason}</strong>
                </div>
                <div>
                  <Link
                    href={`/hw/patients/${ref.patientId}`}
                    className="text-teal-700 font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <span>{t("viewPatientDetails")}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {canAct && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={actingId === raw.id}
                    onClick={() => handleTransition(raw.id, raw.version, "REJECTED")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                  <button
                    type="button"
                    disabled={actingId === raw.id}
                    onClick={() => handleTransition(raw.id, raw.version, "ACCEPTED")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {actingId === raw.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Accept
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {!loading && referrals.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700">
            No care requests for this facility{facilityId ? "" : " (admin view — no single facility)"}.
          </div>
        )}
      </div>
    </div>
  );
}
