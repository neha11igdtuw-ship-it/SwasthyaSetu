import React from "react";
import { NearbyFacility } from "@/lib/mockData";
import { Building2, MapPin, CheckCircle, Clock } from "lucide-react";
import { useLanguage } from "@/lib/i18n/languageContext";

interface FacilityCardProps {
  facility: NearbyFacility;
}

export function FacilityCard({ facility }: FacilityCardProps) {
  const { t } = useLanguage();
  const isAvailable = facility.status === "Available";

  const displayName = facility.name.includes("District Civil")
    ? t("districtHospitalName")
    : facility.name.includes("Kalyanpur")
    ? t("chcKalyanpur")
    : facility.name.includes("Sub-Centre")
    ? t("subCentreRampur")
    : t(facility.name);

  const displayDoctor = facility.doctorAvailability.includes("Ananya Rao")
    ? `${t("drAnanyaRao")} — On Duty Today`
    : facility.doctorAvailability.includes("Sunita Devi")
    ? `${t("sunitaDeviWorker")} — Available Daily`
    : t(facility.doctorAvailability);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-teal-500/50 transition-all space-y-3">
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-teal-700 font-bold mb-0.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>{t("healthcareFacility")}</span>
          </div>
          <h4 className="font-extrabold text-slate-900 text-base">
            {displayName}
          </h4>
        </div>
        <span
          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${
            isAvailable
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {isAvailable ? t("available") : t("unavailable")}
        </span>
      </div>

      <div className="space-y-2 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0" />
          <span>{t("distance")}: <strong>{facility.distance}</strong></span>
        </div>

        <div>
          <span className="font-bold text-slate-800 block mb-1">
            {t("doctorAvailability")}
          </span>
          <p className="text-slate-600">{displayDoctor}</p>
        </div>

        <div>
          <span className="font-bold text-slate-800 block mb-1">
            {t("servicesAvailable")}
          </span>
          <div className="flex flex-wrap gap-1">
            {facility.availableServices.map((srv, idx) => (
              <span
                key={idx}
                className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 flex items-center gap-1"
              >
                <CheckCircle className="w-3 h-3 text-teal-600" />
                {srv}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> {t("updated")}: {t("todayAt")} 8:00 AM
        </span>
      </div>
    </div>
  );
}
