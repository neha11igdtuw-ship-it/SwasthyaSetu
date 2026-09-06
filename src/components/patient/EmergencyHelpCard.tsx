import React from "react";
import { AlertOctagon, PhoneCall, ShieldAlert, MapPin } from "lucide-react";

interface EmergencyHelpCardProps {
  ashaPhone: string;
}

export function EmergencyHelpCard({ ashaPhone }: EmergencyHelpCardProps) {
  return (
    <div className="bg-rose-950 text-white rounded-2xl p-6 shadow-md space-y-4 border border-rose-800">
      <div className="flex items-center gap-3 border-b border-rose-800 pb-3">
        <div className="w-10 h-10 rounded-xl bg-rose-800 text-rose-100 flex items-center justify-center font-bold">
          <AlertOctagon className="w-6 h-6 animate-bounce text-rose-300" />
        </div>
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-300 block">
            Emergency Warning Protocol
          </span>
          <h3 className="font-extrabold text-lg text-white">
            High-Risk Maternal Emergency Assistance
          </h3>
        </div>
      </div>

      <p className="text-xs text-rose-100 leading-relaxed">
        If you experience severe vaginal bleeding, sudden severe headache, blurred vision, or severe abdominal pain, seek immediate emergency help.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <a
          href={`tel:${ashaPhone}`}
          className="p-3 rounded-xl bg-rose-800 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 border border-rose-600 transition-colors"
        >
          <PhoneCall className="w-4 h-4" />
          <span>Call ASHA ({ashaPhone})</span>
        </a>

        <a
          href="tel:108"
          className="p-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 border border-rose-400 transition-colors"
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Call Ambulance (108)</span>
        </a>

        <a
          href="/patient/facilities"
          className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
        >
          <MapPin className="w-4 h-4 text-rose-400" />
          <span>Find Hospital</span>
        </a>
      </div>

      <p className="text-[10px] text-rose-300 italic text-center">
        Prototype emergency interface — simulate calls only; does not dial real emergency response.
      </p>
    </div>
  );
}
