import React from "react";
import { RoleBadge } from "@/components/RoleBadge";
import { MapPin, Languages, Baby } from "lucide-react";

interface PatientHeaderProps {
  name: string;
  location: string;
  language: string;
  pregnancyWeek: number;
}

export function PatientHeader({
  name,
  location,
  language,
  pregnancyWeek,
}: PatientHeaderProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm mb-6 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {name}
            </h1>
            <RoleBadge role="Patient" />
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Personal Maternal Care Portal
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-900 text-xs font-bold">
          <Baby className="w-4 h-4 text-teal-700" />
          <span>Pregnancy Week {pregnancyWeek} (7th Month)</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0" />
          <span>{location}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Languages className="w-3.5 h-3.5 text-teal-700 shrink-0" />
          <span>Preferred Language: {language}</span>
        </div>
      </div>
    </div>
  );
}
