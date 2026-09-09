"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import { WifiOff, RefreshCw, HardDrive, CheckCircle2, Info } from "lucide-react";

export default function HWSyncPage() {
  const { t } = useLanguage();
  const [synced, setSynced] = useState(false);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={t("updateInfoPageTitle")}
        subtitle={t("updateInfoPageSubtitle")}
        roleBadge={<RoleBadge role="Health Worker" />}
      />

      <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-950 text-xs font-semibold flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-teal-700 shrink-0" />
        <span>{t("updateInfoNotice")}</span>
      </div>

      {synced && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
          <span>Checking for connection... All saved information is up to date and safe on this device.</span>
          <button
            type="button"
            onClick={() => setSynced(false)}
            className="text-[10px] underline font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Clear Placeholder Section required by specifications */}
      <div className="p-6 rounded-2xl bg-teal-900 text-white shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-teal-300 font-extrabold text-base">
          <Info className="w-5 h-5 text-teal-300" />
          <h3>{t("updateInfoPlaceholderBoxTitle")}</h3>
        </div>
        <p className="text-xs text-teal-100 leading-relaxed">
          {t("updateInfoPlaceholderMsg")}
        </p>
      </div>

      {/* Visual Sync Dashboard Status Box */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-teal-700" />
            <h3 className="font-extrabold text-slate-900 text-base">
              {t("savedInfoStatusTitle")}
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {t("lastUpdated")}: {t("todayAt")} 9:00 AM
          </span>
        </div>

        {/* Sync Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-2xl bg-teal-50 border border-teal-100">
            <span className="text-xs font-bold text-teal-800 uppercase block">{t("infoWaitingToSend")}</span>
            <span className="text-2xl font-extrabold text-teal-950 mt-1 block">2</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <span className="text-xs font-bold text-emerald-800 uppercase block">{t("sentToday")}</span>
            <span className="text-2xl font-extrabold text-emerald-950 mt-1 block">14</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 col-span-2 sm:col-span-1">
            <span className="text-xs font-bold text-slate-600 uppercase block">{t("savedOnThisDevice")}</span>
            <span className="text-2xl font-extrabold text-slate-900 mt-1 block">16</span>
          </div>
        </div>

        {/* Queue Items List */}
        <div className="space-y-3 pt-2">
          <h4 className="font-bold text-slate-900 text-sm">{t("savedItemsWaitingHeader")}</h4>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-teal-700" />
              <span><strong>New Patient Registration:</strong> Anita Devi (P-2026-NEW)</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
              Saved on phone
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span><strong>Health Vitals Check:</strong> Priya Sharma (P-7821)</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
              Sent
            </span>
          </div>
        </div>

        {/* Sync Trigger Button */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={() => setSynced(true)}
            className="px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs transition-colors inline-flex items-center gap-2 shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t("sendInformationNowBtn")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
