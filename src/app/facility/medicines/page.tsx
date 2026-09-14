"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { useLanguage } from "@/lib/i18n/languageContext";
import { authApi, inventoryApi, facilitiesApi, ApiError } from "@/lib/api/client";
import type { InventoryItemOut, FacilityOut } from "@/lib/api/types";
import { PackageCheck, Loader2 } from "lucide-react";

export default function FacilityMedicinesPage() {
  const { t } = useLanguage();
  const [inventory, setInventory] = useState<InventoryItemOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const me = await authApi.me();
    let inv: InventoryItemOut[] = [];
    if (me.facility_id) {
      inv = await inventoryApi.list(me.facility_id);
    } else {
      const facilities: FacilityOut[] = await facilitiesApi.list();
      const lists = await Promise.all(facilities.map((f) => inventoryApi.list(f.id)));
      inv = lists.flat();
    }
    setInventory(inv);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load inventory from server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const adjust = async (itemId: string, delta: number) => {
    setActingId(itemId);
    setError(null);
    try {
      await inventoryApi.adjust(itemId, { delta, reason: delta > 0 ? "Stock received" : "Stock issued" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update stock.");
    } finally {
      setActingId(null);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title={t("medicineStock")}
        subtitle="Real-time inventory for this facility"
        roleBadge={<RoleBadge role="Healthcare Facility" />}
      />

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading inventory…</span>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <h2 className="font-extrabold text-slate-900 dark:text-white text-lg flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-teal-700" /> Inventory
            </h2>
            <span className="text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 border border-indigo-200 px-3 py-1 rounded-full w-fit">
              {inventory.length} items
            </span>
          </div>

          {inventory.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 text-center font-medium">
              No inventory items recorded for this facility.
            </div>
          ) : (
            <div className="space-y-2">
              {inventory.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">{item.name}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      SKU: {item.sku ?? "—"} • Unit: {item.unit ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded ${
                          item.quantity <= item.reorder_level
                            ? "bg-rose-100 text-rose-900 border border-rose-200"
                            : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                        }`}
                      >
                        {item.quantity} in stock (reorder at {item.reorder_level})
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={actingId === item.id}
                          onClick={() => adjust(item.id, -1)}
                          className="px-2 py-1 rounded-lg bg-white border text-[11px] font-bold cursor-pointer"
                        >
                          −
                        </button>
                        <button
                          type="button"
                          disabled={actingId === item.id}
                          onClick={() => adjust(item.id, 1)}
                          className="px-2 py-1 rounded-lg bg-white border text-[11px] font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
