"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RoleBadge } from "@/components/RoleBadge";
import { DashboardCard } from "@/components/DashboardCard";
import { useLanguage } from "@/lib/i18n/languageContext";
import {
  authApi,
  patientsApi,
  referralsApi,
  inventoryApi,
  facilitiesApi,
  ApiError,
} from "@/lib/api/client";
import type { InventoryItemOut, FacilityOut } from "@/lib/api/types";
import { FacilityQueueSection } from "@/components/care/FacilityQueueSection";
import {
  Inbox,
  CheckCircle2,
  Users,
  PackageCheck,
  Loader2,
  BedDouble,
  Plus,
  Minus,
  X,
  Wind,
  Ambulance,
  Droplet,
  Syringe,
} from "lucide-react";

type FacilityResource = {
  id: string;
  name: string;
  total: number;
  available: number;
  icon: React.ElementType;
};

const DEFAULT_RESOURCES: FacilityResource[] = [
  { id: "general-beds", name: "General Beds", total: 40, available: 12, icon: BedDouble },
  { id: "icu-beds", name: "ICU Beds", total: 8, available: 2, icon: BedDouble },
  { id: "oxygen-beds", name: "Oxygen Beds", total: 15, available: 5, icon: Wind },
  { id: "ambulances", name: "Ambulances", total: 3, available: 1, icon: Ambulance },
  { id: "blood-units", name: "Blood Bank Units", total: 20, available: 9, icon: Droplet },
  { id: "vaccine-stock", name: "Vaccine Stock", total: 100, available: 34, icon: Syringe },
];

function FacilityResourcesSection() {
  const [resources, setResources] = useState<FacilityResource[]>(DEFAULT_RESOURCES);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTotal, setNewTotal] = useState(0);

  const adjustAvailable = (id: string, delta: number) => {
    setResources((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, available: Math.max(0, Math.min(r.total, r.available + delta)) }
          : r
      )
    );
  };

  const removeResource = (id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAddResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newTotal <= 0) return;
    setResources((prev) => [
      ...prev,
      {
        id: `${newName.trim().toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
        name: newName.trim(),
        total: newTotal,
        available: newTotal,
        icon: BedDouble,
      },
    ]);
    setNewName("");
    setNewTotal(0);
    setShowAddForm(false);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
        <div>
          <h2 className="font-extrabold text-slate-900 dark:text-white text-lg">Facility Resources</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Beds and essentials patients can see availability for
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="shrink-0 py-2 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Facility
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddResource}
          className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
        >
          <div className="flex-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Resource name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Pediatric Beds"
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="w-full sm:w-32">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Total count
            </label>
            <input
              type="number"
              min={1}
              value={newTotal || ""}
              onChange={(e) => setNewTotal(Number(e.target.value))}
              placeholder="0"
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            type="submit"
            className="py-2.5 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold cursor-pointer transition-colors"
          >
            Save
          </button>
        </form>
      )}

      {resources.length === 0 ? (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 text-center font-medium">
          No facility resources added yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {resources.map((r) => {
            const Icon = r.icon;
            const low = r.available <= r.total * 0.2;
            return (
              <div
                key={r.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/30 border border-teal-100 flex items-center justify-center text-teal-700 shrink-0">
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                      {r.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeResource(r.id)}
                    className="text-slate-400 hover:text-rose-600 cursor-pointer shrink-0"
                    aria-label={`Remove ${r.name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded ${
                      low
                        ? "bg-rose-100 text-rose-900 border border-rose-200"
                        : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                    }`}
                  >
                    {r.available} / {r.total} available
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => adjustAvailable(r.id, -1)}
                      className="w-6 h-6 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:border-slate-300 cursor-pointer"
                      aria-label={`Decrease available ${r.name}`}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustAvailable(r.id, 1)}
                      className="w-6 h-6 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:border-slate-300 cursor-pointer"
                      aria-label={`Increase available ${r.name}`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FacilityDashboardPage() {
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facilityName, setFacilityName] = useState<string>("All Facilities");
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [patientCount, setPatientCount] = useState(0);
  const [pendingReferrals, setPendingReferrals] = useState(0);
  const [acceptedReferrals, setAcceptedReferrals] = useState(0);
  const [inventory, setInventory] = useState<InventoryItemOut[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const me = await authApi.me();

        const [patients, referrals] = await Promise.all([
          patientsApi.list(me.facility_id ?? undefined),
          referralsApi.list(),
        ]);

        let inv: InventoryItemOut[] = [];
        if (me.facility_id) {
          inv = await inventoryApi.list(me.facility_id);
        } else {
          // ADMIN has no single facility — aggregate inventory across all facilities.
          const facilities: FacilityOut[] = await facilitiesApi.list();
          const lists = await Promise.all(facilities.map((f) => inventoryApi.list(f.id)));
          inv = lists.flat();
        }

        if (me.facility_id) {
          const facility = await facilitiesApi.get(me.facility_id);
          if (!cancelled) {
            setFacilityName(facility.name);
            setFacilityId(me.facility_id);
          }
        }

        if (!cancelled) {
          setPatientCount(patients.length);
          setPendingReferrals(referrals.filter((r) => r.status === "PENDING" || r.status === "CREATED").length);
          setAcceptedReferrals(referrals.filter((r) => r.status === "ACCEPTED" || r.status === "IN_TRANSIT").length);
          setInventory(inv);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Failed to load facility dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={facilityName}
        subtitle={t("healthcareFacility")}
        roleBadge={<RoleBadge role="Healthcare Facility" />}
      />

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm p-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading real facility data…
        </div>
      ) : (
        <>
          {/* Metric Cards Grid — real counts from /patients, /referrals, /inventory */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <DashboardCard
              title={t("newCareRequests")}
              value={pendingReferrals}
              subtitle={t("hwSpaceDesc")}
              icon={Inbox}
              highlight
            />

            <DashboardCard
              title={t("acceptedAndConfirmed")}
              value={acceptedReferrals}
              subtitle={t("waitingPatientVisit")}
              icon={CheckCircle2}
            />

            <DashboardCard
              title="Registered Patients"
              value={patientCount}
              subtitle="Facility-scoped total"
              icon={Users}
            />

            <DashboardCard
              title="Inventory Items"
              value={inventory.length}
              subtitle={`${inventory.filter((i) => i.quantity <= i.reorder_level).length} low stock`}
              icon={PackageCheck}
            />
          </div>

          <div className="grid grid-cols-1 gap-6">
            {facilityId && <FacilityQueueSection facilityId={facilityId} />}

            <FacilityResourcesSection />

            {/* Real inventory */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <h2 className="font-extrabold text-slate-900 dark:text-white text-lg">Inventory Summary</h2>
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
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded ${
                          item.quantity <= item.reorder_level
                            ? "bg-rose-100 text-rose-900 border border-rose-200"
                            : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                        }`}
                      >
                        {item.quantity} in stock (reorder at {item.reorder_level})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
