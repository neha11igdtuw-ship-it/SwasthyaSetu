"use client";

import React from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { WifiOff, RefreshCw, Database, CheckCircle2 } from "lucide-react";

export default function HWSyncPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Device Saved Records"
        subtitle="Manage information saved on this device while working offline"
        roleBadge={<RoleBadge role="Health Worker" />}
      />

      <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-950 text-xs font-semibold flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-teal-700 shrink-0" />
        <span>Information is saved on this device and will be sent automatically when internet connectivity returns.</span>
      </div>

      {/* Visual Sync Dashboard Status Box */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-teal-700" />
            <h3 className="font-extrabold text-slate-900 text-base">
              Saved Information Status
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500">
            Last Updated: Today at 9:00 AM
          </span>
        </div>

        {/* Sync Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-2xl bg-teal-50 border border-teal-100">
            <span className="text-xs font-bold text-teal-800 uppercase block">Information Waiting to Send</span>
            <span className="text-2xl font-extrabold text-teal-950 mt-1 block">2</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase block">Failed Records</span>
            <span className="text-2xl font-extrabold text-slate-900 mt-1 block">0</span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <span className="text-xs font-bold text-amber-800 uppercase block">Conflicts</span>
            <span className="text-2xl font-extrabold text-amber-950 mt-1 block">0</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <span className="text-xs font-bold text-emerald-800 uppercase block">Sent Today</span>
            <span className="text-2xl font-extrabold text-emerald-950 mt-1 block">14</span>
          </div>
        </div>

        {/* Queue Items List */}
        <div className="space-y-3 pt-2">
          <h4 className="font-bold text-slate-900 text-sm">Saved Items Waiting to be Sent:</h4>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-teal-700" />
              <span><strong>New Person Registration:</strong> Anita Devi (P-2026-NEW)</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
              Waiting for internet
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span><strong>Health Vitals Record:</strong> Priya Sharma (P-7821)</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
              Sent
            </span>
          </div>
        </div>

        {/* Sync Now Trigger Button */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={() => alert("Checking for internet connection to send saved records...")}
            className="px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs transition-colors inline-flex items-center gap-2 shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Send Saved Information Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}
