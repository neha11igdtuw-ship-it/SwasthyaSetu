"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import { teleconsultationApi, ApiError } from "@/lib/api/client";
import type {
  TeleconsultationDoctorOut,
  TeleconsultationAppointmentOut,
  SpecialityOut,
} from "@/lib/api/types";
import {
  Video,
  Calendar,
  Clock,
  UserCheck,
  Building2,
  Stethoscope,
  AlertTriangle,
  Loader2,
  Search,
  ArrowRight,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  Languages,
  Award,
} from "lucide-react";

export default function PatientTeleconsultationPage() {
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [specialities, setSpecialities] = useState<SpecialityOut[]>([]);
  const [selectedSpeciality, setSelectedSpeciality] = useState<string>("ALL");
  const [doctors, setDoctors] = useState<TeleconsultationDoctorOut[]>([]);
  const [myAppointments, setMyAppointments] = useState<TeleconsultationAppointmentOut[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [problemDescription, setProblemDescription] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [specs, docs, appts] = await Promise.all([
          teleconsultationApi.specialities().catch(() => []),
          teleconsultationApi.doctors().catch(() => []),
          teleconsultationApi.myAppointments().catch(() => []),
        ]);

        if (!cancelled) {
          setSpecialities(specs);
          setDoctors(docs);
          setMyAppointments(appts);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Failed to load teleconsultation services."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSpecialityChange = async (spec: string) => {
    setSelectedSpeciality(spec);
    try {
      const docs = await teleconsultationApi.doctors({
        speciality: spec === "ALL" ? undefined : spec,
      });
      setDoctors(docs);
    } catch {
      // fallback
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.full_name.toLowerCase().includes(q) ||
      (doc.speciality && doc.speciality.toLowerCase().includes(q)) ||
      (doc.facility_name && doc.facility_name.toLowerCase().includes(q)) ||
      (doc.languages && doc.languages.toLowerCase().includes(q))
    );
  });

  const activeOrUpcomingAppointments = myAppointments.filter(
    (a) => a.status === "CONFIRMED" || a.status === "BOOKED" || a.status === "IN_PROGRESS"
  );
  const pastAppointments = myAppointments.filter(
    (a) => a.status === "COMPLETED" || a.status === "CANCELLED"
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <PageHeader
        title={t("teleconsultationTitle")}
        subtitle={t("teleconsultationSubtitle")}
      />

      {/* Emergency Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-amber-900 dark:text-amber-200">
          <p className="font-bold">Important Emergency Notice</p>
          <p>
            Teleconsultation is meant for non-emergency medical guidance and routine follow-ups. If you are experiencing severe breathing difficulty, chest pain, active heavy bleeding, or sudden trauma, please call <strong className="font-extrabold text-amber-950 dark:text-amber-100">108</strong> or visit the nearest emergency hospital immediately.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Active & Upcoming Consultations Section */}
      {activeOrUpcomingAppointments.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5 text-teal-600" />
              <h2 className="font-extrabold text-slate-900 dark:text-white text-base">
                {t("upcomingConsultations")}
              </h2>
            </div>
            <span className="text-xs font-bold bg-teal-50 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 px-3 py-1 rounded-full border border-teal-200 dark:border-teal-700">
              {activeOrUpcomingAppointments.length} Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeOrUpcomingAppointments.map((appt) => (
              <div
                key={appt.id}
                className="p-5 rounded-xl border border-teal-200 dark:border-teal-800/60 bg-gradient-to-br from-teal-50/40 to-sky-50/20 dark:from-slate-800 dark:to-slate-800/80 space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      {appt.doctor_name || "Assigned Medical Officer"}
                    </h3>
                    <p className="text-xs text-teal-700 dark:text-teal-400 font-medium">
                      {appt.doctor_speciality || "General Medicine"}
                    </p>
                  </div>
                  <StatusBadge status={appt.status} />
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{appt.facility_name || "District Hospital"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {new Date(appt.scheduled_at).toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <Clock className="w-3.5 h-3.5 text-slate-400 ml-2" />
                    <span>
                      {new Date(appt.scheduled_at).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {appt.reason && (
                    <div className="pt-1 text-slate-700 dark:text-slate-300">
                      <strong>Reason:</strong> {appt.reason}
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700">
                  <span className="text-[11px] font-mono text-slate-400">ID: {appt.id.slice(0, 8)}</span>
                  <Link
                    href={`/patient/teleconsultation/${appt.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    <Video className="w-3.5 h-3.5" />
                    {t("joinConsultation")}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Book New Consultation Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
        <div>
          <h2 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-600" />
            {t("bookSlot")}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Choose a speciality, describe your health concern, and select a verified doctor for a direct audio/video consultation.
          </p>
        </div>

        {/* Optional Problem Description */}
        <div className="space-y-2 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
            {t("describeYourProblem")}
          </label>
          <input
            type="text"
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            placeholder={t("describeProblemPlaceholder")}
            className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            This information helps the doctor prepare for your consultation beforehand.
          </p>
        </div>

        {/* Speciality Selector */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
            {t("selectSpeciality")}
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSpecialityChange("ALL")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                selectedSpeciality === "ALL"
                  ? "bg-teal-700 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              All Specialities ({doctors.length})
            </button>
            {specialities.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => handleSpecialityChange(s.name)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  selectedSpeciality === s.name
                    ? "bg-teal-700 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                {s.name} ({s.doctor_count})
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search doctors by name, hospital, qualification, or language..."
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Doctors Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t("availableDoctors")} ({filteredDoctors.length})
            </h3>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
              <span>Loading verified doctors and availability...</span>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 text-center space-y-2">
              <UserCheck className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("noDoctorsFound")}
              </p>
              <p className="text-[11px] text-slate-500">
                Try selecting &ldquo;All Specialities&rdquo; or clearing your search keywords.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDoctors.map((doc) => (
                <div
                  key={doc.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-teal-600 to-sky-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                        {doc.full_name
                          .replace("Dr. ", "")
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-sm truncate">
                          {doc.full_name}
                        </h4>
                        <p className="text-xs text-teal-700 dark:text-teal-400 font-semibold truncate">
                          {doc.speciality || "General Medicine"}
                        </p>
                        {doc.qualification && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {doc.qualification}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{doc.facility_name || "Government Health Facility"}</span>
                      </div>
                      {doc.experience_years && (
                        <div className="flex items-center gap-2">
                          <Award className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{doc.experience_years} {t("experienceYears")}</span>
                        </div>
                      )}
                      {doc.languages && (
                        <div className="flex items-center gap-2">
                          <Languages className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{doc.languages}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex flex-wrap gap-1.5 items-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {t("freeConsultation")}
                      </span>
                      {doc.available_slots_count > 0 ? (
                        <span className="text-[11px] font-medium text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 px-2 py-0.5 rounded-md">
                          {doc.available_slots_count} slots open
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                          No open slots
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                    <Link
                      href={`/patient/teleconsultation/doctors/${doc.id}${
                        problemDescription ? `?problem=${encodeURIComponent(problemDescription)}` : ""
                      }`}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shadow-xs"
                    >
                      <span>{t("bookSlot")}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Past Teleconsultations History */}
      {pastAppointments.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
          <h2 className="font-extrabold text-slate-900 dark:text-white text-base">
            Consultation History ({pastAppointments.length})
          </h2>

          <div className="space-y-3">
            {pastAppointments.map((appt) => (
              <div
                key={appt.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {appt.doctor_name || "Doctor Consultation"}
                    </span>
                    <StatusBadge status={appt.status} />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-3">
                    <span>{appt.doctor_speciality || "General"}</span>
                    <span>•</span>
                    <span>{appt.facility_name || "Hospital"}</span>
                    <span>•</span>
                    <span>
                      {new Date(appt.scheduled_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/patient/teleconsultation/${appt.id}`}
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-center shrink-0"
                >
                  View Summary & Records
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
