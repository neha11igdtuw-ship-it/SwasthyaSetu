"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { EmptyState } from "@/components/EmptyState";
import { ReferralStatusStepper } from "@/components/care/ReferralStatusStepper";
import { useLanguage } from "@/lib/i18n/languageContext";
import { facilitiesApi, referralsApi, ApiError } from "@/lib/api/client";
import { loadOwnPatient } from "@/lib/api/ownPatient";
import type { ReferralOut } from "@/lib/api/types";
import { stepsFromReferralStatus, currentStepLabel } from "@/lib/referral/stepper";
import { Share2, ShieldCheck, Loader2, X, Plus } from "lucide-react";

function nextActor(status: ReferralOut["status"]): string {
  if (status === "CREATED" || status === "PENDING") return "Next: health worker or facility will accept this request.";
  if (status === "ACCEPTED") return "Next: visit the facility. Staff will mark the patient visit.";
  if (status === "IN_TRANSIT") return "Next: facility continues tests and treatment.";
  if (status === "COMPLETED") return "Next: follow-up if your doctor asks for one.";
  if (status === "REJECTED" || status === "CANCELLED") return "Next: start a new care request or tell symptoms.";
  return "Next: refresh to see the latest facility update.";
}

const inputClass =
  "w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-100";

export default function PatientReferralsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<ReferralOut[]>([]);
  const [facilityNames, setFacilityNames] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [concern, setConcern] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [language, setLanguage] = useState("Hindi");
  const [urgency, setUrgency] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    const own = await loadOwnPatient();
    if (!own) {
      setError("No patient record linked to this login yet.");
      return;
    }
    const [list, facs] = await Promise.all([referralsApi.me(), facilitiesApi.list()]);
    const names: Record<string, string> = {};
    for (const f of facs) names[f.id] = f.name;
    setReferrals(list);
    setFacilityNames(names);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load care requests.");
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
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await referralsApi.requestCare({
        main_concern: concern.trim(),
        symptoms: symptoms.trim() || null,
        preferred_language: language,
        urgency,
        notes: notes.trim() || null,
      });
      setShowForm(false);
      setConcern("");
      setSymptoms("");
      setNotes("");
      setSuccess("Care request sent. Your health worker and the facility can now update progress.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Could not start care request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="referralProgressTitle"
        subtitle="referralProgressSubtitle"
        roleBadge={<RoleBadge role="Patient" />}
        action={
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Start Care Request
          </button>
        }
      />

      {loading && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-600 text-xs font-semibold flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Checking latest care request status on server…
        </div>
      )}
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 text-emerald-900 text-xs font-semibold">
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 text-amber-900 text-xs font-semibold">
          {error}
        </div>
      )}

      {!loading && referrals.length === 0 && !error && (
        <EmptyState
          icon={Share2}
          title="No care request yet"
          description="No care request yet. Start by telling your symptoms or requesting care."
          actionLabel="Start Care Request"
          onAction={() => setShowForm(true)}
          secondaryLabel="Tell Symptoms"
          onSecondary={() => router.push("/patient/symptoms")}
        />
      )}

      {referrals.map((referral) => (
        <div
          key={referral.id}
          className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/30 border border-teal-100 text-teal-700">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t("careRequestId")}: {referral.id.slice(0, 8)}
                </span>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
                  {referral.to_facility_id
                    ? facilityNames[referral.to_facility_id] || t("districtHospitalName")
                    : t("districtHospitalName")}
                </h3>
              </div>
            </div>
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
              {referral.urgency} {t("priorityText")}
            </span>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">{t("careRequestProgressStage")}</span>
            <ReferralStatusStepper steps={stepsFromReferralStatus(referral.status)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border text-xs">
            <div>
              <span className="text-slate-500 block">{t("reasonForCareRequest")}</span>
              <span className="font-bold text-slate-900 dark:text-white">{referral.reason}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Server status</span>
              <span className="font-bold text-teal-800">{referral.status}</span>
            </div>
            {referral.notes && (
              <div className="sm:col-span-2">
                <span className="text-slate-500 block">Notes</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{referral.notes}</span>
              </div>
            )}
            <div className="sm:col-span-2 flex items-center gap-1.5 text-slate-600 border-t border-slate-200/60 pt-2">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              <span>
                Current Stage: <strong className="text-teal-900">{currentStepLabel(referral.status)}</strong>
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">{nextActor(referral.status)}</p>
          <button
            type="button"
            onClick={load}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold cursor-pointer"
          >
            Refresh status
          </button>
        </div>
      ))}

      <p className="text-[11px] text-slate-500">
        Prefer to describe symptoms first?{" "}
        <Link href="/patient/symptoms" className="text-teal-700 font-bold hover:underline">
          Tell Symptoms
        </Link>
      </p>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Start Care Request</h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded-lg text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Main concern</label>
                <input value={concern} onChange={(e) => setConcern(e.target.value)} required className={inputClass} />
              </div>
              <div>
                <label className="font-bold block mb-1">Symptoms</label>
                <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={3} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Preferred language</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputClass}>
                    <option>Hindi</option>
                    <option>English</option>
                    <option>Marathi</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Urgency</label>
                  <select value={urgency} onChange={(e) => setUrgency(e.target.value as "LOW" | "MEDIUM" | "HIGH")} className={inputClass}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold block mb-1">Optional notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} />
              </div>
              <p className="text-[11px] text-slate-500">Your health worker will see this request. The facility can accept and update progress.</p>
              <div className="flex justify-end gap-2">
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
