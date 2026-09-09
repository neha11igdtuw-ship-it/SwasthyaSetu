import React from "react";
import { Building2, Clock, CheckCircle, Info } from "lucide-react";
import { useLanguage } from "@/lib/i18n/languageContext";

interface NextActionCardProps {
  recommendedAction: string;
  recommendedFacility: string;
  facilityType: string;
  distance: string;
  availableServices: string[];
  doctorAvailability: string;
  lastUpdated: string;
  isLive?: boolean;
}

export function NextActionCard({
  recommendedAction,
  recommendedFacility,
  facilityType,
  distance,
  availableServices,
  doctorAvailability,
  lastUpdated,
}: NextActionCardProps) {
  const { t } = useLanguage();

  const displayAction =
    recommendedAction.includes("District Hospital") || recommendedAction.includes("specialist")
      ? t("visitDistrictHospitalText")
      : t(recommendedAction);

  const displayFacility =
    recommendedFacility.includes("District Civil Hospital")
      ? t("districtHospitalName")
      : t(recommendedFacility);

  const displayFacilityType =
    facilityType.includes("Hospital") || facilityType.includes("Facility")
      ? t("healthcareFacility")
      : t(facilityType);

  const mapService = (srv: string) => {
    if (srv.includes("OB-GYN")) return "OB-GYN (स्त्री रोग विशेषज्ञ)";
    if (srv.includes("BP")) return `${t("bpMonitoring")}`;
    if (srv.includes("Emergency")) return t("emergencyHelp");
    if (srv.includes("Blood")) return "Blood Bank (रक्त बैंक)";
    return t(srv);
  };

  const displayDoctor = doctorAvailability.includes("Ananya Rao")
    ? `${t("drAnanyaRao")} — On Duty Today`
    : t(doctorAvailability);

  return (
    <div className="bg-white rounded-2xl p-6 border border-teal-500/60 shadow-sm space-y-4 ring-1 ring-teal-500/20">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
            1
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-teal-800 uppercase tracking-wide block">
              {t("whatYouShouldDoNext")}
            </span>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              {displayAction}
            </h3>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">
                {t("recommendedHospital")}
              </span>
              <p className="text-sm font-bold text-slate-900">
                {displayFacility}
              </p>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-900 shrink-0">
              {distance} {t("distanceAway")}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 font-medium">
              <Building2 className="w-3.5 h-3.5 text-teal-700" />
              {displayFacilityType}
            </span>
          </div>
        </div>

        <div>
          <span className="text-xs font-bold text-slate-700 block mb-1">
            {t("doctorAvailability")}
          </span>
          <p className="text-xs text-slate-600 font-medium">
            {displayDoctor}
          </p>
        </div>

        <div>
          <span className="text-xs font-bold text-slate-700 block mb-1">
            {t("servicesAvailable")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {availableServices.map((srv, idx) => (
              <span
                key={idx}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-100 flex items-center gap-1"
              >
                <CheckCircle className="w-3 h-3 text-teal-600" />
                {mapService(srv)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{t("lastUpdated")}: {lastUpdated}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-400 font-medium italic">
          <Info className="w-3 h-3" />
          <span>{t("savedInformation")}</span>
        </div>
      </div>
    </div>
  );
}
