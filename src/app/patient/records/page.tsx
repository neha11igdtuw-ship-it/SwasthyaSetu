"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { EmptyState } from "@/components/EmptyState";
import { useLanguage } from "@/lib/i18n/languageContext";
import { encountersApi, patientsApi, ApiError } from "@/lib/api/client";
import { loadOwnPatient } from "@/lib/api/ownPatient";
import type { EncounterOut, PatientOut, VitalOut } from "@/lib/api/types";
import { Clock, Loader2, Pencil, Plus, X } from "lucide-react";

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
}

const inputClass =
  "w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-100";

type FormKind = "profile" | "vitals" | "symptom" | "visit" | null;

export default function PatientRecordsPage() {
  const { t } = useLanguage();
  const [patient, setPatient] = useState<PatientOut | null>(null);
  const [encounters, setEncounters] = useState<EncounterOut[]>([]);
  const [vitalsByEncounter, setVitalsByEncounter] = useState<Record<string, VitalOut | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<FormKind>(null);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [village, setVillage] = useState("");
  const [language, setLanguage] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [pregnancyWeek, setPregnancyWeek] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [pulse, setPulse] = useState("");
  const [symptom, setSymptom] = useState("");
  const [visitNotes, setVisitNotes] = useState("");

  const fillProfile = (p: PatientOut) => {
    setFullName(p.full_name);
    setPhone(p.phone || "");
    setVillage(p.village || "");
    setLanguage(p.preferred_language || "Hindi");
    setAge(ageFromDob(p.date_of_birth)?.toString() || "");
    setGender(p.gender || "");
    setPregnancyWeek(p.pregnancy_week?.toString() || "");
    setEmergencyContact(p.emergency_contact || "");
  };

  const load = useCallback(async () => {
    const own = await loadOwnPatient();
    if (!own) {
      setError("No patient record linked to this login yet.");
      return;
    }
    const list = await encountersApi.me();
    const sorted = [...list].sort(
      (a, b) => new Date(b.encounter_date).getTime() - new Date(a.encounter_date).getTime()
    );
    const vitals: Record<string, VitalOut | null> = {};
    await Promise.all(
      sorted.slice(0, 8).map(async (enc) => {
        const rows = await encountersApi.listVitals(enc.id).catch(() => []);
        vitals[enc.id] = rows[rows.length - 1] || null;
      })
    );
    setPatient(own);
    fillProfile(own);
    setEncounters(sorted);
    setVitalsByEncounter(vitals);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load health records.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await patientsApi.updateMe({
        base_version: patient.version,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        village: village.trim() || null,
        preferred_language: language || null,
        age: age ? Number(age) : null,
        gender: gender || null,
        pregnancy_week: pregnancyWeek ? Number(pregnancyWeek) : null,
        emergency_contact: emergencyContact.trim() || null,
      });
      setPatient(updated);
      fillProfile(updated);
      setForm(null);
      setSuccess("Profile saved. Changes will stay after refresh.");
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const saveVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await encountersApi.addMyVitals({
        systolic_bp: sys ? Number(sys) : null,
        diastolic_bp: dia ? Number(dia) : null,
        pulse: pulse ? Number(pulse) : null,
        notes: "Self-reported vitals",
      });
      setForm(null);
      setSys("");
      setDia("");
      setPulse("");
      setSuccess("Vitals added to your health visit timeline.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save vitals.");
    } finally {
      setSubmitting(false);
    }
  };

  const saveSymptom = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await encountersApi.addMySymptom({ description: symptom.trim() });
      setForm(null);
      setSymptom("");
      setSuccess("Symptom note added.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save symptom note.");
    } finally {
      setSubmitting(false);
    }
  };

  const saveVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setSubmitting(true);
    setError(null);
    try {
      await encountersApi.createMine({
        patient_id: patient.id,
        encounter_type: "HEALTH_VISIT",
        notes: visitNotes.trim() || "Health visit",
      });
      setForm(null);
      setVisitNotes("");
      setSuccess("Health visit added to your timeline.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save visit.");
    } finally {
      setSubmitting(false);
    }
  };

  const displayAge = ageFromDob(patient?.date_of_birth ?? null);
  const latestVital = encounters.map((e) => vitalsByEncounter[e.id]).find(Boolean) || null;
  const maternal = Boolean(patient?.pregnancy_week || (patient?.care_pathway || "").toLowerCase().includes("maternal"));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="recordsTitle"
        subtitle="recordsSubtitle"
        roleBadge={<RoleBadge role="Patient" />}
        action={
          <button
            type="button"
            onClick={() => setForm("profile")}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold cursor-pointer"
          >
            <Pencil className="w-4 h-4" /> Edit Profile
          </button>
        }
      />

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading health records…
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

      {patient && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-900/30 border border-teal-100 text-teal-700 flex items-center justify-center font-bold text-lg">
              {patient.full_name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {t("patientId")}: {patient.id.slice(0, 8)}
              </span>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
                {patient.full_name}
                {displayAge != null ? ` (${displayAge} Yrs)` : ""}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 block">{t("pregnancyWeek")}</span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                {patient.pregnancy_week ? `Week ${patient.pregnancy_week}` : "—"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 block">{t("bloodPressureReading")}</span>
              <span className="text-sm font-extrabold text-rose-700">
                {latestVital?.systolic_bp && latestVital?.diastolic_bp
                  ? `${latestVital.systolic_bp}/${latestVital.diastolic_bp}`
                  : "—"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 block">{t("villageLabelFull")}</span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white">{patient.village || "—"}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-400 block">Emergency contact</span>
              <span className="text-xs font-bold text-teal-800">{patient.emergency_contact || t("sunitaDeviWorker")}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Current status: profile on file. Next: add a visit, vitals, or symptom note so your health worker can see the latest.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setForm("vitals")} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add vitals
        </button>
        <button type="button" onClick={() => setForm("symptom")} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add symptom note
        </button>
        <button type="button" onClick={() => setForm("visit")} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add health visit
        </button>
        <Link href="/patient/documents" className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
          Upload record / document
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
          <Clock className="w-5 h-5 text-teal-700" />
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{t("healthVisitTimeline")}</h3>
        </div>

        {!loading && encounters.length === 0 && (
          <EmptyState
            icon={Clock}
            title="No visits recorded yet"
            description="Add a health visit, vitals, or symptom note so your care team can follow your journey."
            actionLabel="Add health visit"
            onAction={() => setForm("visit")}
            secondaryLabel="Add vitals"
            onSecondary={() => setForm("vitals")}
          />
        )}

        <div className="space-y-6 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
          {encounters.map((vis) => {
            const vital = vitalsByEncounter[vis.id];
            return (
              <div key={vis.id} className="relative pl-10 space-y-1">
                <div className="absolute left-2 top-1.5 w-4 h-4 rounded-full bg-teal-700 ring-4 ring-teal-50 border-2 border-white dark:border-slate-800" />
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{vis.encounter_type}</span>
                    <span className="text-xs font-semibold text-teal-800 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded border border-teal-100">
                      {new Date(vis.encounter_date).toLocaleDateString()}
                    </span>
                  </div>
                  {vis.notes && <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{vis.notes}</p>}
                  {vital?.systolic_bp && vital?.diastolic_bp && (
                    <div className="flex gap-3 text-[11px] text-slate-500 font-medium pt-1">
                      <span>
                        BP:{" "}
                        <strong className="text-rose-700">
                          {vital.systolic_bp}/{vital.diastolic_bp}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {form && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
                {form === "profile" ? "Edit Profile" : form === "vitals" ? "Add vitals" : form === "symptom" ? "Add symptom note" : "Add health visit"}
              </h3>
              <button type="button" onClick={() => setForm(null)} className="p-1 rounded-lg text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {form === "profile" && (
              <form onSubmit={saveProfile} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">Full name</label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} required className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Phone number</label>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Age</label>
                    <input type="number" min={0} max={120} value={age} onChange={(e) => setAge(e.target.value)} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="font-bold block mb-1">Village / address</label>
                  <input value={village} onChange={(e) => setVillage(e.target.value)} className={inputClass} />
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
                    <label className="font-bold block mb-1">Gender</label>
                    <input value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass} />
                  </div>
                </div>
                {maternal && (
                  <div>
                    <label className="font-bold block mb-1">Pregnancy week</label>
                    <input type="number" min={1} max={45} value={pregnancyWeek} onChange={(e) => setPregnancyWeek(e.target.value)} className={inputClass} />
                  </div>
                )}
                <div>
                  <label className="font-bold block mb-1">Emergency contact</label>
                  <input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} className={inputClass} />
                </div>
                <p className="text-[11px] text-slate-500">Profile photo upload is not stored on the server yet. Initials are shown instead.</p>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setForm(null)} className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-xl bg-teal-700 text-white font-extrabold disabled:opacity-60 cursor-pointer">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                  </button>
                </div>
              </form>
            )}

            {form === "vitals" && (
              <form onSubmit={saveVitals} className="space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Systolic</label>
                    <input type="number" value={sys} onChange={(e) => setSys(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Diastolic</label>
                    <input type="number" value={dia} onChange={(e) => setDia(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Pulse</label>
                    <input type="number" value={pulse} onChange={(e) => setPulse(e.target.value)} className={inputClass} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setForm(null)} className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold cursor-pointer">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-xl bg-teal-700 text-white font-extrabold disabled:opacity-60 cursor-pointer">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save vitals"}
                  </button>
                </div>
              </form>
            )}

            {form === "symptom" && (
              <form onSubmit={saveSymptom} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">Symptom note</label>
                  <textarea value={symptom} onChange={(e) => setSymptom(e.target.value)} required rows={4} className={inputClass} />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setForm(null)} className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold cursor-pointer">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-xl bg-teal-700 text-white font-extrabold disabled:opacity-60 cursor-pointer">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save note"}
                  </button>
                </div>
              </form>
            )}

            {form === "visit" && (
              <form onSubmit={saveVisit} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">Visit notes</label>
                  <textarea value={visitNotes} onChange={(e) => setVisitNotes(e.target.value)} rows={4} className={inputClass} />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setForm(null)} className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold cursor-pointer">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-xl bg-teal-700 text-white font-extrabold disabled:opacity-60 cursor-pointer">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save visit"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
