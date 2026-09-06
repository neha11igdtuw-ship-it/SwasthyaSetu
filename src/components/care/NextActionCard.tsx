import React from "react";
import { Building2, Clock, CheckCircle, Info } from "lucide-react";

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
  return (
    <div className="bg-white rounded-2xl p-6 border border-teal-500/60 shadow-sm space-y-4 ring-1 ring-teal-500/20">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
            1
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-teal-800 uppercase tracking-wide block">
              What You Should Do Next
            </span>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              {recommendedAction}
            </h3>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">
                Recommended Hospital / Health Center
              </span>
              <p className="text-sm font-bold text-slate-900">
                {recommendedFacility}
              </p>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-900 shrink-0">
              {distance} away
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 font-medium">
              <Building2 className="w-3.5 h-3.5 text-teal-700" />
              {facilityType}
            </span>
          </div>
        </div>

        <div>
          <span className="text-xs font-bold text-slate-700 block mb-1">
            Doctor Availability:
          </span>
          <p className="text-xs text-slate-600 font-medium">
            {doctorAvailability}
          </p>
        </div>

        <div>
          <span className="text-xs font-bold text-slate-700 block mb-1">
            Services Available:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {availableServices.map((srv, idx) => (
              <span
                key={idx}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-100 flex items-center gap-1"
              >
                <CheckCircle className="w-3 h-3 text-teal-600" />
                {srv}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Updated: {lastUpdated}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-400 font-medium italic">
          <Info className="w-3 h-3" />
          <span>Saved information</span>
        </div>
      </div>
    </div>
  );
}
