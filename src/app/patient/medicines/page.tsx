"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { priyaPatientMock, MedicineItem } from "@/lib/mockData";
import { useLanguage } from "@/lib/i18n/languageContext";
import { Pill, Clock, Building2, CheckCircle2 } from "lucide-react";

export default function PatientMedicinesPage() {
  const { t } = useLanguage();
  const [medicines, setMedicines] = useState<MedicineItem[]>(
    priyaPatientMock.medicines
  );

  const toggleReceived = (id: string) => {
    setMedicines((prev) =>
      prev.map((med) => (med.id === id ? { ...med, received: !med.received } : med))
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="prescribedMedicinesTitle"
        subtitle="medicinesSubtitle"
        roleBadge={<RoleBadge role="Patient" />}
      />

      <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span>{t("medicineUpdated")} <strong>{t("todayAt")} 8:00 AM</strong></span>
        </div>
      </div>

      {/* Medicines List */}
      <div className="space-y-4">
        {medicines.map((med) => (
          <div
            key={med.id}
            className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-100 text-teal-700">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {med.id}
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {med.name}
                  </h3>
                </div>
              </div>
              <StatusBadge status={med.availability} />
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div>
                <span className="font-bold text-slate-800 block">{t("howToTake")}</span>
                <p className="text-slate-700 font-medium">{med.dosage}</p>
              </div>

              <div>
                <span className="font-bold text-slate-800 block">{t("whenToTake")}</span>
                <p className="text-teal-900 font-bold bg-teal-50 p-2 rounded-lg border border-teal-100 w-fit">
                  {med.timing}
                </p>
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                <Building2 className="w-3.5 h-3.5 text-teal-700" />
                <span>{t("availableAt")} <strong>{med.nearbyFacility.includes("Sub-Centre") ? t("subCentreRampur") : med.nearbyFacility.includes("District") ? t("districtHospitalName") : med.nearbyFacility}</strong></span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Status:{" "}
                <strong className={med.received ? "text-emerald-700" : "text-amber-700"}>
                  {med.received ? t("accepted") : t("waitingForCollection")}
                </strong>
              </span>

              <button
                type="button"
                onClick={() => toggleReceived(med.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                  med.received
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "bg-teal-700 hover:bg-teal-800 text-white"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{med.received ? t("markAsWaiting") : t("markMedicineReceived")}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
