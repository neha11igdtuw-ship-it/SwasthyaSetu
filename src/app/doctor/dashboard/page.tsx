"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { DashboardCard } from "@/components/DashboardCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import {
  authApi,
  referralsApi,
  patientsApi,
  doctorAvailabilityApi,
  ApiError,
} from "@/lib/api/client";
import type { ReferralOut, PatientOut, DoctorAvailabilityOut } from "@/lib/api/types";
import { LabReportForm } from "@/components/care/LabReportForm";
import {
  Stethoscope,
  AlertTriangle,
  Share2,
  Calendar,
  ShieldCheck,
  Loader2,
  Plus,
} from "lucide-react";

export default function DoctorDashboardPage() {
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState("");
  const [referrals, setReferrals] = useState<ReferralOut[]>([]);
  const [patientsById, setPatientsById] = useState<Record<string, PatientOut>>({});
  const [slots, setSlots] = useState<DoctorAvailabilityOut[]>([]);
  const [showLabForm, setShowLabForm] = useState(false);
  const [labSuccess, setLabSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const me = await authApi.me();
        if (!cancelled) setDoctorName(me.full_name);

        const [refs, patients] = await Promise.all([
          referralsApi.list(),
          me.facility_id ? patientsApi.list(me.facility_id) : Promise.resolve([]),
        ]);

        // Referrals directed to this doctor's facility, awaiting review.
        const incoming = refs.filter(
          (r) => r.to_facility_id === me.facility_id && (r.status === "PENDING" || r.status === "CREATED")
        );

        let avail: DoctorAvailabilityOut[] = [];
        if (me.facility_id) {
          const all = await doctorAvailabilityApi.list(me.facility_id);
          avail = all.filter((s) => s.doctor_id === me.id && !s.is_booked);
        }

        if (!cancelled) {
          setReferrals(incoming);
          setPatientsById(Object.fromEntries(patients.map((p) => [p.id, p])));
          setSlots(avail);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load doctor dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const highRiskCount = referrals.filter((r) => r.urgency === "EMERGENCY" || r.urgency === "URGENT").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${t("clinicalReviewTitle")} ${doctorName || ""}`}
        subtitle={t("districtHospitalName")}
        roleBadge={<RoleBadge role="Doctor" />}
      />

      {labSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 text-emerald-900 text-xs font-semibold">
          {labSuccess}
        </div>
      )}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm p-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading real dashboard data…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <DashboardCard
              title={t("patientsToReview")}
              value={referrals.length}
              subtitle={t("waitingForAction")}
              icon={Stethoscope}
              highlight
            />

            <DashboardCard
              title={t("hwHighRisk")}
              value={highRiskCount}
              subtitle="Urgent / emergency urgency"
              icon={AlertTriangle}
            />

            <DashboardCard
              title={t("newCareRequests")}
              value={referrals.length}
              subtitle={t("hwSpaceDesc")}
              icon={Share2}
            />

            <DashboardCard
              title={t("todaysSchedule")}
              value={slots.length}
              subtitle="Open availability slots"
              icon={Calendar}
            />
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
              <div>
                <h2 className="font-extrabold text-slate-900 dark:text-white text-lg">
                  {t("patientsToReviewAndConfirm")}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Referrals sent to your facility, awaiting review.</p>
              </div>
              <span className="text-xs font-semibold bg-sky-50 dark:bg-sky-900/30 text-sky-800 border border-sky-200 px-3 py-1 rounded-full w-fit">
                {referrals.length} {t("casesRequiringReview")}
              </span>
            </div>

            <div className="space-y-4">
              {referrals.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 text-center font-medium">
                  No pending referrals for your facility.
                </div>
              ) : (
                referrals.map((r) => {
                  const patient = patientsById[r.patient_id];
                  return (
                    <div
                      key={r.id}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="font-extrabold text-slate-900 dark:text-white text-base">
                            {patient?.full_name || "Unknown patient"}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">({r.id.slice(0, 8)})</span>
                          <StatusBadge status={r.status} />
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Specialty needed: <span className="font-bold text-slate-800 dark:text-slate-100">{r.specialty_needed || "—"}</span>
                        </div>
                      </div>

                      <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{r.reason}</p>

                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
                        <ShieldCheck className="w-4 h-4 text-teal-700" />
                        <span>
                          Urgency: <strong className="text-slate-900 dark:text-white">{r.urgency}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-extrabold text-slate-900 dark:text-white text-lg">Lab tests & reports</h2>
                <p className="text-xs text-slate-500">Upload a report so the patient sees it on Lab Tests.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLabForm(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Lab Test / Upload Report
              </button>
            </div>
          </div>
        </>
      )}
      {showLabForm && (
        <LabReportForm
          onClose={() => setShowLabForm(false)}
          onSaved={() => {
            setShowLabForm(false);
            setLabSuccess("Report uploaded. The patient will see it after refresh.");
          }}
        />
      )}
    </div>
  );
}
