"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import { useAppState } from "@/lib/store/AppStateProvider";
import { WifiOff, RefreshCw, HardDrive, CheckCircle2, Info, Clock } from "lucide-react";

export default function HWSyncPage() {
  const { t } = useLanguage();
  const { outboxItems, lastSyncedTime, triggerSyncNow, outboxCount } = useAppState();
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    const res = await triggerSyncNow();
    setIsSyncing(false);
    setSyncStatusMsg(res.message);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={t("updateInfoPageTitle")}
        subtitle={t("updateInfoPageSubtitle")}
        roleBadge={<RoleBadge role="Health Worker" />}
      />

      <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-900/30 border border-teal-200 text-teal-950 text-xs font-semibold flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-teal-700 shrink-0" />
        <span>{t("updateInfoNotice")}</span>
      </div>

      {syncStatusMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
          <span>{syncStatusMsg}</span>
          <button
            type="button"
            onClick={() => setSyncStatusMsg(null)}
            className="text-[10px] underline font-bold cursor-pointer"
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-teal-700" />
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
              {t("syncQueueTitle")}
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {t("lastUpdated")}: {lastSyncedTime || "Not sent yet"}
          </span>
        </div>

        {/* Sync Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-900/30 border border-teal-100">
            <span className="text-xs font-bold text-teal-800 uppercase block">{t("infoWaitingToSend")}</span>
            <span className="text-2xl font-extrabold text-teal-950 mt-1 block">{outboxCount}</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200">
            <span className="text-xs font-bold text-emerald-800 uppercase block">{t("sentToday")}</span>
            <span className="text-2xl font-extrabold text-emerald-950 mt-1 block">
              {outboxItems.filter((i) => i.status === "sent").length}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 col-span-2 sm:col-span-1">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase block">{t("savedOnThisDevice")}</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">{outboxItems.length}</span>
          </div>
        </div>

        {/* Dexie Outbox List */}
        <div className="space-y-3 pt-2">
          <h4 className="font-bold text-slate-900 dark:text-white text-sm">{t("savedItemsWaitingHeader")} ({outboxItems.length})</h4>

          {outboxItems.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 text-center font-medium">
              No offline records queued. Register a patient or save screening to enqueue items.
            </div>
          ) : (
            outboxItems.map((item) => (
              <div key={item.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.status === "queued" ? (
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  ) : item.status === "sent" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Info className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <div className="truncate">
                    <span className="font-bold text-slate-900 dark:text-white block truncate">{item.title}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Type: {item.type} • Created: {new Date(item.createdAt).toLocaleTimeString()}</span>
                    {item.resultMessage && (
                      <span className="text-[10px] text-rose-600 font-semibold block">{item.resultMessage}</span>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded shrink-0 ${
                  item.status === "queued"
                    ? "bg-amber-100 text-amber-900 border border-amber-200"
                    : item.status === "sent"
                    ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                    : "bg-rose-100 text-rose-900 border border-rose-200"
                }`}>
                  {item.status === "queued"
                    ? t("queuedLabel")
                    : item.status === "sent"
                    ? t("sentLabel")
                    : item.status === "conflict"
                    ? "Conflict"
                    : "Error"}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Sync Trigger Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs transition-colors inline-flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Sending..." : t("sendInfoNow")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
