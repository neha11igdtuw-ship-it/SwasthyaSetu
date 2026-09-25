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
  facilityResourcesApi,
  ApiError,
} from "@/lib/api/client";
import type {
  InventoryItemOut,
  FacilityOut,
  FacilityResourceOut,
  FacilityResourceUpdate,
} from "@/lib/api/types";
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
  // Backend field names this UI row reads/writes on FacilityResourceOut/Update.
  totalField: keyof FacilityResourceUpdate;
  availableField: keyof FacilityResourceUpdate;
};

const RESOURCE_DEFS: Omit<FacilityResource, "total" | "available">[] = [
  { id: "general-beds", name: "General Beds", icon: BedDouble, totalField: "beds_total", availableField: "beds_available" },
  { id: "icu-beds", name: "ICU Beds", icon: BedDouble, totalField: "icu_total", availableField: "icu_available" },
  { id: "oxygen-units", name: "Oxygen Units", icon: Wind, totalField: "oxygen_units", availableField: "oxygen_units" },
  { id: "ambulances", name: "Ambulances", icon: Ambulance, totalField: "ambulances_available", availableField: "ambulances_available" },
  { id: "blood-units", name: "Blood Bank Units", icon: Droplet, totalField: "blood_units", availableField: "blood_units" },
  { id: "vaccine-stock", name: "Vaccine Stock", icon: Syringe, totalField: "vaccine_doses", availableField: "vaccine_doses" },
];

function toResources(data: FacilityResourceOut): FacilityResource[] {
  return RESOURCE_DEFS.map((def) => ({
    ...def,
    total: Number(data[def.totalField as keyof FacilityResourceOut] ?? 0),
    available: Number(data[def.availableField as keyof FacilityResourceOut] ?? 0),
  }));
}

function FacilityResourcesSection({ facilityId }: { facilityId: string }) {
  const [resources, setResources] = useState<FacilityResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await facilityResourcesApi.get(facilityId);
        if (!cancelled) setResources(toResources(data));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : "Failed to load facility resources.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [facilityId]);

  const adjustAvailable = async (id: string, delta: number) => {
    const target = resources.find((r) => r.id === id);
    if (!target) return;
    const nextAvailable = Math.max(0, Math.min(target.total, target.available + delta));
    if (nextAvailable === target.available) return;

    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, available: nextAvailable } : r)));
    setSavingId(id);
    setError(null);
    try {
      const updated = await facilityResourcesApi.update(facilityId, {
        [target.availableField]: nextAvailable,
      });
      setResources(toResources(updated));
    } catch (e) {
      // Roll back on failure.
      setResources((prev) => prev.map((r) => (r.id === id ? { ...r, available: target.available } : r)));
      setError(e instanceof ApiError ? e.message : "Failed to save facility resource update.");
    } finally {
      setSavingId(null);
    }
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
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm p-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading facility resources…
        </div>
      ) : resources.length === 0 ? (
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
                      disabled={savingId === r.id}
                      className="w-6 h-6 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:border-slate-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Decrease available ${r.name}`}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustAvailable(r.id, 1)}
                      disabled={savingId === r.id}
                      className="w-6 h-6 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:border-slate-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

            {facilityId && <FacilityResourcesSection facilityId={facilityId} />}

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
