import React from "react";
import { NearbyFacility } from "@/lib/mockData";
import { Building2, MapPin, CheckCircle, Clock, Phone } from "lucide-react";
import { useLanguage } from "@/lib/i18n/languageContext";

interface FacilityCardProps {
  facility: NearbyFacility;
  distanceOverride?: string;
  locationSource?: string;
}

export function FacilityCard({ facility, distanceOverride, locationSource }: FacilityCardProps) {
  const { t } = useLanguage();
  const isAvailable = facility.status === "Available";

  const displayName = facility.name.includes("District Civil")
    ? t("districtHospitalName")
    : facility.name.includes("Kalyanpur")
    ? t("chcKalyanpur")
    : facility.name.includes("Sub-Centre")
    ? t("subCentreRampur")
    : t(facility.name);

  const displayDoctor = facility.doctorAvailability.includes("Ananya Rao") ||
    facility.doctorAvailability.includes("Meera Singh")
    ? `${t("drMeeraSingh")} — On Duty Today`
    : facility.doctorAvailability.includes("Sunita Devi")
    ? `${t("sunitaDeviWorker")} — Available Daily`
    : t(facility.doctorAvailability);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-teal-500/50 transition-all space-y-3">
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-teal-700 font-bold mb-0.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>{t("healthcareFacility")}</span>
          </div>
          <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
            {displayName}
          </h4>
        </div>
        <span
          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${
            isAvailable
              ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 border-emerald-200"
              : "bg-rose-50 dark:bg-rose-900/30 text-rose-800 border-rose-200"
          }`}
        >
          {isAvailable ? t("available") : t("unavailable")}
        </span>
      </div>

      <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span>{t("distance")}: <strong>{distanceOverride || facility.distance}</strong></span>
          </div>
          {locationSource && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800">
              {locationSource}
            </span>
          )}
        </div>

        {facility.address && (
          <div className="flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="text-slate-500 dark:text-slate-400">{facility.address}</span>
          </div>
        )}

        {facility.contactPhone && (
          <a
            href={`tel:${facility.contactPhone.replace(/\s+/g, "")}`}
            className="flex items-center gap-1.5 font-bold text-teal-700 hover:text-teal-800 w-fit"
          >
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span>{facility.contactPhone}</span>
          </a>
        )}

        <div>
          <span className="font-bold text-slate-800 dark:text-slate-100 block mb-1">
            {t("doctorAvailability")}
          </span>
          <p className="text-slate-600 dark:text-slate-300">{displayDoctor}</p>
        </div>

        <div>
          <span className="font-bold text-slate-800 dark:text-slate-100 block mb-1">
            {t("servicesAvailable")}
          </span>
          <div className="flex flex-wrap gap-1">
            {facility.availableServices.map((srv, idx) => (
              <span
                key={idx}
                className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1"
              >
                <CheckCircle className="w-3 h-3 text-teal-600" />
                {srv}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> {t("updated")}: {t("todayAt")} 8:00 AM
        </span>
      </div>
    </div>
  );
}
