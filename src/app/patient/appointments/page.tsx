"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { priyaPatientMock } from "@/lib/mockData";
import { useLanguage } from "@/lib/i18n/languageContext";
import { Calendar, Clock, Building2, Stethoscope, CheckCircle2 } from "lucide-react";

export default function PatientAppointmentsPage() {
  const { t } = useLanguage();
  const [booked, setBooked] = useState(false);
  const appointments = priyaPatientMock.appointments;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="bookManageAppointmentsTitle"
        subtitle="bookManageAppointmentsSubtitle"
        roleBadge={<RoleBadge role="Patient" />}
      />

      {booked && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{t("appointmentRequestRecorded")}</span>
        </div>
      )}

      {/* Active Appointments List */}
      <div className="space-y-4">
        <h3 className="font-extrabold text-slate-900 text-lg">
          {t("upcomingScheduledVisits")}
        </h3>

        {appointments.map((app) => (
          <div
            key={app.id}
            className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-100 text-teal-700">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {t("appointmentId")}: {app.id}
                  </span>
                  <h4 className="font-extrabold text-slate-900 text-base">
                    {app.doctorName === "Dr. Ananya Rao" ? t("drAnanyaRao") : app.doctorName}
                  </h4>
                </div>
              </div>
              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {t(app.status)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-700 shrink-0" />
                <span>{t("department")}: <strong>{app.specialty.includes("High-Risk") ? t("maternalCare") : app.specialty}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-700 shrink-0" />
                <span>{t("hospital")}: <strong>{app.facilityName.includes("District") ? t("districtHospitalName") : app.facilityName}</strong></span>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2 text-teal-900 font-bold bg-teal-50 p-2.5 rounded-xl border border-teal-100">
                <Clock className="w-4 h-4 text-teal-700 shrink-0" />
                <span>{t("dateTime")}: {app.dateTime}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setBooked(true)}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {t("confirmAttendance")}
              </button>
              <button
                type="button"
                onClick={() => alert("Reschedule request recorded.")}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                {t("reschedule")}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Book New Appointment Form */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3">
          {t("bookNewDoctorVisit")}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">{t("selectHospitalOrCenter")}</label>
            <select className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none font-medium">
              <option>{t("districtHospitalName")}</option>
              <option>{t("chcKalyanpur")}</option>
              <option>{t("subCentreRampur")}</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">{t("preferredDate")}</label>
            <input
              type="date"
              defaultValue="2026-09-08"
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none font-medium"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setBooked(true)}
          className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold transition-colors shadow-xs cursor-pointer"
        >
          {t("bookAppointment")}
        </button>
      </div>
    </div>
  );
}
