"use client";

import React from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { FacilityCard } from "@/components/patient/FacilityCard";
import { priyaPatientMock } from "@/lib/mockData";
import { useLanguage } from "@/lib/i18n/languageContext";
import { Building2, Info } from "lucide-react";

export default function PatientFacilitiesPage() {
  const facilities = priyaPatientMock.nearbyFacilities;
  const { t } = useLanguage();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="nearbyHospitalsTitle"
        subtitle="facilitiesSubtitle"
        roleBadge={<RoleBadge role="Patient" />}
      />

      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs font-semibold flex items-center gap-2">
        <Info className="w-4 h-4 text-amber-700 shrink-0" />
        <span>{t("doctorAvailabilitySavedInfo")}</span>
      </div>

      {/* Facilities Cards List */}
      <div className="space-y-4">
        <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
          <Building2 className="w-5 h-5 text-teal-700" />
          <span>{t("recommendedHospitalsCenters")} ({facilities.length})</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {facilities.map((fac) => (
            <FacilityCard key={fac.id} facility={fac} />
          ))}
        </div>
      </div>
    </div>
  );
}
