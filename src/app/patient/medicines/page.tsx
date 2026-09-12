"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { useLanguage } from "@/lib/i18n/languageContext";
import { inventoryApi, prescriptionsApi } from "@/lib/api/client";
import type { NearbyInventoryOut, PrescriptionOut } from "@/lib/api/types";
import { Pill, Clock, Loader2, Search, MapPin } from "lucide-react";

type Chip = "All" | "Prescribed" | "Available Nearby" | "Low Stock" | "Out of Stock";

function stockLabel(quantity: number | null | undefined, reorder = 10): string {
  if (typeof quantity !== "number") return "Unknown";
  if (quantity <= 0) return "Out of Stock";
  if (quantity <= reorder) return "Low Stock";
  return "Available";
}

export default function PatientMedicinesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<PrescriptionOut[]>([]);
  const [nearby, setNearby] = useState<NearbyInventoryOut[]>([]);
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<Chip>("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async (search = "") => {
    const [rx, stock] = await Promise.all([
      prescriptionsApi.me(),
      search.trim() ? inventoryApi.search(search.trim()) : inventoryApi.nearby(),
    ]);
    setPrescriptions(rx);
    setNearby(stock);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load medicines right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setError(null);
    try {
      await load(query);
      setChip(query.trim() ? "Available Nearby" : "All");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  };

  const nearbyFiltered = useMemo(() => {
    if (chip === "Low Stock") return nearby.filter((i) => i.status === "LOW_STOCK");
    if (chip === "Out of Stock") return nearby.filter((i) => i.status === "OUT_OF_STOCK");
    if (chip === "Available Nearby") return nearby.filter((i) => i.status !== "OUT_OF_STOCK");
    return nearby;
  }, [nearby, chip]);

  const showPrescribed = chip === "All" || chip === "Prescribed";
  const showNearby = chip !== "Prescribed";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="prescribedMedicinesTitle"
        subtitle="medicinesSubtitle"
        roleBadge={<RoleBadge role="Patient" />}
      />

      <form onSubmit={runSearch} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search medicine"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="px-4 py-2.5 rounded-xl bg-teal-700 text-white text-xs font-bold disabled:opacity-60 cursor-pointer"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {(["All", "Prescribed", "Available Nearby", "Low Stock", "Out of Stock"] as Chip[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setChip(c)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border cursor-pointer ${
              chip === c
                ? "bg-teal-700 text-white border-teal-700"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs flex items-center gap-2">
        <Clock className="w-4 h-4 text-slate-500" />
        <span>
          {t("medicineUpdated")} <strong>{t("todayAt")} 8:00 AM</strong>. Refresh after a facility updates stock.
        </span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10 text-slate-400 gap-2 text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading medicines…</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {showPrescribed && (
        <section className="space-y-3">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Prescribed Medicines</h2>
          {!loading && prescriptions.length === 0 && (
            <EmptyState
              icon={Pill}
              title="No prescriptions yet"
              description="Ask your health worker or doctor to add a prescription. You can still search medicines available nearby."
              actionLabel="Ask health worker / doctor for prescription"
              onAction={() => router.push("/patient/referrals")}
              secondaryLabel="Search nearby medicines"
              onSecondary={() => {
                setChip("Available Nearby");
                document.querySelector<HTMLInputElement>("input[placeholder='Search medicine']")?.focus();
              }}
            />
          )}
          {prescriptions.map((rx) => (
            <div
              key={rx.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-900/30 border border-teal-100 text-teal-700">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                      {rx.item_name || `Qty ${rx.quantity}`}
                    </h3>
                    <span className="text-[10px] text-slate-500">Qty {rx.quantity}</span>
                  </div>
                </div>
                <StatusBadge status={stockLabel(rx.stock_quantity)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100 block">Dosage / frequency / duration</span>
                  <p>{rx.dosage_instructions || "See health worker for dosage"}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100 block">Prescribed by</span>
                  <p>{rx.prescribed_by_name || "Doctor / health worker"}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100 block">Facility</span>
                  <p>{rx.facility_name || "Assigned facility"}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100 block">Stock status</span>
                  <p>
                    {stockLabel(rx.stock_quantity)}
                    {typeof rx.stock_quantity === "number" ? ` (${rx.stock_quantity})` : ""}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">Next: collect from the facility if stock is available, or ask your health worker.</p>
            </div>
          ))}
        </section>
      )}

      {showNearby && (
        <section className="space-y-3">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Nearby Medicine Availability</h2>
          {!loading && nearbyFiltered.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              No nearby stock matched this filter. Try another medicine name.
            </p>
          )}
          {nearbyFiltered.map((item) => (
            <div
              key={`${item.item_id}-${item.facility_id}`}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div>
                <p className="font-extrabold text-slate-900 dark:text-white text-sm">{item.name}</p>
                <p className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {item.facility_name}
                  {item.distance_km != null ? ` • ${item.distance_km} km` : ""}
                </p>
              </div>
              <div className="text-right">
                <StatusBadge status={stockLabel(item.quantity, item.reorder_level)} />
                <p className="text-[11px] text-slate-500 mt-1">
                  Qty {item.quantity} {item.unit}
                </p>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-slate-500">
            Need a prescription? <Link href="/patient/referrals" className="text-teal-700 font-bold hover:underline">Start a care request</Link>.
          </p>
        </section>
      )}
    </div>
  );
}
