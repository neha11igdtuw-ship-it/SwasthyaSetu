import React from "react";
import { Mic, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

export function VoiceAssistantCard() {
  return (
    <div className="bg-gradient-to-br from-teal-900 to-teal-950 text-white rounded-2xl p-6 shadow-md space-y-4 border border-teal-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-teal-700/80 border border-teal-600 flex items-center justify-center text-teal-200">
            <Mic className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-300 block">
              Speak In Your Language
            </span>
            <h3 className="font-extrabold text-base text-white">
              Voice Assistance
            </h3>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-400 text-slate-950">
          Hindi / Local Language
        </span>
      </div>

      <p className="text-xs text-teal-100 leading-relaxed">
        Speak your symptoms naturally in your local language (e.g. “मुझे सिरदर्द और चक्कर आ रहे हैं”).
      </p>

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[11px] text-teal-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Voice guidance requires doctor review</span>
        </div>

        <Link
          href="/patient/voice-assistant"
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold transition-colors inline-flex items-center justify-center gap-2 shadow-sm"
        >
          <span>Ask Voice Assistant</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
